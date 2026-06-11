"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Alumno = {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
};

type RegistroEntrenamiento = {
  id: string;
  alumno_id: string;
  rutina_id?: string | null;
  rutina_ejercicio_id?: string | null;
  ejercicio_id?: string | null;
  nombre_ejercicio?: string | null;
  peso_kg?: number | null;
  repeticiones?: number | null;
  rpe?: number | null;
  rir?: number | null;
  rm_calculado?: number | null;
  completado?: boolean | null;
  created_at?: string | null;
};

type RMActual = {
  id: string;
  ejercicio_id: string;
  rm_calculado?: number | null;
  peso_kg?: number | null;
  repeticiones?: number | null;
  actualizado_en?: string | null;
};

type Ejercicio = {
  id: string;
  nombre: string;
};

function formatearFecha(fechaTexto?: string | null) {
  if (!fechaTexto) return "Sin registros";

  return new Date(fechaTexto).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function MisProgresosPage() {
  const [loading, setLoading] = useState(true);

  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [registros, setRegistros] = useState<RegistroEntrenamiento[]>([]);
  const [rmsActuales, setRmsActuales] = useState<RMActual[]>([]);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);

  const [verTodosRM, setVerTodosRM] = useState(false);
  const [verTodosEntrenamientos, setVerTodosEntrenamientos] = useState(false);

  async function cargarDatos() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const user = sessionData.session.user;

    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (!profile || profile.rol !== "alumno") {
      window.location.href = "/";
      return;
    }

    const { data: alumnoData, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id,nombre,apellido")
      .eq("user_id", user.id)
      .single();

    if (alumnoError || !alumnoData) {
      alert(alumnoError?.message || "No se pudo cargar el alumno.");
      setLoading(false);
      return;
    }

    setAlumno(alumnoData);

    const { data: registrosData } = await supabase
      .from("registros_entrenamiento")
      .select("*")
      .eq("alumno_id", alumnoData.id)
      .eq("completado", true)
      .order("created_at", { ascending: false });

    const registrosCompletados = registrosData || [];

    setRegistros(registrosCompletados);

    const { data: rmsData } = await supabase
      .from("rms_actuales")
      .select("*")
      .eq("alumno_id", alumnoData.id);

    setRmsActuales(rmsData || []);

    const idsEjercicios = Array.from(
      new Set(
        [
          ...(rmsData?.map((rm) => rm.ejercicio_id) || []),
          ...registrosCompletados
            .filter(
              (registro) =>
                registro.ejercicio_id &&
                registro.rm_calculado !== null &&
                registro.rm_calculado !== undefined
            )
            .map((registro) => registro.ejercicio_id as string),
        ].filter(Boolean)
      )
    );

    if (idsEjercicios.length > 0) {
      const { data: ejerciciosData } = await supabase
        .from("ejercicios")
        .select("id,nombre")
        .in("id", idsEjercicios);

      setEjercicios(ejerciciosData || []);
    } else {
      setEjercicios([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      cargarDatos();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const rutinasCompletadas = useMemo(() => {
  const rutinaIds = [...new Set(registros.map((item) => item.rutina_id))];

  return rutinaIds.filter((rutinaId) => {
    if (!rutinaId) return false;

    const ejerciciosDeRutina = registros.filter(
      (registro) => registro.rutina_id === rutinaId
    );

    return ejerciciosDeRutina.length > 0;
  }).length;
}, [registros]);

  const ejerciciosCompletados = registros.length;

  const ultimoEntrenamiento = registros[0]?.created_at || null;

  const rmsOrdenados = useMemo(() => {
    const mapa = new Map<string, RMActual>();

    rmsActuales.forEach((rm) => {
      if (!rm.ejercicio_id) return;
      mapa.set(rm.ejercicio_id, rm);
    });

    registros.forEach((registro) => {
      if (
        !registro.ejercicio_id ||
        registro.rm_calculado === null ||
        registro.rm_calculado === undefined
      ) {
        return;
      }

      const actual = mapa.get(registro.ejercicio_id);

      if (Number(registro.rm_calculado) > Number(actual?.rm_calculado || 0)) {
        mapa.set(registro.ejercicio_id, {
          id: `registro-${registro.id}`,
          ejercicio_id: registro.ejercicio_id,
          rm_calculado: registro.rm_calculado,
          peso_kg: registro.peso_kg,
          repeticiones: registro.repeticiones,
          actualizado_en: registro.created_at,
        });
      }
    });

    return Array.from(mapa.values()).sort(
      (a, b) => Number(b.rm_calculado || 0) - Number(a.rm_calculado || 0)
    );
  }, [rmsActuales, registros]);

  const rmsMostrados = verTodosRM ? rmsOrdenados : rmsOrdenados.slice(0, 5);

  const entrenamientosMostrados = verTodosEntrenamientos
    ? registros
    : registros.slice(0, 3);

  function nombreEjercicio(ejercicioId: string) {
    const ejercicio = ejercicios.find((item) => item.id === ejercicioId);
    return ejercicio?.nombre || "Ejercicio";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando progresos...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      <div className="max-w-5xl mx-auto">
        <Link href="/alumno" className="text-zinc-400 hover:text-white">
          ← Volver al panel
        </Link>

        <header className="mt-6 mb-6">
          <h1 className="text-3xl font-bold">📈 Mis progresos</h1>

          <p className="text-zinc-400 mt-2">
            {alumno?.nombre} {alumno?.apellido || ""}
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-zinc-400 text-sm">Rutinas completadas</p>
            <p className="text-3xl font-bold mt-2">{rutinasCompletadas}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-zinc-400 text-sm">Ejercicios completados</p>
            <p className="text-3xl font-bold mt-2">{ejerciciosCompletados}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-zinc-400 text-sm">Último entrenamiento</p>
            <p className="text-2xl font-bold mt-2">
              {formatearFecha(ultimoEntrenamiento)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-bold">🏆 Mis mejores marcas</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Se muestran los 5 RM más altos.
              </p>
            </div>

            {rmsOrdenados.length > 5 && (
              <button
                type="button"
                onClick={() => setVerTodosRM(!verTodosRM)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
              >
                {verTodosRM ? "Ver menos" : "Ver todos"}
              </button>
            )}
          </div>

          {rmsMostrados.length === 0 ? (
            <p className="text-zinc-500">Todavía no hay RM registrados.</p>
          ) : (
            <div className="space-y-3">
              {rmsMostrados.map((rm, index) => (
                <div
                  key={rm.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {index + 1}. {nombreEjercicio(rm.ejercicio_id)}
                      </h3>

                      <p className="text-zinc-500 text-sm">
                        Actualizado: {formatearFecha(rm.actualizado_en)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-400">
                        {rm.rm_calculado || 0} kg
                      </p>

                      {(rm.peso_kg || rm.repeticiones) && (
                        <p className="text-zinc-500 text-sm">
                          {rm.peso_kg || "-"} kg x {rm.repeticiones || "-"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-bold">📝 Últimos entrenamientos</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Se muestran los últimos 3 registros.
              </p>
            </div>

            {registros.length > 3 && (
              <button
                type="button"
                onClick={() =>
                  setVerTodosEntrenamientos(!verTodosEntrenamientos)
                }
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
              >
                {verTodosEntrenamientos ? "Ver menos" : "Ver más"}
              </button>
            )}
          </div>

          {entrenamientosMostrados.length === 0 ? (
            <p className="text-zinc-500">
              Todavía no hay entrenamientos registrados.
            </p>
          ) : (
            <div className="space-y-3">
              {entrenamientosMostrados.map((registro) => (
                <div
                  key={registro.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {registro.nombre_ejercicio || "Ejercicio"}
                      </h3>

                      <p className="text-zinc-500 text-sm">
                        {formatearFecha(registro.created_at)}
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1 text-sm font-semibold">
                      Completado
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4 text-sm">
                    {registro.peso_kg !== null &&
                      registro.peso_kg !== undefined && (
                        <span className="rounded-full bg-zinc-800 px-3 py-1">
                          Peso: {registro.peso_kg} kg
                        </span>
                      )}

                    {registro.repeticiones !== null &&
                      registro.repeticiones !== undefined && (
                        <span className="rounded-full bg-zinc-800 px-3 py-1">
                          Reps: {registro.repeticiones}
                        </span>
                      )}

                    {registro.rpe !== null && registro.rpe !== undefined && (
                      <span className="rounded-full bg-zinc-800 px-3 py-1">
                        RPE: {registro.rpe}
                      </span>
                    )}

                    {registro.rir !== null && registro.rir !== undefined && (
                      <span className="rounded-full bg-zinc-800 px-3 py-1">
                        RIR: {registro.rir}
                      </span>
                    )}

                    {registro.rm_calculado !== null &&
                      registro.rm_calculado !== undefined && (
                        <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1">
                          RM estimado: {registro.rm_calculado} kg
                        </span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mt-5">
          <h2 className="text-2xl font-bold">🧪 Evaluaciones</h2>

          <p className="text-zinc-400 mt-2">
            Próximamente vas a poder ver acá evaluaciones específicas:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <h3 className="font-semibold">Cálculos de RM</h3>
              <p className="text-zinc-500 text-sm mt-1">
                Evaluaciones de fuerza en días específicos.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <h3 className="font-semibold">Tests físicos</h3>
              <p className="text-zinc-500 text-sm mt-1">
                Saltos, velocidad, resistencia y otros tests.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <h3 className="font-semibold">FMS / movilidad</h3>
              <p className="text-zinc-500 text-sm mt-1">
                Evaluaciones de movimiento, movilidad y control corporal.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

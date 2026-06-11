"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
};

type Alumno = {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
  user_id?: string | null;
  foto_url?: string | null;
};

type RutinaAsignada = {
  id: string;
  rutina_id: string;
  completada?: boolean | null;
  activa?: boolean | null;
  fecha_asignacion?: string | null;
  rutinas?: {
    id: string;
    nombre?: string | null;
    objetivo?: string | null;
    estructura?: string | null;
  } | null;
};

type RutinaRelacion =
  | RutinaAsignada["rutinas"]
  | NonNullable<RutinaAsignada["rutinas"]>[];

type RutinaAsignadaResponse = Omit<RutinaAsignada, "rutinas"> & {
  rutinas?: RutinaRelacion;
};

type RutinaEjercicio = {
  id: string;
  rutina_id: string;
};

type RegistroEntrenamiento = {
  id: string;
  alumno_id: string;
  rutina_id?: string | null;
  rutina_ejercicio_id?: string | null;
  created_at?: string | null;
};

type RMActual = {
  id: string;
  ejercicio_id: string;
  rm_calculado?: number | null;
};

type Ejercicio = {
  id: string;
  nombre: string;
};

type SeccionActiva = "inicio" | "perfil";

function iniciales(nombre?: string | null, apellido?: string | null) {
  const primera = nombre?.trim()?.[0] || "";
  const segunda = apellido?.trim()?.[0] || "";

  return `${primera}${segunda}`.toUpperCase() || "A";
}

function inicioSemana() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - 7);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

function normalizarRutina(rutinas?: RutinaRelacion) {
  if (Array.isArray(rutinas)) {
    return rutinas[0] || null;
  }

  return rutinas || null;
}

export default function AlumnoHomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [loading, setLoading] = useState(true);

  const [seccionActiva, setSeccionActiva] =
    useState<SeccionActiva>("inicio");

  const [rutinasAsignadas, setRutinasAsignadas] = useState<RutinaAsignada[]>(
    []
  );
  const [ejerciciosRutina, setEjerciciosRutina] = useState<RutinaEjercicio[]>(
    []
  );
  const [registros, setRegistros] = useState<RegistroEntrenamiento[]>([]);
  const [rmsActuales, setRmsActuales] = useState<RMActual[]>([]);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);

  async function cargarDatos() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const user = sessionData.session.user;

    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("id,nombre,email,rol")
      .eq("id", user.id)
      .single();

    if (perfilError || !perfil || perfil.rol !== "alumno") {
      window.location.href = "/";
      return;
    }

    setProfile(perfil);

    const { data: alumnoData, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id,nombre,apellido,email,user_id,foto_url")
      .eq("user_id", user.id)
      .single();

    if (alumnoError || !alumnoData) {
      setLoading(false);
      return;
    }

    setAlumno(alumnoData);

    const { data: asignacionesData } = await supabase
      .from("rutina_asignaciones")
      .select(`
        id,
        rutina_id,
        completada,
        activa,
        fecha_asignacion,
        rutinas (
          id,
          nombre,
          objetivo,
          estructura
        )
      `)
      .eq("alumno_id", alumnoData.id)
      .order("fecha_asignacion", { ascending: true })
      .order("created_at", { ascending: true });

    const asignaciones = ((asignacionesData || []) as RutinaAsignadaResponse[]).map(
      (asignacion) => ({
        ...asignacion,
        rutinas: normalizarRutina(asignacion.rutinas),
      })
    );

    setRutinasAsignadas(asignaciones);

    const rutinaIds = asignaciones.map((item) => item.rutina_id);

    if (rutinaIds.length > 0) {
      const { data: ejerciciosRutinaData } = await supabase
        .from("rutina_ejercicios")
        .select("id,rutina_id")
        .in("rutina_id", rutinaIds);

      setEjerciciosRutina(ejerciciosRutinaData || []);
    } else {
      setEjerciciosRutina([]);
    }

    const { data: registrosData } = await supabase
      .from("registros_entrenamiento")
      .select("id,alumno_id,rutina_id,rutina_ejercicio_id,created_at")
      .eq("alumno_id", alumnoData.id)
      .eq("completado", true)
      .order("created_at", { ascending: false });

    setRegistros(registrosData || []);

    const { data: rmsData } = await supabase
      .from("rms_actuales")
      .select("id,ejercicio_id,rm_calculado")
      .eq("alumno_id", alumnoData.id);

    setRmsActuales(rmsData || []);

    const idsEjercicios =
      rmsData?.map((rm) => rm.ejercicio_id).filter(Boolean) || [];

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

  function cantidadPendientes(rutinaId: string) {
    const ejerciciosDeRutina = ejerciciosRutina.filter(
      (ejercicio) => ejercicio.rutina_id === rutinaId
    );

    const completados = registros.filter(
      (registro) => registro.rutina_id === rutinaId
    );

    return Math.max(ejerciciosDeRutina.length - completados.length, 0);
  }

  const rutinaPendiente = useMemo(() => {
    return (
      rutinasAsignadas.find((rutina) => {
        if (rutina.completada) return false;

        const ejerciciosDeRutina = ejerciciosRutina.filter(
          (ejercicio) => ejercicio.rutina_id === rutina.rutina_id
        );

        if (ejerciciosDeRutina.length === 0) return true;

        const completados = registros.filter(
          (registro) => registro.rutina_id === rutina.rutina_id
        );

        return completados.length < ejerciciosDeRutina.length;
      }) || null
    );
  }, [rutinasAsignadas, ejerciciosRutina, registros]);

  const rutinasCompletadas = useMemo(() => {
    return rutinasAsignadas.filter((item) => {
      if (item.completada) return true;

      const ejerciciosDeRutina = ejerciciosRutina.filter(
        (ejercicio) => ejercicio.rutina_id === item.rutina_id
      );

      if (ejerciciosDeRutina.length === 0) return false;

      const completados = registros.filter(
        (registro) => registro.rutina_id === item.rutina_id
      );

      return completados.length >= ejerciciosDeRutina.length;
    }).length;
  }, [rutinasAsignadas, ejerciciosRutina, registros]);

  const ejerciciosCompletados = registros.length;

  const entrenamientosSemana = useMemo(() => {
    const desde = inicioSemana();

    const rutinasUnicas = new Set(
      registros
        .filter((registro) => {
          if (!registro.created_at) return false;
          return new Date(registro.created_at) >= desde;
        })
        .map((registro) => registro.rutina_id)
        .filter(Boolean)
    );

    return rutinasUnicas.size;
  }, [registros]);

  const mejorRM = useMemo(() => {
    const mejor = [...rmsActuales].sort(
      (a, b) => Number(b.rm_calculado || 0) - Number(a.rm_calculado || 0)
    )[0];

    if (!mejor) return null;

    const ejercicio = ejercicios.find((item) => item.id === mejor.ejercicio_id);

    return {
      nombre: ejercicio?.nombre || "Ejercicio",
      rm: mejor.rm_calculado || 0,
    };
  }, [rmsActuales, ejercicios]);

  const ejerciciosPendientesRutina = rutinaPendiente
    ? cantidadPendientes(rutinaPendiente.rutina_id)
    : 0;

  const tuvoRutinas = rutinasAsignadas.length > 0;
  const tienePendiente = Boolean(rutinaPendiente);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center text-2xl font-bold text-emerald-400 shrink-0 overflow-hidden">
  {alumno?.foto_url ? (
    <img
      src={alumno.foto_url}
      alt="Foto de perfil"
      className="h-full w-full object-cover"
    />
  ) : (
    iniciales(alumno?.nombre || profile?.nombre, alumno?.apellido)
  )}
</div>

          <div>
            <h1 className="text-3xl font-bold">
              Hola, {alumno?.nombre || profile?.nombre} 👋
            </h1>

            <p className="text-zinc-400 mt-1">
              {entrenamientosSemana > 0
                ? `🔥 ${entrenamientosSemana} entrenamiento${
                    entrenamientosSemana === 1 ? "" : "s"
                  } esta semana`
                : "Listo para entrenar"}
            </p>
          </div>
        </header>

        {seccionActiva === "inicio" && (
          <>
            <section className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 mb-4">
              {tienePendiente && rutinaPendiente ? (
                <>
                  <h2 className="text-xl font-semibold">
                    🎯 Próximo entrenamiento
                  </h2>

                  <p className="text-2xl font-bold mt-3">
                    {rutinaPendiente.rutinas?.nombre || "Rutina asignada"}
                  </p>

                  {rutinaPendiente.rutinas?.objetivo && (
                    <p className="text-zinc-400 mt-1">
                      {rutinaPendiente.rutinas.objetivo}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4 text-sm">
                    {rutinaPendiente.rutinas?.estructura && (
                      <span className="rounded-full bg-zinc-800 px-3 py-1">
                        {rutinaPendiente.rutinas.estructura}
                      </span>
                    )}

                    {ejerciciosPendientesRutina > 0 && (
                      <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1">
                        {ejerciciosPendientesRutina} ejercicios pendientes
                      </span>
                    )}
                  </div>
                </>
              ) : tuvoRutinas ? (
                <>
                  <h2 className="text-xl font-semibold">
                    ✅ Planificación completada
                  </h2>

                  <p className="text-zinc-400 mt-2">
                    Esperá a que tu profesor te asigne nuevas rutinas.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold">👋 Bienvenido</h2>

                  <p className="text-zinc-400 mt-2">
                    Todavía no tenés rutinas asignadas.
                  </p>
                </>
              )}
            </section>

            <section className="grid gap-4">
              <Link
                href="/alumno/rutina"
                className="text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500 hover:bg-zinc-800 transition cursor-pointer"
              >
                <h2 className="text-xl font-semibold">🏋️ Mi rutina</h2>
                <p className="text-zinc-400 mt-2">
                  Ver rutina actual y completar ejercicios.
                </p>
              </Link>

              <Link
                href="/alumno/progreso"
                className="text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500 hover:bg-zinc-800 transition cursor-pointer"
              >
                <h2 className="text-xl font-semibold">📈 Mis progresos</h2>
                <p className="text-zinc-400 mt-2">
                  RM, historial y estadísticas.
                </p>
              </Link>

              <Link
                href="/alumno/perfil"
                className="text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500 hover:bg-zinc-800 transition cursor-pointer"
              >
                <h2 className="text-xl font-semibold">👤 Mi perfil</h2>
                <p className="text-zinc-400 mt-2">
                  Datos personales y observaciones.
                </p>
              </Link>
            </section>

            <section className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 mt-4">
              <h2 className="text-xl font-semibold mb-4">📊 Resumen rápido</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-4">
                  <p className="text-zinc-400 text-sm">Rutinas completadas</p>
                  <p className="text-3xl font-bold mt-1">
                    {rutinasCompletadas}
                  </p>
                </div>

                <div className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-4">
                  <p className="text-zinc-400 text-sm">
                    Ejercicios completados
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {ejerciciosCompletados}
                  </p>
                </div>

                <div className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-4">
                  <p className="text-zinc-400 text-sm">Mejor RM</p>
                  {mejorRM ? (
                    <>
                      <p className="text-2xl font-bold mt-1 text-emerald-400">
                        {mejorRM.rm} kg
                      </p>
                      <p className="text-zinc-500 text-sm">{mejorRM.nombre}</p>
                    </>
                  ) : (
                    <p className="text-zinc-500 mt-2">Sin registros</p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {seccionActiva === "perfil" && (
          <section className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
            <button
              type="button"
              onClick={() => setSeccionActiva("inicio")}
              className="mb-4 text-sm text-zinc-400 hover:text-white"
            >
              ← Volver al inicio
            </button>

            <h2 className="text-2xl font-bold mb-4">👤 Mi perfil</h2>

            <div className="space-y-2 text-zinc-300">
              <p>
                <span className="text-zinc-500">Nombre:</span>{" "}
                {alumno?.nombre || profile?.nombre}
              </p>

              {alumno?.apellido && (
                <p>
                  <span className="text-zinc-500">Apellido:</span>{" "}
                  {alumno.apellido}
                </p>
              )}

              <p>
                <span className="text-zinc-500">Email:</span>{" "}
                {alumno?.email || profile?.email}
              </p>

              <p>
                <span className="text-zinc-500">Rol:</span> {profile?.rol}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

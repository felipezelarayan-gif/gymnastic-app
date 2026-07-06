"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";

type RegistroFlexible = Record<string, any>;

type RutinaAsignada = {
  id: string;
  alumno_id: string;
  rutina_id: string | null;
  completada: boolean | null;
  fecha_asignacion: string | null;
  fecha_completada?: string | null;
  rutinas: {
    id: string;
    nombre: string | null;
    descripcion?: string | null;
    objetivo?: string | null;
    estructura?: string | null;
  } | null;
};

type ProgresoLocal = {
  entradaCalorCompletada: Record<string, boolean>;
  ejerciciosCompletados: Record<string, boolean>;
};

function crearProgresoVacio(): ProgresoLocal {
  return {
    entradaCalorCompletada: {},
    ejerciciosCompletados: {},
  };
}

function obtenerRelacionUnica<T>(relacion: T | T[] | null | undefined): T | null {
  if (!relacion) return null;
  return Array.isArray(relacion) ? relacion[0] || null : relacion;
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "Sin fecha";

  const fechaParseada = new Date(fecha);
  if (Number.isNaN(fechaParseada.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fechaParseada);
}

function obtenerNombreEjercicio(item: RegistroFlexible) {
  const ejercicio = obtenerRelacionUnica<RegistroFlexible>(item.ejercicios);
  return ejercicio?.nombre || item.nombre || "Ejercicio";
}

function obtenerDetalleEjercicio(item: RegistroFlexible) {
  const partes = [
    item.series ? `${item.series} series` : null,
    item.repeticiones ? `${item.repeticiones} reps` : null,
    item.tiempo ? `${item.tiempo}` : null,
    item.descanso ? `Descanso ${item.descanso}` : null,
    item.rir ? `RIR ${item.rir}` : null,
    item.porcentaje_rm ? `${item.porcentaje_rm}% RM` : null,
  ].filter(Boolean);

  return partes.join(" · ");
}

function obtenerOrden(item: RegistroFlexible) {
  return typeof item.orden === "number" ? item.orden : 999;
}

function obtenerStorageKey(asignacionId: string) {
  return `rutina-progreso-${asignacionId}`;
}

export default function NuevaRutinaDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const asignacionId = params.id;

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [rutinaAsignada, setRutinaAsignada] = useState<RutinaAsignada | null>(null);
  const [entradaCalor, setEntradaCalor] = useState<RegistroFlexible[]>([]);
  const [ejercicios, setEjercicios] = useState<RegistroFlexible[]>([]);
  const [seriesPorEjercicio, setSeriesPorEjercicio] = useState<
    Record<string, RegistroFlexible[]>
  >({});
  const [progresoLocal, setProgresoLocal] = useState<ProgresoLocal>(crearProgresoVacio());

  useEffect(() => {
    router.prefetch("/alumno/rutina");
  }, [router]);

  useEffect(() => {
    if (!asignacionId) return;

    const progresoGuardado = window.localStorage.getItem(obtenerStorageKey(asignacionId));
    if (!progresoGuardado) return;

    try {
      setProgresoLocal({
        ...crearProgresoVacio(),
        ...JSON.parse(progresoGuardado),
      });
    } catch {
      setProgresoLocal(crearProgresoVacio());
    }
  }, [asignacionId]);

  useEffect(() => {
    if (!asignacionId) return;

    window.localStorage.setItem(
      obtenerStorageKey(asignacionId),
      JSON.stringify(progresoLocal),
    );
  }, [asignacionId, progresoLocal]);

  useEffect(() => {
    if (!asignacionId) return;
    cargarRutinaAsignada();
  }, [asignacionId]);

  const entradaCalorCompletada = useMemo(
    () => entradaCalor.filter((item) => progresoLocal.entradaCalorCompletada[item.id]).length,
    [entradaCalor, progresoLocal.entradaCalorCompletada],
  );

  const ejerciciosCompletados = useMemo(
    () => ejercicios.filter((item) => progresoLocal.ejerciciosCompletados[item.id]).length,
    [ejercicios, progresoLocal.ejerciciosCompletados],
  );

  const entradaCalorLista =
    entradaCalor.length === 0 || entradaCalorCompletada === entradaCalor.length;
  const ejerciciosListos = ejercicios.length > 0 && ejerciciosCompletados === ejercicios.length;
  const rutinaListaParaFinalizar = entradaCalorLista && ejerciciosListos;

  async function cargarRutinaAsignada() {
    setCargando(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError("No se pudo validar tu sesión.");
      setCargando(false);
      return;
    }

    const { data: alumnoData, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (alumnoError) {
      setError(alumnoError.message);
      setCargando(false);
      return;
    }

    if (!alumnoData) {
      setError("No encontramos un alumno vinculado a esta cuenta.");
      setCargando(false);
      return;
    }

    const { data: asignacionData, error: asignacionError } = await supabase
      .from("rutina_asignaciones")
      .select(
        `
          id,
          alumno_id,
          rutina_id,
          completada,
          fecha_asignacion,
          fecha_completada,
          rutinas (
            id,
            nombre,
            descripcion,
            objetivo,
            estructura
          )
        `,
      )
      .eq("id", asignacionId)
      .eq("alumno_id", alumnoData.id)
      .maybeSingle();

    if (asignacionError) {
      setError(asignacionError.message);
      setCargando(false);
      return;
    }

    if (!asignacionData) {
      setError("No encontramos esta rutina asignada para tu usuario.");
      setCargando(false);
      return;
    }

    const rutinaRelacionada = obtenerRelacionUnica(asignacionData.rutinas);

    const asignacionNormalizada: RutinaAsignada = {
      id: asignacionData.id,
      alumno_id: asignacionData.alumno_id,
      rutina_id: asignacionData.rutina_id,
      completada: asignacionData.completada,
      fecha_asignacion: asignacionData.fecha_asignacion,
      fecha_completada: asignacionData.fecha_completada,
      rutinas: rutinaRelacionada || null,
    };

    setRutinaAsignada(asignacionNormalizada);

    if (asignacionNormalizada.rutina_id) {
      await cargarDetalleRutina(asignacionNormalizada.rutina_id);
    }

    setCargando(false);
  }

  async function cargarDetalleRutina(rutinaId: string) {
    const { data: entradaData, error: entradaError } = await supabase
      .from("rutina_entrada_calor")
      .select(
        `
          *,
          ejercicios (*)
        `,
      )
      .eq("rutina_id", rutinaId)
      .order("orden", { ascending: true });

    if (entradaError) {
      console.error("Error cargando entrada en calor:", entradaError);
    }

    setEntradaCalor(
      ((entradaData || []) as RegistroFlexible[]).sort(
        (a, b) => obtenerOrden(a) - obtenerOrden(b),
      ),
    );

    const { data: ejerciciosData, error: ejerciciosError } = await supabase
      .from("rutina_ejercicios")
      .select(
        `
          *,
          ejercicios (*)
        `,
      )
      .eq("rutina_id", rutinaId)
      .order("orden", { ascending: true });

    if (ejerciciosError) {
      console.error("Error cargando ejercicios:", ejerciciosError);
    }

    const ejerciciosNormalizados = ((ejerciciosData || []) as RegistroFlexible[]).sort(
      (a, b) => obtenerOrden(a) - obtenerOrden(b),
    );

    setEjercicios(ejerciciosNormalizados);

    const rutinaEjercicioIds = ejerciciosNormalizados
      .map((ejercicio) => ejercicio.id)
      .filter(Boolean);

    if (rutinaEjercicioIds.length === 0) {
      setSeriesPorEjercicio({});
      return;
    }

    const { data: seriesData, error: seriesError } = await supabase
      .from("rutina_ejercicio_series")
      .select("*")
      .in("rutina_ejercicio_id", rutinaEjercicioIds)
      .order("numero_serie", { ascending: true });

    if (seriesError) {
      console.error("Error cargando series avanzadas:", seriesError);
      setSeriesPorEjercicio({});
      return;
    }

    const agrupadas = ((seriesData || []) as RegistroFlexible[]).reduce(
      (acc, serie) => {
        const rutinaEjercicioId = serie.rutina_ejercicio_id;
        if (!rutinaEjercicioId) return acc;

        acc[rutinaEjercicioId] = [...(acc[rutinaEjercicioId] || []), serie];
        return acc;
      },
      {} as Record<string, RegistroFlexible[]>,
    );

    setSeriesPorEjercicio(agrupadas);
  }

  function volverANuevarutina() {
    router.push("/alumno/rutina");
  }


  function alternarEntradaCalor(id: string) {
    setProgresoLocal((actual) => ({
      ...actual,
      entradaCalorCompletada: {
        ...actual.entradaCalorCompletada,
        [id]: !actual.entradaCalorCompletada[id],
      },
    }));
    setMensaje(null);
  }

  function alternarEjercicio(id: string) {
    setProgresoLocal((actual) => ({
      ...actual,
      ejerciciosCompletados: {
        ...actual.ejerciciosCompletados,
        [id]: !actual.ejerciciosCompletados[id],
      },
    }));
    setMensaje(null);
  }

  function guardarProgresoLocal() {
    if (!asignacionId) return;

    window.localStorage.setItem(
      obtenerStorageKey(asignacionId),
      JSON.stringify(progresoLocal),
    );
    setMensaje("Progreso guardado en este dispositivo.");
  }

  async function finalizarRutina() {
    if (!rutinaAsignada || !rutinaListaParaFinalizar) return;

    const confirmar = window.confirm(
      "¿Querés finalizar esta rutina? Se marcará como completada en la base de datos.",
    );

    if (!confirmar) return;

    setGuardando(true);
    setMensaje(null);

    const { error: updateError } = await supabase
      .from("rutina_asignaciones")
      .update({
        completada: true,
        activa: false,
        fecha_completada: new Date().toISOString(),
      })
      .eq("id", rutinaAsignada.id)
      .eq("alumno_id", rutinaAsignada.alumno_id);

    if (updateError) {
      setMensaje(updateError.message);
      setGuardando(false);
      return;
    }

    window.localStorage.removeItem(obtenerStorageKey(rutinaAsignada.id));
    setRutinaAsignada((actual) =>
      actual
        ? {
            ...actual,
            completada: true,
            fecha_completada: new Date().toISOString(),
          }
        : actual,
    );
    setProgresoLocal(crearProgresoVacio());
    setMensaje("Rutina completada correctamente.");
    setGuardando(false);
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-10 w-28 rounded-xl bg-zinc-900 animate-pulse" />
          <div className="h-40 rounded-2xl bg-zinc-900 animate-pulse" />
          <div className="h-64 rounded-2xl bg-zinc-900 animate-pulse" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white p-4 pb-24">
        <div className="max-w-3xl mx-auto space-y-5">
          <BackButton fallback="/alumno/rutina" />

          <section className="rounded-2xl border border-red-900/50 bg-red-950/20 p-5">
            <h1 className="text-xl font-bold text-red-300">No pudimos cargar la rutina</h1>
            <p className="text-zinc-400 mt-2">{error}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton fallback="/alumno/rutina" />

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm font-semibold text-emerald-400">Rutina asignada</p>
          <h1 className="text-2xl font-bold leading-tight mt-2">
            {rutinaAsignada?.rutinas?.nombre || "Rutina"}
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Fecha: {formatearFecha(rutinaAsignada?.fecha_asignacion)}
          </p>

          <div className="flex flex-wrap gap-2 mt-4 text-sm">
            {rutinaAsignada?.rutinas?.objetivo && (
              <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1">
                {rutinaAsignada.rutinas.objetivo}
              </span>
            )}

            {rutinaAsignada?.rutinas?.estructura && (
              <span className="rounded-full bg-zinc-800 text-zinc-300 px-3 py-1">
                {rutinaAsignada.rutinas.estructura}
              </span>
            )}

            {rutinaAsignada?.completada && (
              <span className="rounded-full bg-emerald-600 text-white px-3 py-1 font-semibold">
                Completada
              </span>
            )}
          </div>

          {rutinaAsignada?.rutinas?.descripcion && (
            <p className="text-zinc-400 mt-4">{rutinaAsignada.rutinas.descripcion}</p>
          )}
        </section>

        {entradaCalor.length > 0 && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Entrada en calor</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Marcá cada ejercicio cuando esté completo.
                </p>
              </div>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                {entradaCalorCompletada}/{entradaCalor.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {entradaCalor.map((item) => {
                const completado = Boolean(progresoLocal.entradaCalorCompletada[item.id]);

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 ${
                      completado
                        ? "border-emerald-600 bg-emerald-900/20"
                        : "border-zinc-700 bg-zinc-800/70"
                    }`}
                  >
                    <p className="font-semibold">{obtenerNombreEjercicio(item)}</p>
                    {obtenerDetalleEjercicio(item) && (
                      <p className="text-sm text-zinc-400 mt-1">
                        {obtenerDetalleEjercicio(item)}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => alternarEntradaCalor(item.id)}
                      className={`mt-3 rounded-lg px-4 py-2 text-sm font-semibold ${
                        completado
                          ? "bg-zinc-700 text-zinc-200"
                          : "bg-emerald-600 text-white hover:bg-emerald-500"
                      }`}
                    >
                      {completado ? "Deshacer" : "Completar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Ejercicios</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Completá los ejercicios indicados por tu profesor.
              </p>
            </div>
            <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
              {ejerciciosCompletados}/{ejercicios.length}
            </span>
          </div>

          {ejercicios.length === 0 ? (
            <p className="text-sm text-zinc-500 mt-4">
              Esta rutina todavía no tiene ejercicios cargados.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {ejercicios.map((ejercicio, index) => {
                const seriesAvanzadas = seriesPorEjercicio[ejercicio.id] || [];
                const completado = Boolean(progresoLocal.ejerciciosCompletados[ejercicio.id]);

                return (
                  <div
                    key={ejercicio.id}
                    className={`rounded-xl border p-4 ${
                      completado
                        ? "border-emerald-600 bg-emerald-900/20"
                        : "border-zinc-700 bg-zinc-800/70"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm text-zinc-300">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{obtenerNombreEjercicio(ejercicio)}</p>
                        {obtenerDetalleEjercicio(ejercicio) && (
                          <p className="text-sm text-zinc-400 mt-1">
                            {obtenerDetalleEjercicio(ejercicio)}
                          </p>
                        )}

                        {seriesAvanzadas.length > 0 && (
                          <div className="mt-3 rounded-lg border border-zinc-700 bg-black/20 p-3">
                            <p className="text-xs font-semibold text-zinc-400 mb-2">
                              Series avanzadas
                            </p>
                            <div className="space-y-1 text-sm text-zinc-300">
                              {seriesAvanzadas.map((serie, serieIndex) => (
                                <p key={serie.id || serieIndex}>
                                  Serie {serie.numero_serie || serieIndex + 1}
                                  {serie.repeticiones ? ` · ${serie.repeticiones} reps` : ""}
                                  {serie.peso ? ` · ${serie.peso} kg` : ""}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => alternarEjercicio(ejercicio.id)}
                          className={`mt-3 rounded-lg px-4 py-2 text-sm font-semibold ${
                            completado
                              ? "bg-zinc-700 text-zinc-200"
                              : "bg-emerald-600 text-white hover:bg-emerald-500"
                          }`}
                        >
                          {completado ? "Deshacer" : "Completar"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-xl font-bold">Guardar avance</h2>
          <p className="text-sm text-zinc-400 mt-2">
            Los botones de cada ejercicio guardan el avance en caché local. Al finalizar, la rutina se actualiza en la base de datos.
          </p>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={guardarProgresoLocal}
              disabled={guardando}
              className="w-full rounded-2xl border border-zinc-700 px-4 py-3 font-semibold hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Guardar progreso local
            </button>

            <button
              type="button"
              onClick={finalizarRutina}
              disabled={!rutinaListaParaFinalizar || guardando || Boolean(rutinaAsignada?.completada)}
              className={`w-full rounded-2xl px-4 py-3 font-semibold ${
                rutinaListaParaFinalizar && !rutinaAsignada?.completada
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              } disabled:opacity-60`}
            >
              {guardando
                ? "Finalizando..."
                : rutinaAsignada?.completada
                  ? "Rutina completada"
                  : "Finalizar rutina"}
            </button>
          </div>

          {!rutinaListaParaFinalizar && (
            <p className="text-xs text-zinc-500 mt-3">
              Para finalizar, completá la entrada en calor y todos los ejercicios.
            </p>
          )}

          {mensaje && <p className="text-xs text-emerald-300 mt-3">{mensaje}</p>}
        </section>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getRolCached } from "@/lib/rol-cache";
import BackButton from "@/components/BackButton";
import { parseFechaLocal, formatearFechaCorta } from "@/lib/utils/formatearFecha";
import VerEvaluacionModal from "@/components/alumno/VerEvaluacionModal";

interface PageProps {
  params: Promise<{ id: string }>;
}

type ActividadAlumno = {
  id: string;
  tipo: "rutina" | "evaluacion";
  subtipo?: string;
  nombre: string;
  href: string;
  fecha?: string | null;
  completada?: boolean;
  puedeCargarAlumno?: boolean | null;
};

function normalizarFechaSoloDia(fecha?: string | null) {
  if (!fecha) return null;
  return fecha.split("T")[0];
}

function timestampFechaLocal(fecha?: string | null) {
  const fechaNormalizada = normalizarFechaSoloDia(fecha);
  if (!fechaNormalizada) return 0;
  return parseFechaLocal(fechaNormalizada)?.getTime() ?? 0;
}

function obtenerEtiquetaActividad(actividad: ActividadAlumno) {
  if (actividad.tipo === "rutina") return "Rutina";
  if (actividad.subtipo) return `Evaluación ${actividad.subtipo.toUpperCase()}`;
  return "Evaluación";
}

function obtenerIconoActividad(actividad: ActividadAlumno) {
  return actividad.tipo === "rutina" ? "🏋️" : "📋";
}

export default function AlumnoPlanificacionPage({ params }: PageProps) {
  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [planificacion, setPlanificacion] = useState<ActividadAlumno[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mostrarCompletados, setMostrarCompletados] = useState(false);
  const [modalEvaluacion, setModalEvaluacion] = useState<{
    open: boolean;
    id: string;
    subtipo: "rm" | "fms";
  } | null>(null);

  useEffect(() => {
    const cargarParams = async () => {
      const { id } = await params;
      setAlumnoId(id);
    };
    cargarParams();
  }, [params]);

  useEffect(() => {
    if (alumnoId) {
      cargarPlanificacion();
    }
  }, [alumnoId, mostrarCompletados]);

  async function cargarPlanificacion() {
    if (!alumnoId) return;

    setCargando(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError("No se pudo validar tu sesión.");
      setCargando(false);
      return;
    }

    const rol = await getRolCached(authData.user.id);

    if (rol !== "profe" && rol !== "admin") {
      setError("No tenés permisos para ver esta página.");
      setCargando(false);
      return;
    }

    // Obtener rutinas, evaluaciones RM y evaluaciones FMS en paralelo
    const [
      { data: rutinasData, error: rutinasError },
      { data: evaluacionesRmData, error: evaluacionesRmError },
      { data: evaluacionesFmsData, error: evaluacionesFmsError },
    ] = await Promise.all([
      supabase
        .from("rutina_asignaciones")
        .select(`
          id,
          rutina_id,
          activa,
          completada,
          fecha_asignacion,
          rutinas (
            nombre
          )
        `)
        .eq("alumno_id", alumnoId)
        .order("fecha_asignacion", { ascending: false }),
      supabase
        .from("evaluaciones_rm")
        .select(`
          id,
          nombre,
          estado,
          fecha_realizacion,
          puede_cargar_alumno,
          created_at
        `)
        .eq("alumno_id", alumnoId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("evaluaciones_fms")
        .select(`
          id,
          estado,
          fecha_realizacion,
          puede_cargar_alumno,
          created_at
        `)
        .eq("alumno_id", alumnoId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    if (rutinasError) {
      setError(rutinasError.message);
      setCargando(false);
      return;
    }

    if (evaluacionesRmError) {
      setError(evaluacionesRmError.message);
      setCargando(false);
      return;
    }

    if (evaluacionesFmsError) {
      setError(evaluacionesFmsError.message);
      setCargando(false);
      return;
    }

    // Procesar rutinas
    const rutinas: ActividadAlumno[] = (rutinasData || [])
      .filter((r: any) => r.activa !== false)
      .map((r: any) => ({
        id: r.id,
        tipo: "rutina" as const,
        nombre: r.rutinas?.nombre || "Rutina asignada",
        href: `/alumnos/${alumnoId}/rutinas`,
        fecha: normalizarFechaSoloDia(r.fecha_asignacion),
        completada: r.completada === true,
      }));

    // Procesar evaluaciones RM
    const evaluacionesRm: ActividadAlumno[] = (evaluacionesRmData || []).map((e: any) => ({
      id: e.id,
      tipo: "evaluacion" as const,
      subtipo: "rm",
      nombre: e.nombre || "Evaluación de RM",
      href: `/evaluaciones/realizar/rm/${e.id}`,
      fecha: normalizarFechaSoloDia(e.fecha_realizacion || e.created_at),
      completada: e.estado === "completada",
      puedeCargarAlumno: e.puede_cargar_alumno ?? null,
    }));

    // Procesar evaluaciones FMS
    const evaluacionesFms: ActividadAlumno[] = (evaluacionesFmsData || []).map((e: any) => ({
      id: e.id,
      tipo: "evaluacion" as const,
      subtipo: "fms",
      nombre: "Evaluación FMS",
      href: `/evaluaciones/realizar/fms/${e.id}`,
      fecha: normalizarFechaSoloDia(e.fecha_realizacion || e.created_at),
      completada: e.estado === "completada",
      puedeCargarAlumno: e.puede_cargar_alumno ?? null,
    }));

    // Combinar y filtrar
    let todasLasActividades = [...rutinas, ...evaluacionesRm, ...evaluacionesFms].sort(
      (a, b) => timestampFechaLocal(b.fecha) - timestampFechaLocal(a.fecha)
    );

    if (!mostrarCompletados) {
      todasLasActividades = todasLasActividades.filter(
        (actividad) => !actividad.completada
      );
    }

    setPlanificacion(todasLasActividades);
    setCargando(false);
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-10 w-32 rounded-xl bg-zinc-900 animate-pulse" />
          <div className="h-24 rounded-3xl bg-zinc-900 animate-pulse" />
          <div className="h-24 rounded-3xl bg-zinc-900 animate-pulse" />
          <div className="h-24 rounded-3xl bg-zinc-900 animate-pulse" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <BackButton fallback="/alumnos" />

          <section className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6">
            <p className="text-red-300 font-semibold">No pudimos cargar la planificación</p>
            <p className="text-zinc-400 mt-2">{error}</p>
          </section>
        </div>
      </main>
    );
  }

  const rutinasPendientes = planificacion.filter((actividad) => actividad.tipo === "rutina").length;
  const evaluacionesPendientes = planificacion.filter((actividad) => actividad.tipo === "evaluacion").length;

  return (
    <main className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton fallback="/alumnos" />

        <header>
          <p className="text-sm text-zinc-500">Alumno</p>
          <h1 className="text-3xl font-bold">Planificación</h1>
          <p className="text-zinc-400 mt-2">
            Rutinas y evaluaciones del alumno ordenadas por fecha.
          </p>
        </header>

        <section className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarCompletados}
                onChange={(e) => setMostrarCompletados(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-black"
              />
              <span className="text-sm text-zinc-300">
                Ver entrenamientos completados
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-sm text-zinc-400">Rutinas</p>
              <p className="text-3xl font-bold mt-1">{rutinasPendientes}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-sm text-zinc-400">Evaluaciones</p>
              <p className="text-3xl font-bold mt-1">{evaluacionesPendientes}</p>
            </div>
          </div>
        </section>

        {planificacion.length === 0 ? (
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-xl font-bold">
              {mostrarCompletados ? "No hay actividades" : "Todo al día"}
            </h2>
            <p className="text-zinc-400 mt-2">
              {mostrarCompletados
                ? "Este alumno no tiene actividades registradas."
                : "No tenés rutinas ni evaluaciones pendientes por el momento."}
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {planificacion.map((actividad, index) => {
              const esActividadActual = index === 0;
              const contenidoTarjeta = (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-3xl">{obtenerIconoActividad(actividad)}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-zinc-400">
                          {obtenerEtiquetaActividad(actividad)}
                        </p>
                        {actividad.completada && (
                          <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                            Completado
                          </span>
                        )}
                        {!actividad.completada && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              esActividadActual
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-zinc-800/80 text-zinc-400 border border-zinc-700"
                            }`}
                          >
                            {esActividadActual ? "Actual" : "Pendiente"}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl font-bold mt-1 truncate">
                        {actividad.nombre}
                      </h2>
                      <p className="text-sm text-zinc-500 mt-1">
                        Fecha: {formatearFechaCorta(actividad.fecha)}
                      </p>
                      {!esActividadActual && !actividad.completada && (
                        <p className="text-sm text-zinc-600 mt-2">
                          Disponible después de completar la actividad anterior.
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-zinc-500 text-2xl">
                    {esActividadActual && !actividad.completada ? "›" : ""}
                  </span>
                </div>
              );

              if (esActividadActual && !actividad.completada) {
                return (
                  <a
                    key={`${actividad.tipo}-${actividad.subtipo || "general"}-${actividad.id}`}
                    href={actividad.href}
                    className="block rounded-3xl border border-emerald-800/70 bg-emerald-950/20 p-5 hover:border-emerald-500/80"
                  >
                    {contenidoTarjeta}
                  </a>
                );
              }

              if (esActividadActual && actividad.tipo === "evaluacion") {
                return (
                  <button
                    key={`${actividad.tipo}-${actividad.subtipo || "general"}-${actividad.id}`}
                    type="button"
                    onClick={() =>
                      setModalEvaluacion({
                        open: true,
                        id: actividad.id,
                        subtipo: (actividad.subtipo as "rm" | "fms") || "rm",
                      })
                    }
                    className="block w-full text-left rounded-3xl border border-emerald-800/70 bg-emerald-950/20 p-5 hover:border-emerald-500/80"
                  >
                    {contenidoTarjeta}
                  </button>
                );
              }

              return (
                <article
                  key={`${actividad.tipo}-${actividad.subtipo || "general"}-${actividad.id}`}
                  className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5 opacity-80"
                >
                  {contenidoTarjeta}
                </article>
              );
            })}
          </section>
        )}

        {modalEvaluacion?.open && (
          <VerEvaluacionModal
            open={modalEvaluacion.open}
            onClose={() => setModalEvaluacion(null)}
            evaluacionId={modalEvaluacion.id}
            subtipo={modalEvaluacion.subtipo}
          />
        )}
      </div>
    </main>
  );
}
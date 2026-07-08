"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import {
  obtenerPendientesAlumno,
  type PendienteAlumno,
} from "@/lib/alumno/obtenerPendientesAlumnos";
import { parseFechaLocal, formatearFechaCorta } from "@/lib/utils/formatearFecha";
import VerEvaluacionModal from "@/components/alumno/VerEvaluacionModal";
import VerRutinaModal from "@/components/alumno/VerRutinaModal";

function obtenerEtiquetaActividad(actividad: PendienteAlumno) {
  if (actividad.tipo === "rutina") return "Rutina";
  if (actividad.subtipo) return `Evaluación ${actividad.subtipo.toUpperCase()}`;
  return "Evaluación";
}

function obtenerIconoActividad(actividad: PendienteAlumno) {
  return actividad.tipo === "rutina" ? "🏋️" : "📋";
}

function obtenerHrefActividad(actividad: PendienteAlumno) {
  if (actividad.tipo === "rutina") {
    return `/alumno/rutina/${actividad.id}`;
  }

  return actividad.href;
}

function obtenerTimestampActividad(actividad: PendienteAlumno) {
  if (!actividad.fecha) return Number.MAX_SAFE_INTEGER;

  const timestamp = parseFechaLocal(actividad.fecha)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export default function NuevaRutinaPlanificacionPage() {
  const [cargando, setCargando] = useState(true);
  const [planificacion, setPlanificacion] = useState<PendienteAlumno[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalEvaluacion, setModalEvaluacion] = useState<{
    open: boolean;
    id: string;
    subtipo: "rm" | "fms";
  } | null>(null);
  const [modalRutina, setModalRutina] = useState<{
    open: boolean;
    id: string;
    completada: boolean;
  } | null>(null);

  useEffect(() => {
    cargarPlanificacion();
  }, []);

  async function cargarPlanificacion() {
    setCargando(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    if (!user) {
      setError("No se pudo validar tu sesi\u00f3n.");
      setCargando(false);
      return;
    }

    const { data: alumnoData, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("user_id", user.id)
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

    const resumenPendientes = await obtenerPendientesAlumno(supabase, alumnoData.id);
    const pendientesOrdenados = [...resumenPendientes.pendientes].sort(
      (a, b) => obtenerTimestampActividad(a) - obtenerTimestampActividad(b)
    );

    setPlanificacion(pendientesOrdenados);
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
        <BackButton fallback="/alumno/rutina" />

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
        <BackButton fallback="/alumno/rutina" />

        <header>
          <p className="text-sm text-zinc-500">Alumno</p>
          <h1 className="text-3xl font-bold">Planificación</h1>
          <p className="text-zinc-400 mt-2">
            Tus rutinas y evaluaciones pendientes ordenadas por fecha.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm text-zinc-400">Rutinas pendientes</p>
            <p className="text-3xl font-bold mt-1">{rutinasPendientes}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm text-zinc-400">Evaluaciones pendientes</p>
            <p className="text-3xl font-bold mt-1">{evaluacionesPendientes}</p>
          </div>
        </section>

        {planificacion.length === 0 ? (
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-xl font-bold">Todo al día</h2>
            <p className="text-zinc-400 mt-2">
              No tenés rutinas ni evaluaciones pendientes por el momento.
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
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            esActividadActual && actividad.tipo === "evaluacion" && actividad.puedeCargarAlumno
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : actividad.tipo === "evaluacion" && !actividad.puedeCargarAlumno
                                ? "bg-orange-500/15 text-orange-300 border border-orange-500/30"
                                : esActividadActual
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : "bg-zinc-800/80 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {esActividadActual && actividad.tipo === "evaluacion" && actividad.puedeCargarAlumno
                            ? "Realizar ahora"
                            : actividad.tipo === "evaluacion" && !actividad.puedeCargarAlumno
                              ? "Solo la puede realizar el profesor"
                              : esActividadActual
                                ? "Realizar ahora"
                                : "Pendiente"}
                        </span>
                      </div>

                      <h2 className="text-xl font-bold mt-1 truncate">
                        {actividad.nombre}
                      </h2>
                      <p className="text-sm text-zinc-500 mt-1">
                        Fecha: {formatearFechaCorta(actividad.fecha)}
                      </p>
                      {!esActividadActual && (
                        <p className="text-sm text-zinc-600 mt-2">
                          Disponible después de completar la actividad anterior.
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-zinc-500 text-2xl">
                    {esActividadActual ? "›" : ""}
                  </span>
                </div>
              );

              const esRutina = actividad.tipo === "rutina";
              const key = `${actividad.tipo}-${actividad.subtipo || "general"}-${actividad.id}`;

              if (esActividadActual && actividad.tipo === "evaluacion" && !actividad.puedeCargarAlumno) {
                return (
                  <div key={key} className="block rounded-3xl border border-emerald-800/70 bg-emerald-950/20 p-5">
                    <button
                      type="button"
                      onClick={() =>
                        setModalEvaluacion({
                          open: true,
                          id: actividad.id,
                          subtipo: (actividad.subtipo as "rm" | "fms") || "rm",
                        })
                      }
                      className="w-full text-left"
                    >
                      {contenidoTarjeta}
                    </button>
                    {esRutina && (
                      <button
                        type="button"
                        onClick={() => setModalRutina({ open: true, id: actividad.id, completada: false })}
                        className="mt-3 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                      >
                        Ver detalles
                      </button>
                    )}
                  </div>
                );
              }

              if (esActividadActual) {
                return (
                  <div key={key} className="block rounded-3xl border border-emerald-800/70 bg-emerald-950/20 p-5">
                    <Link href={obtenerHrefActividad(actividad)} className="block">
                      {contenidoTarjeta}
                    </Link>
                    {esRutina && (
                      <button
                        type="button"
                        onClick={() => setModalRutina({ open: true, id: actividad.id, completada: false })}
                        className="mt-3 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                      >
                        Ver detalles
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div key={key} className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5 opacity-80">
                  <article>
                    {contenidoTarjeta}
                  </article>
                  {esRutina && (
                    <button
                      type="button"
                      onClick={() => setModalRutina({ open: true, id: actividad.id, completada: false })}
                      className="mt-3 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                    >
                      Ver detalles
                    </button>
                  )}
                </div>
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

        {modalRutina?.open && (
          <VerRutinaModal
            open={modalRutina.open}
            onClose={() => setModalRutina(null)}
            asignacionId={modalRutina.id}
            completada={modalRutina.completada}
          />
        )}
      </div>
    </main>
  );
}

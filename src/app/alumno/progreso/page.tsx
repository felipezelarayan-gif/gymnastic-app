"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getRolCached } from "@/lib/rol-cache";
import BackButton from "@/components/BackButton";
import { obtenerRMsActualesAlumno, type RMActualCalculado } from "@/lib/rmActual";
import { obtenerMetricasResumen } from "@/lib/alumno/obtenerMetricasResumen";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import { useToast } from "@/components/ui/ToastProvider";
import VerRutinaModal from "@/components/alumno/VerRutinaModal";

type Alumno = {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
};

type Ejercicio = {
  id: string;
  nombre: string;
};

type RutinaReciente = {
  id: string;
  rutina_id: string;
  fecha_completada: string | null;
  rutinas: {
    nombre: string | null;
  } | null;
};

export default function MisProgresosPage() {
  const [loading, setLoading] = useState(true);

  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [rmsActuales, setRmsActuales] = useState<RMActualCalculado[]>([]);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);

  // Números del header (desde counts)
  const [rutinasCompletadas, setRutinasCompletadas] = useState(0);
  const [ejerciciosCompletados, setEjerciciosCompletados] = useState(0);
  const [evaluacionesCompletadas, setEvaluacionesCompletadas] = useState(0);
  const [ultimoEntrenamiento, setUltimoEntrenamiento] = useState<string | null>(null);

  // Últimas rutinas completadas
  const [rutinasRecientes, setRutinasRecientes] = useState<RutinaReciente[]>([]);

  const [mostrarTodosRM, setMostrarTodosRM] = useState(false);
  const [modalRutina, setModalRutina] = useState<{
    open: boolean;
    id: string;
    completada: boolean;
  } | null>(null);
  const { formatearFechaCorta } = useFormatoFecha();
  const { mostrarToast } = useToast();

  async function cargarDatos() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const user = sessionData.session.user;

    const rol = await getRolCached(user.id);

    if (rol !== "alumno") {
      window.location.href = "/";
      return;
    }

    const { data: alumnoData, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id,nombre,apellido")
      .eq("user_id", user.id)
      .single();

    if (alumnoError || !alumnoData) {
      mostrarToast(alumnoError?.message || "No se pudo cargar el alumno.", "error");
      setLoading(false);
      return;
    }

    // ETAPA 2: Métricas + RMS + Rutinas recientes en paralelo
    const [
      metricasResumen,
      ultimoResult,
      rmsResult,
      rutinasRecientesResult,
    ] = await Promise.all([
      // Métricas compartidas con /alumno (ejercicios + rutinas completadas)
      obtenerMetricasResumen(supabase, alumnoData.id),
      // Último entrenamiento
      supabase
        .from("registros_entrenamiento")
        .select("created_at")
        .eq("alumno_id", alumnoData.id)
        .eq("completado", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // RMS (sin cambios)
      obtenerRMsActualesAlumno(alumnoData.id),
      // Últimas 5 rutinas completadas
      supabase
        .from("rutina_asignaciones")
        .select(`
          id,
          rutina_id,
          fecha_completada,
          rutinas (nombre)
        `)
        .eq("alumno_id", alumnoData.id)
        .eq("completada", true)
        .order("fecha_completada", { ascending: false })
        .limit(5),
    ]);

    const rmsCalculados = rmsResult.data || [];
    const rmsError = rmsResult.error;

    if (rmsError) {
      mostrarToast(rmsError.message, "error");
      setLoading(false);
      return;
    }

    // ETAPA 3: Ejercicios (depende de RMS)
    const idsEjercicios = Array.from(
      new Set((rmsCalculados || []).map((rm) => rm.ejercicio_id).filter(Boolean))
    );

    let ejerciciosData: Ejercicio[] = [];
    if (idsEjercicios.length > 0) {
      const { data } = await supabase
        .from("ejercicios")
        .select("id,nombre")
        .in("id", idsEjercicios);
      ejerciciosData = data || [];
    }

    // Normalizar rutinas recientes
    const rutinasData = (rutinasRecientesResult.data || []).map((r: any) => ({
      ...r,
      rutinas: Array.isArray(r.rutinas) ? r.rutinas[0] || null : r.rutinas,
    })) as RutinaReciente[];

    // Agrupar todos los setState para reducir renders
    setAlumno(alumnoData);
    setRmsActuales(rmsCalculados);
    setEjercicios(ejerciciosData);
    setEjerciciosCompletados(metricasResumen.ejerciciosCompletados);
    setRutinasCompletadas(metricasResumen.rutinasCompletadas);
    setEvaluacionesCompletadas(metricasResumen.evaluacionesCompletadas);
    setUltimoEntrenamiento(ultimoResult.data?.created_at || null);
    setRutinasRecientes(rutinasData);
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      cargarDatos();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const rmsMostrados = rmsActuales.slice(0, 5);

  function nombreEjercicio(ejercicioId: string) {
    const ejercicio = ejercicios.find((item) => item.id === ejercicioId);
    return ejercicio?.nombre || "Ejercicio";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
        <div className="max-w-5xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />

          <div className="mb-6 space-y-3">
            <div className="h-9 w-56 rounded bg-zinc-800" />
            <div className="h-4 w-40 rounded bg-zinc-800" />
          </div>

          {/* Header numbers skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800" />
          </div>

          {/* Mis mejores marcas skeleton */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mt-5">
            <div className="h-7 w-48 rounded bg-zinc-800 mb-4" />
            <div className="space-y-3">
              <div className="h-16 rounded-xl bg-zinc-950/40 border border-zinc-800" />
              <div className="h-16 rounded-xl bg-zinc-950/40 border border-zinc-800" />
            </div>
          </div>

          {/* Rutinas recientes skeleton */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mt-5">
            <div className="h-7 w-56 rounded bg-zinc-800 mb-4" />
            <div className="space-y-3">
              <div className="h-16 rounded-xl bg-zinc-950/40 border border-zinc-800" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      <div className="max-w-5xl mx-auto">
        <BackButton fallback="/alumno" />

        <header className="mt-6 mb-6">
          <h1 className="text-3xl font-bold">📈 Mis progresos</h1>

          <p className="text-zinc-400 mt-2">
            {alumno?.nombre} {alumno?.apellido || ""}
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-zinc-400 text-sm">Rutinas completadas</p>
            <p className="text-3xl font-bold mt-2">{rutinasCompletadas}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-zinc-400 text-sm">Evaluaciones completadas</p>
            <p className="text-3xl font-bold mt-2">{evaluacionesCompletadas}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-zinc-400 text-sm">Ejercicios completados</p>
            <p className="text-3xl font-bold mt-2">{ejerciciosCompletados}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-zinc-400 text-sm">Último entrenamiento</p>
            <p className="text-2xl font-bold mt-2">
              {formatearFechaCorta(ultimoEntrenamiento)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-bold">🏆 Mis mejores marcas</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Se muestran los RM vigentes calculados por la regla central del sistema.
              </p>
            </div>

            {rmsActuales.length > 5 && (
              <button
                type="button"
                onClick={() => setMostrarTodosRM(true)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
              >
                Ver todos ({rmsActuales.length})
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
                        Actualizado: {formatearFechaCorta(rm.actualizado_en)}
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
              <h2 className="text-2xl font-bold">📝 Últimas rutinas completadas</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Las últimas 5 rutinas que completaste.
              </p>
            </div>

            <Link
              href="/alumno/rutina/historial"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Ver historial
            </Link>
          </div>

          {rutinasRecientes.length === 0 ? (
            <p className="text-zinc-500">
              Todavía no hay rutinas completadas.
            </p>
          ) : (
            <div className="space-y-3">
              {rutinasRecientes.map((rutina) => (
                <div
                  key={rutina.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        🏋️ {rutina.rutinas?.nombre || "Rutina"}
                      </h3>
                      <p className="text-zinc-500 text-sm">
                        Completada: {formatearFechaCorta(rutina.fecha_completada)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModalRutina({ open: true, id: rutina.id, completada: true })}
                      className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 shrink-0"
                    >
                      Ver detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modal de todos los RM */}
        {mostrarTodosRM && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold">🏆 Todas las marcas</h2>
                <button
                  type="button"
                  onClick={() => setMostrarTodosRM(false)}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto space-y-3 pr-1">
                {rmsActuales.length === 0 ? (
                  <p className="text-zinc-500">Todavía no hay RM registrados.</p>
                ) : (
                  rmsActuales.map((rm, index) => (
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
                            Actualizado: {formatearFechaCorta(rm.actualizado_en)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
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
                  ))
                )}
              </div>
            </div>
          </div>
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
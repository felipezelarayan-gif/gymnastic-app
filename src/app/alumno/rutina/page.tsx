"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { supabase } from "@/lib/supabase";
import {
  obtenerPendientesAlumno,
  type PendienteAlumno,
} from "@/lib/alumno/obtenerPendientesAlumnos";
import { parseFechaLocal, formatearFechaCorta } from "@/lib/utils/formatearFecha";
import VerEvaluacionModal from "@/components/alumno/VerEvaluacionModal";
import WeeklyDatePicker from "@/components/alumno/WeeklyDatePicker";
import { useToast } from "@/components/ui/ToastProvider";

function getTipoDisplay(actividad: PendienteAlumno) {
  if (actividad.tipo === "rutina") return "Rutina";
  if (actividad.subtipo) return `Evaluaci\u00f3n ${actividad.subtipo.toUpperCase()}`;
  return "Evaluaci\u00f3n";
}

function obtenerTimestampActividad(actividad: PendienteAlumno) {
  if (!actividad.fecha) return Number.MAX_SAFE_INTEGER;
  const timestamp = parseFechaLocal(actividad.fecha)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

// Normaliza cualquier fecha a YYYY-MM-DD
function normalizarFecha(fecha?: string | null): string | null {
  if (!fecha) return null;
  return fecha.split("T")[0];
}

function hoyKey(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function NuevaRutinaPage() {
  const { mostrarToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<PendienteAlumno[]>([]);
  const [completadas, setCompletadas] = useState<PendienteAlumno[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalEvaluacion, setModalEvaluacion] = useState<{
    open: boolean;
    id: string;
    subtipo: "rm" | "fms";
  } | null>(null);
  const [mostrarVencidasModal, setMostrarVencidasModal] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }
      const { data: alumnoRows, error: alumnoError } = await supabase
        .from("alumnos")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (alumnoError || !alumnoRows) {
        setError("No se pudo encontrar el alumno vinculado a este usuario.");
        setLoading(false);
        return;
      }
      const resumenPendientes = await obtenerPendientesAlumno(supabase, alumnoRows.id);
      setPendientes(resumenPendientes.pendientes || []);

      // Obtener actividades completadas
      const [rutinasCompletadas, evaluacionesRmCompletadas, evaluacionesFmsCompletadas] = await Promise.all([
        supabase
          .from("rutina_asignaciones")
          .select("id, fecha_asignacion, rutinas(nombre)")
          .eq("alumno_id", alumnoRows.id)
          .eq("completada", true),
        supabase
          .from("evaluaciones_rm")
          .select("id, nombre, estado, fecha_asignacion, created_at")
          .eq("alumno_id", alumnoRows.id)
          .in("estado", ["completada", "cargado"]),
        supabase
          .from("evaluaciones_fms")
          .select("id, estado, fecha_asignacion, created_at")
          .eq("alumno_id", alumnoRows.id)
          .in("estado", ["completada", "cargado"]),
      ]);

      const completadasArray: PendienteAlumno[] = [];

      (rutinasCompletadas.data || []).forEach((r: any) => {
        if (r.fecha_asignacion) {
          completadasArray.push({
            id: r.id,
            tipo: "rutina",
            nombre: r.rutinas?.nombre || "Rutina",
            href: "#",
            fecha: normalizarFecha(r.fecha_asignacion),
          });
        }
      });

      (evaluacionesRmCompletadas.data || []).forEach((e: any) => {
        const fecha = normalizarFecha(e.fecha_asignacion || e.created_at);
        if (fecha) {
          completadasArray.push({
            id: e.id,
            tipo: "evaluacion",
            subtipo: "rm",
            nombre: e.nombre || "Evaluación RM",
            href: "#",
            fecha,
          });
        }
      });

      (evaluacionesFmsCompletadas.data || []).forEach((e: any) => {
        const fecha = normalizarFecha(e.fecha_asignacion || e.created_at);
        if (fecha) {
          completadasArray.push({
            id: e.id,
            tipo: "evaluacion",
            subtipo: "fms",
            nombre: "Evaluación FMS",
            href: "#",
            fecha,
          });
        }
      });

      setCompletadas(completadasArray);
    } catch (e) {
      setError("Ocurrio un error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Fechas con actividades vencidas (punto rojo)
  const overdueDates = useMemo(() => {
    const hoy = hoyKey();
    const dates = new Set<string>();
    pendientes.forEach((p) => {
      const fecha = normalizarFecha(p.fecha);
      if (fecha && fecha < hoy) dates.add(fecha);
    });
    return Array.from(dates);
  }, [pendientes]);

  // Fechas con actividades pendientes no vencidas (punto naranja)
  const pendingDates = useMemo(() => {
    const overdueSet = new Set(overdueDates);
    const dates = new Set<string>();
    pendientes.forEach((p) => {
      const fecha = normalizarFecha(p.fecha);
      if (fecha && !overdueSet.has(fecha)) dates.add(fecha);
    });
    return Array.from(dates);
  }, [pendientes, overdueDates]);

  // Fechas con actividades completadas (punto gris)
  const completedDates = useMemo(() => {
    const dates = new Set<string>();
    completadas.forEach((c) => {
      const fecha = normalizarFecha(c.fecha);
      if (fecha) dates.add(fecha);
    });
    return Array.from(dates);
  }, [completadas]);

  // Actividades filtradas por la fecha seleccionada
  const selectedDateKey = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const actividadesDelDia = useMemo(() => {
    return pendientes.filter((p) => normalizarFecha(p.fecha) === selectedDateKey);
  }, [pendientes, selectedDateKey]);

  // Stats generales
  const pendientesOrdenados = [...pendientes].sort(
    (a, b) => obtenerTimestampActividad(a) - obtenerTimestampActividad(b)
  );
  const rutinasPendientes = pendientesOrdenados.filter(p => p.tipo === "rutina").length;
  const evaluacionesPendientes = pendientesOrdenados.filter(p => p.tipo !== "rutina").length;
  const proximoGlobal = pendientesOrdenados.length > 0 ? pendientesOrdenados[0] : null;

  // Si hay vencidas, solo se pueden hacer rutinas de hoy o pasado.
  // Si no hay vencidas, se puede hacer la siguiente rutina (aunque sea futura).
  const hayVencidas = overdueDates.length > 0;
  const sePuedeRealizar = (fecha: string | null | undefined): boolean => {
    if (!fecha) return true;
    if (!hayVencidas) return true; // todo al día, se puede hacer cualquier pendiente
    return fecha <= hoyKey(); // hay vencidas, solo hoy y pasado
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8 animate-pulse">
        <div className="h-8 w-24 rounded bg-zinc-800" />
        <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
        <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
          <div className="h-6 w-48 rounded bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-zinc-800" />
            <div className="h-6 w-64 rounded bg-zinc-800" />
            <div className="h-4 w-40 rounded bg-zinc-800" />
            <div className="h-10 w-40 rounded-lg bg-zinc-800 mt-4" />
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
          <div className="h-6 w-36 rounded bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-4 w-56 rounded bg-zinc-800" />
            <div className="h-4 w-56 rounded bg-zinc-800" />
            <div className="h-10 w-28 rounded-lg bg-zinc-800 mt-3" />
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
          <div className="h-6 w-28 rounded bg-zinc-800" />
          <div className="h-4 w-72 rounded bg-zinc-800" />
          <div className="h-10 w-32 rounded-lg bg-zinc-800 mt-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <BackButton fallback="/alumno" />

      {/* Weekly Date Picker */}
      <WeeklyDatePicker
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        pendingDates={pendingDates}
        completedDates={completedDates}
        overdueDates={overdueDates}
      />

      <div className="md:grid md:grid-cols-3 md:gap-6 space-y-6 md:space-y-0">
        {/* Columna izquierda: Actividades del día (2/3 en desktop) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">
              {formatearFechaCorta(selectedDateKey) || "Hoy"}
            </h2>
            {error ? (
              <div className="text-red-400">{error}</div>
            ) : actividadesDelDia.length > 0 ? (
              <div className="space-y-3">
                {actividadesDelDia.map((actividad) => (
                  <div
                    key={`${actividad.tipo}-${actividad.subtipo || ""}-${actividad.id}`}
                    className="border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-0.5">
                          {getTipoDisplay(actividad)}
                        </div>
                        <div className="text-lg font-bold text-zinc-100">{actividad.nombre}</div>
                        {actividad.fecha && (
                          <div className="text-sm text-zinc-400 mt-1">
                            {formatearFechaCorta(actividad.fecha)}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {actividad.tipo === "rutina" ? (
                          sePuedeRealizar(actividad.fecha) ? (
                            <Link
                              href={`/alumno/rutina/${actividad.id}`}
                              className="inline-block px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition text-sm"
                            >
                              Comenzar
                            </Link>
                          ) : (
                            <span
                              className="inline-block px-4 py-2 rounded-lg bg-zinc-800 text-zinc-500 text-sm cursor-pointer hover:bg-zinc-700 transition"
                              onClick={() => mostrarToast("Completá primero las rutinas pendientes de días anteriores antes de empezar esta.", "info")}
                            >
                              Pendiente
                            </span>
                          )
                        ) : actividad.puedeCargarAlumno ? (
                          <Link
                            href={actividad.href}
                            className="inline-block px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition text-sm"
                          >
                            Realizar
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setModalEvaluacion({
                                open: true,
                                id: actividad.id,
                                subtipo: (actividad.subtipo as "rm" | "fms") || "rm",
                              })
                            }
                            className="inline-block px-4 py-2 rounded-lg bg-zinc-700 text-white font-semibold hover:bg-zinc-600 transition text-sm"
                          >
                            Ver
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-zinc-500 text-sm">No hay actividades para este día.</div>
            )}
          </div>
        </div>

        {/* Columna derecha: Planificacion + Historial (1/3 en desktop) */}
        {!error && (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-xl p-4 shadow space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-100">Planificacion</h2>
                {hayVencidas && (
                  <button
                    type="button"
                    onClick={() => setMostrarVencidasModal(true)}
                    className="text-red-400 hover:text-red-300 transition text-sm leading-none border border-red-500/50 px-2 py-0.5 rounded-lg"
                    title="Rutinas vencidas"
                  >
                    ❗
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-0.5 text-sm text-zinc-300">
                <span>Rutinas pendientes <span className="font-semibold text-zinc-100">({rutinasPendientes})</span></span>
                <span>Evaluaciones pendientes <span className="font-semibold text-zinc-100">({evaluacionesPendientes})</span></span>
              </div>
              <Link
                href="/alumno/rutina/planificacion"
                className={`inline-block mt-1 px-3 py-1.5 rounded-lg font-semibold border transition text-sm ${
                  hayVencidas
                    ? "bg-red-950/20 text-red-300 border-red-800/60 hover:bg-red-950/40"
                    : "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                }`}
              >
                Ver mas
              </Link>
            </div>

            <div className="bg-zinc-900 rounded-xl p-4 shadow space-y-2">
              <h2 className="text-lg font-semibold text-zinc-100">Historial</h2>
              <p className="text-xs text-zinc-400">
                Consulta aqui tu historial de rutinas y evaluaciones completadas.
              </p>
              <Link
                href="/alumno/rutina/historial"
                className="inline-block mt-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 font-semibold border border-zinc-700 hover:bg-zinc-700 transition text-sm"
              >
                Ver historial
              </Link>
            </div>
          </div>
        )}
      </div>

      {modalEvaluacion?.open && (
        <VerEvaluacionModal
          open={modalEvaluacion.open}
          onClose={() => setModalEvaluacion(null)}
          evaluacionId={modalEvaluacion.id}
          subtipo={modalEvaluacion.subtipo}
        />
      )}

      {/* Modal de rutinas vencidas */}
      {mostrarVencidasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-red-800/60 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">❗</span>
              <h2 className="text-2xl font-bold text-red-400">Rutinas vencidas</h2>
            </div>

            <p className="text-zinc-300 text-sm leading-relaxed mb-4">
              Hay <strong className="text-red-400">{overdueDates.length} rutina(s)</strong> que no se completaron en su fecha asignada.
            </p>

            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 mb-5">
              <p className="text-xs text-red-300/90 leading-relaxed">
                Completá primero las rutinas vencidas para poder acceder a las siguientes.
                Las rutinas con fecha futura estarán bloqueadas hasta que estés al día.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMostrarVencidasModal(false)}
              className="w-full rounded-xl border border-red-800/60 py-3 text-sm font-semibold text-red-300 hover:bg-red-950/40 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

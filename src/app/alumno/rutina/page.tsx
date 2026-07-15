
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

export default function NuevaRutinaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<PendienteAlumno[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalEvaluacion, setModalEvaluacion] = useState<{
    open: boolean;
    id: string;
    subtipo: "rm" | "fms";
  } | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        setError("No se pudo obtener el usuario actual.");
        setLoading(false);
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
    } catch (e) {
      setError("Ocurrio un error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Fechas que tienen actividades (para los puntitos en el calendar)
  const datesWithActivity = useMemo(() => {
    const dates = new Set<string>();
    pendientes.forEach((p) => {
      const fecha = normalizarFecha(p.fecha);
      if (fecha) dates.add(fecha);
    });
    return Array.from(dates);
  }, [pendientes]);

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
        datesWithActivity={datesWithActivity}
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
                          <Link
                            href={`/alumno/rutina/${actividad.id}`}
                            className="inline-block px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition text-sm"
                          >
                            Comenzar
                          </Link>
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
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
              <h2 className="text-xl font-semibold text-zinc-100 mb-2">Planificacion</h2>
              <div className="flex flex-col gap-1 text-zinc-300">
                <span>Rutinas pendientes <span className="font-semibold text-zinc-100">({rutinasPendientes})</span></span>
                <span>Evaluaciones pendientes <span className="font-semibold text-zinc-100">({evaluacionesPendientes})</span></span>
              </div>
              <Link
                href="/alumno/rutina/planificacion"
                className="inline-block mt-3 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 font-semibold border border-zinc-700 hover:bg-zinc-700 transition"
              >
                Ver mas
              </Link>
            </div>

            <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
              <h2 className="text-xl font-semibold text-zinc-100 mb-2">Historial</h2>
              <div className="text-zinc-300 mb-3">
                Consulta aqui tu historial de rutinas y evaluaciones completadas.
              </div>
              <Link
                href="/alumno/rutina/historial"
                className="inline-block mt-3 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 font-semibold border border-zinc-700 hover:bg-zinc-700 transition"
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
    </div>
  );
}

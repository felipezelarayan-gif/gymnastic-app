"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { usePageTitle } from "@/lib/usePageTitle";
import { supabase } from "@/lib/supabase";
import {
  obtenerPendientesAlumno,
  type PendienteAlumno,
} from "@/lib/alumno/obtenerPendientesAlumnos";
import { parseFechaLocal, formatearFechaCorta } from "@/lib/utils/formatearFecha";
import VerEvaluacionModal from "@/components/alumno/VerEvaluacionModal";
import VerRutinaModal from "@/components/alumno/VerRutinaModal";
import WeeklyDatePicker from "@/components/alumno/WeeklyDatePicker";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";

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
  usePageTitle("alumnoRutina");
  const { mostrarToast } = useToast();
  const { t } = useIdioma();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<PendienteAlumno[]>([]);
  const [completadas, setCompletadas] = useState<PendienteAlumno[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalEvaluacion, setModalEvaluacion] = useState<{
    open: boolean;
    id: string;
    subtipo: "rm" | "fms";
    completada?: boolean;
  } | null>(null);
  const [modalRutinaCompletada, setModalRutinaCompletada] = useState<{
    asignacionId: string;
  } | null>(null);
  const [mostrarVencidasModal, setMostrarVencidasModal] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data: alumnoRows, error: alumnoError } = await supabase.from("alumnos").select("id").eq("user_id", user.id).limit(1).maybeSingle();
      if (alumnoError || !alumnoRows) { setError("No se pudo encontrar el alumno vinculado a este usuario."); setLoading(false); return; }
      const resumenPendientes = await obtenerPendientesAlumno(supabase, alumnoRows.id);
      setPendientes(resumenPendientes.pendientes || []);

      const [rutinasCompletadas, evaluacionesRmCompletadas, evaluacionesFmsCompletadas] = await Promise.all([
        supabase.from("rutina_asignaciones").select("id, fecha_asignacion, rutinas(nombre)").eq("alumno_id", alumnoRows.id).eq("completada", true),
        supabase.from("evaluaciones_rm").select("id, nombre, estado, fecha_asignacion, created_at").eq("alumno_id", alumnoRows.id).in("estado", ["completada", "cargado"]),
        supabase.from("evaluaciones_fms").select("id, estado, fecha_asignacion, created_at").eq("alumno_id", alumnoRows.id).in("estado", ["completada", "cargado"]),
      ]);

      const completadasArray: PendienteAlumno[] = [];
      (rutinasCompletadas.data || []).forEach((r: any) => {
        if (r.fecha_asignacion) completadasArray.push({ id: r.id, tipo: "rutina", nombre: r.rutinas?.nombre || "Rutina", href: "#", fecha: normalizarFecha(r.fecha_asignacion) });
      });
      (evaluacionesRmCompletadas.data || []).forEach((e: any) => {
        const fecha = normalizarFecha(e.fecha_asignacion || e.created_at);
        if (fecha) completadasArray.push({ id: e.id, tipo: "evaluacion", subtipo: "rm", nombre: e.nombre || "Evaluación RM", href: "#", fecha });
      });
      (evaluacionesFmsCompletadas.data || []).forEach((e: any) => {
        const fecha = normalizarFecha(e.fecha_asignacion || e.created_at);
        if (fecha) completadasArray.push({ id: e.id, tipo: "evaluacion", subtipo: "fms", nombre: "Evaluación FMS", href: "#", fecha });
      });
      setCompletadas(completadasArray);
    } catch (e) { setError("Ocurrio un error al cargar los datos."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  const overdueDates = useMemo(() => {
    const hoy = hoyKey();
    return Array.from(new Set(pendientes.filter((p) => { const f = normalizarFecha(p.fecha); return f && f < hoy; }).map((p) => normalizarFecha(p.fecha)).filter(Boolean) as string[]));
  }, [pendientes]);

  const pendingDates = useMemo(() => {
    const overdueSet = new Set(overdueDates);
    return Array.from(new Set(pendientes.filter((p) => { const f = normalizarFecha(p.fecha); return f && !overdueSet.has(f); }).map((p) => normalizarFecha(p.fecha)).filter(Boolean) as string[]));
  }, [pendientes, overdueDates]);

  const completedDates = useMemo(() => {
    return Array.from(new Set(completadas.map((c) => normalizarFecha(c.fecha)).filter(Boolean) as string[]));
  }, [completadas]);

  const selectedDateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  const actividadesDelDia = useMemo(() => pendientes.filter((p) => normalizarFecha(p.fecha) === selectedDateKey), [pendientes, selectedDateKey]);

  const completadasDelDia = useMemo(() => completadas.filter((c) => normalizarFecha(c.fecha) === selectedDateKey), [completadas, selectedDateKey]);

  const pendientesOrdenados = [...pendientes].sort((a, b) => obtenerTimestampActividad(a) - obtenerTimestampActividad(b));
  const rutinasPendientes = pendientesOrdenados.filter(p => p.tipo === "rutina").length;
  const evaluacionesPendientes = pendientesOrdenados.filter(p => p.tipo !== "rutina").length;
  const hayVencidas = overdueDates.length > 0;
  const sePuedeRealizar = (fecha: string | null | undefined): boolean => {
    if (!fecha) return true;
    if (!hayVencidas) return true;
    return fecha <= hoyKey();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8 animate-pulse">
        <div className="h-8 w-24 rounded bg-[#1E1E1E]" />
        <div className="h-32 rounded-xl bg-[#161616] border border-white/[0.07]" />
        <div className="bg-[#161616] rounded-xl p-6 space-y-3">
          <div className="h-6 w-48 rounded bg-[#1E1E1E]" />
          <div className="space-y-2"><div className="h-4 w-32 rounded bg-[#1E1E1E]" /><div className="h-6 w-64 rounded bg-[#1E1E1E]" /><div className="h-4 w-40 rounded bg-[#1E1E1E]" /><div className="h-10 w-40 rounded-lg bg-[#1E1E1E] mt-4" /></div>
        </div>
        <div className="bg-[#161616] rounded-xl p-6 space-y-3">
          <div className="h-6 w-36 rounded bg-[#1E1E1E]" />
          <div className="space-y-2"><div className="h-4 w-56 rounded bg-[#1E1E1E]" /><div className="h-4 w-56 rounded bg-[#1E1E1E]" /><div className="h-10 w-28 rounded-lg bg-[#1E1E1E] mt-3" /></div>
        </div>
        <div className="bg-[#161616] rounded-xl p-6 space-y-3">
          <div className="h-6 w-28 rounded bg-[#1E1E1E]" /><div className="h-4 w-72 rounded bg-[#1E1E1E]" /><div className="h-10 w-32 rounded-lg bg-[#1E1E1E] mt-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <BackButton fallback="/alumno" />

      <WeeklyDatePicker
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        pendingDates={pendingDates}
        completedDates={completedDates}
        overdueDates={overdueDates}
      />

      <div className="md:grid md:grid-cols-3 md:gap-6 space-y-6 md:space-y-0">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#161616] rounded-xl p-6 space-y-3">
            <h2 className="text-xl font-semibold text-[#F0F0F0] mb-2">
              {formatearFechaCorta(selectedDateKey) || "Hoy"}
            </h2>
            {error ? (
              <div className="text-red-400">{error}</div>
            ) : actividadesDelDia.length > 0 ? (
              <div className="space-y-3">
                {actividadesDelDia.map((actividad) => (
                  <div key={`${actividad.tipo}-${actividad.subtipo || ""}-${actividad.id}`} className="border border-white/[0.07] rounded-xl p-4 hover:border-[#08A66C]/20 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[#4a4a4a] mb-0.5">{getTipoDisplay(actividad)}</div>
                        <div className="text-lg font-bold text-[#F0F0F0]">{actividad.nombre}</div>
                        {actividad.fecha && <div className="text-sm text-[#7a7a7a] mt-1">{formatearFechaCorta(actividad.fecha)}</div>}
                      </div>
                      <div className="shrink-0">
                        {actividad.tipo === "rutina" ? (
                          sePuedeRealizar(actividad.fecha) ? (
                            <Link href={`/alumno/rutina/${actividad.id}`} className="inline-block px-4 py-2 rounded-lg bg-[#08A66C] text-[#0E0E0E] font-bold hover:brightness-110 transition text-sm">{t("alumno.comenzar")}</Link>
                          ) : (
                            <span className="inline-block px-4 py-2 rounded-lg bg-[#1E1E1E] text-[#4a4a4a] text-sm cursor-pointer hover:bg-[#252525] transition"
                              onClick={() => mostrarToast(t("alumno.completarPendientesPrimero"), "info")}>{t("alumno.pendiente")}</span>
                          )
                        ) : actividad.puedeCargarAlumno ? (
                          <Link href={actividad.href} className="inline-block px-4 py-2 rounded-lg bg-[#08A66C] text-[#0E0E0E] font-bold hover:brightness-110 transition text-sm">{t("alumno.realizar")}</Link>
                        ) : (
                          <button type="button" onClick={() => setModalEvaluacion({ open: true, id: actividad.id, subtipo: (actividad.subtipo as "rm" | "fms") || "rm" })}
                            className="inline-block px-4 py-2 rounded-lg bg-[#1E1E1E] text-[#F0F0F0] font-semibold hover:bg-[#252525] transition text-sm">{t("alumno.ver")}</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[#4a4a4a] text-sm">{t("alumno.sinActividades")}</div>
            )}

            {completadasDelDia.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-xs uppercase tracking-wide text-[#4a4a4a] font-semibold">{t("alumno.completadas")}</p>
                {completadasDelDia.map((actividad) => (
                  <div key={`${actividad.tipo}-${actividad.subtipo || ""}-${actividad.id}`} className="border border-white/[0.07] rounded-xl p-4 opacity-80">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-[#4a4a4a] mb-0.5">{getTipoDisplay(actividad)}</div>
                        <div className="text-lg font-bold text-[#F0F0F0]">{actividad.nombre}</div>
                        {actividad.fecha && <div className="text-sm text-[#7a7a7a] mt-1">{formatearFechaCorta(actividad.fecha)}</div>}
                      </div>
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (actividad.tipo === "rutina") {
                              setModalRutinaCompletada({ asignacionId: actividad.id });
                            } else {
                              setModalEvaluacion({ open: true, id: actividad.id, subtipo: (actividad.subtipo as "rm" | "fms") || "rm", completada: true });
                            }
                          }}
                          className="inline-block px-4 py-2 rounded-lg bg-[#1E1E1E] text-[#F0F0F0] font-semibold hover:bg-[#252525] transition text-sm"
                        >
                          {t("alumno.ver")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!error && (
          <div className="space-y-4">
            <div className="bg-[#161616] rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[#F0F0F0]">{t("alumno.planificacion")}</h2>
                {hayVencidas && (
                  <button type="button" onClick={() => setMostrarVencidasModal(true)} className="text-red-400 hover:text-red-300 transition text-sm leading-none border border-red-500/50 px-2 py-0.5 rounded-lg" title={t("alumno.rutinasVencidas")}>❗</button>
                )}
              </div>
              <div className="flex flex-col gap-0.5 text-sm text-[#7a7a7a]">
                <span>{t("alumno.rutinasPendientes")} <span className="font-semibold text-[#F0F0F0]">({rutinasPendientes})</span></span>
                <span>{t("alumno.evaluacionesPendientes")} <span className="font-semibold text-[#F0F0F0]">({evaluacionesPendientes})</span></span>
              </div>
              <Link href="/alumno/rutina/planificacion" className={`inline-block mt-1 px-3 py-1.5 rounded-lg font-semibold border transition text-sm ${hayVencidas ? "bg-red-950/20 text-red-300 border-red-800/60 hover:bg-red-950/40" : "bg-[#1E1E1E] text-[#F0F0F0] border-white/[0.07] hover:bg-[#252525]"}`}>
                {t("alumno.verMas")}
              </Link>
            </div>

            <div className="bg-[#161616] rounded-xl p-4 space-y-2">
              <h2 className="text-lg font-semibold text-[#F0F0F0]">{t("alumno.historial.titulo")}</h2>
              <p className="text-xs text-[#7a7a7a]">{t("alumno.historialDesc")}</p>
              <Link href="/alumno/rutina/historial" className="inline-block mt-1 px-3 py-1.5 rounded-lg bg-[#1E1E1E] text-[#F0F0F0] font-semibold border border-white/[0.07] hover:bg-[#252525] transition text-sm">
                {t("alumno.verHistorial")}
              </Link>
            </div>
          </div>
        )}
      </div>

      {modalEvaluacion?.open && (
        <VerEvaluacionModal open={modalEvaluacion.open} onClose={() => setModalEvaluacion(null)} evaluacionId={modalEvaluacion.id} subtipo={modalEvaluacion.subtipo} completada={modalEvaluacion.completada} vista="alumno" />
      )}

      {modalRutinaCompletada && (
        <VerRutinaModal open={true} onClose={() => setModalRutinaCompletada(null)} asignacionId={modalRutinaCompletada.asignacionId} completada={true} />
      )}

      {mostrarVencidasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-[#161616] border border-red-800/60 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">❗</span>
              <h2 className="text-2xl font-bold text-red-400">{t("alumno.rutinasVencidasTitulo")}</h2>
            </div>
            <p className="text-[#F0F0F0] text-sm leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: t("alumno.rutinasVencidasDesc", { count: `<strong>${overdueDates.length}</strong>` }) }} />
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 mb-5">
              <p className="text-xs text-red-300/90 leading-relaxed">{t("alumno.rutinasVencidasInfo")}</p>
            </div>
            <button type="button" onClick={() => setMostrarVencidasModal(false)}
              className="w-full rounded-xl border border-red-800/60 py-3 text-sm font-semibold text-red-300 hover:bg-red-950/40 transition">{t("alumno.entendido")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
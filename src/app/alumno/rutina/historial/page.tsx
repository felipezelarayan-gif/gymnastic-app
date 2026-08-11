"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import { recalcularRMActual } from "@/lib/recalcularRMActual";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";
import { parseFechaLocal, formatearFechaCorta } from "@/lib/utils/formatearFecha";
import VerRutinaModal from "@/components/alumno/VerRutinaModal";
import VerEvaluacionModal from "@/components/alumno/VerEvaluacionModal";
import { obtenerMetricasResumen } from "@/lib/alumno/obtenerMetricasResumen";
import CalendarioFiltro from "@/components/alumno/CalendarioFiltro";

type HistorialActividad = {
  id: string;
  tipo: "rutina" | "evaluacion";
  subtipo?: string;
  nombre: string;
  fecha: string | null;
  estado: string | null;
  rutina_id?: string | null;
};

function ordenarPorFechaDesc<T extends { fecha?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const fechaA = a.fecha ? parseFechaLocal(a.fecha)?.getTime() ?? 0 : 0;
    const fechaB = b.fecha ? parseFechaLocal(b.fecha)?.getTime() ?? 0 : 0;

    return fechaB - fechaA;
  });
}

function obtenerEtiquetaActividad(actividad: HistorialActividad, t?: (key: string, params?: Record<string, string | number>) => string) {
  if (actividad.tipo === "rutina") return t ? t("alumno.historial.etiquetaRutina") : "Routine";
  if (actividad.subtipo) return t ? t("alumno.historial.etiquetaEvaluacion", { subtipo: actividad.subtipo.toUpperCase() }) : `Test ${actividad.subtipo.toUpperCase()}`;
  return t ? t("alumno.historial.etiquetaEvaluacionGenerica") : "Test";
}

function obtenerIconoActividad(actividad: HistorialActividad) {
  return actividad.tipo === "rutina" ? "🏋️" : "📋";
}

export default function NuevaRutinaHistorialPage() {
  const { mostrarToast } = useToast();
  const { t } = useIdioma();
  const [cargando, setCargando] = useState(true);
  const [cargandoFiltro, setCargandoFiltro] = useState(false);
  const [historial, setHistorial] = useState<HistorialActividad[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [modalRutina, setModalRutina] = useState<{
    open: boolean;
    id: string;
    completada: boolean;
  } | null>(null);
  const [modalEvaluacion, setModalEvaluacion] = useState<{
    open: boolean;
    id: string;
    subtipo: "rm" | "fms";
  } | null>(null);
  // Métricas compartidas
  const [rutinasCompletadas, setRutinasCompletadas] = useState(0);
  const [evaluacionesCompletadas, setEvaluacionesCompletadas] = useState(0);
  const [ejerciciosCompletados, setEjerciciosCompletados] = useState(0);
  // Deshacer UI flow state
  const [confirmarDeshacer, setConfirmarDeshacer] = useState<HistorialActividad | null>(null);
  const [deshaciendo, setDeshaciendo] = useState(false);

  const router = useRouter();
  const [confirmarModificar, setConfirmarModificar] = useState<HistorialActividad | null>(null);
  const [modificando, setModificando] = useState(false);

  // Paginación por cursor de fecha
  const LIMITE_POR_PAGINA = 15;
  const [hayMas, setHayMas] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [cursorFecha, setCursorFecha] = useState<string | null>(null);
  const [idsCargados, setIdsCargados] = useState<Set<string>>(new Set());

  // Filtros
  const [filtroFecha, setFiltroFecha] = useState<string | null>(null);
  const [filtroRango, setFiltroRango] = useState<"semana" | "mes" | "3meses" | null>(null);
  const [fechasConActividades, setFechasConActividades] = useState<string[]>([]);
  const [calendarioExpandido, setCalendarioExpandido] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cargandoRef = useRef(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Scroll infinito: cargar más cuando el sentinel entra en viewport
  useEffect(() => {
    if (!hayMas || cargandoMas || cargando || cargandoFiltro || cargandoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !cargandoRef.current) {
          cargarMas();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [sentinelRef.current, hayMas, cargandoMas, cargando, cargandoFiltro]);

  function obtenerRangoFechas(rango: "semana" | "mes" | "3meses"): { desde: string; hasta: string } {
    const hoy = new Date();
    const hasta = hoy.toISOString().split("T")[0];
    const desde = new Date(hoy);
    if (rango === "semana") desde.setDate(hoy.getDate() - 7);
    if (rango === "mes") desde.setMonth(hoy.getMonth() - 1);
    if (rango === "3meses") desde.setMonth(hoy.getMonth() - 3);
    return { desde: desde.toISOString().split("T")[0], hasta };
  }

  // Suma un día a una fecha en formato YYYY-MM-DD (zona horaria local)
  function sumarUnDia(fecha: string): string {
    const [año, mes, dia] = fecha.split("-").map(Number);
    const date = new Date(año, mes - 1, dia);
    date.setDate(date.getDate() + 1);
    const nuevoAño = date.getFullYear();
    const nuevoMes = String(date.getMonth() + 1).padStart(2, "0");
    const nuevoDia = String(date.getDate()).padStart(2, "0");
    return `${nuevoAño}-${nuevoMes}-${nuevoDia}`;
  }

  function aplicarFiltro(
    rango: "semana" | "mes" | "3meses" | null,
    fecha: string | null,
  ) {
    cargandoRef.current = false;
    setHayMas(true);
    setHistorial([]);
    setCursorFecha(null);
    setIdsCargados(new Set());
    // Solo recargar el historial, no las métricas ni fechas
    cargarSoloHistorial(rango, fecha);
  }

  async function cargarSoloHistorial(
    rango: "semana" | "mes" | "3meses" | null,
    fecha: string | null,
  ) {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    setCargandoFiltro(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError(t("alumno.historial.errorSesion"));
      setCargandoFiltro(false);
      setCargando(false);
      cargandoRef.current = false;
      return;
    }

    const { data: alumnoData, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (alumnoError) {
      setError(alumnoError.message);
      setCargandoFiltro(false);
      setCargando(false);
      cargandoRef.current = false;
      return;
    }

    if (!alumnoData) {
      setError(t("alumno.historial.errorAlumnoNoEncontrado"));
      setCargandoFiltro(false);
      setCargando(false);
      cargandoRef.current = false;
      return;
    }

    // Solo cargar el historial, sin métricas ni fechas
    const { items, nuevoCursor, hayMasResultado, idsActualizados } = await cargarHistorial(
      alumnoData.id,
      rango,
      fecha,
      new Set<string>(),
      null,
    );

    setHistorial(items);
    setCursorFecha(nuevoCursor);
    setHayMas(hayMasResultado);
    setIdsCargados(idsActualizados);

    setCargandoFiltro(false);
    cargandoRef.current = false;
  }

  // Cargar siguiente página cuando el sentinel del scroll infinito entra en viewport
  async function cargarMas() {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    setCargandoMas(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError(t("alumno.historial.errorSesion"));
      setCargandoMas(false);
      cargandoRef.current = false;
      return;
    }

    const { data: alumnoData, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (alumnoError) {
      setError(alumnoError.message);
      setCargandoMas(false);
      cargandoRef.current = false;
      return;
    }

    if (!alumnoData) {
      setError(t("alumno.historial.errorAlumnoNoEncontrado"));
      setCargandoMas(false);
      cargandoRef.current = false;
      return;
    }

    // Solo cargar el historial con los filtros y cursor actuales
    const { items, nuevoCursor, hayMasResultado, idsActualizados } = await cargarHistorial(
      alumnoData.id,
      filtroRango,
      filtroFecha,
      idsCargados,
      cursorFecha,
    );

    // Acumular los nuevos items a los ya cargados
    setHistorial((prev) => [...prev, ...items]);
    setCursorFecha(nuevoCursor);
    setHayMas(hayMasResultado);
    setIdsCargados(idsActualizados);

    setCargandoMas(false);
    cargandoRef.current = false;
  }

  function limpiarFiltros() {
    setFiltroFecha(null);
    setFiltroRango(null);
    setCalendarioExpandido(true);
    aplicarFiltro(null, null);
  }

  async function cargarDatos() {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    setCargando(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError(t("alumno.historial.errorSesion"));
      setCargando(false);
      cargandoRef.current = false;
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
      cargandoRef.current = false;
      return;
    }

    if (!alumnoData) {
      setError(t("alumno.historial.errorAlumnoNoEncontrado"));
      setCargando(false);
      cargandoRef.current = false;
      return;
    }

    // Cargar historial, métricas y fechas con actividades en paralelo
    const [historialResultado, metricas, fechas] = await Promise.all([
      cargarHistorial(alumnoData.id, filtroRango, filtroFecha, idsCargados, null),
      obtenerMetricasResumen(supabase, alumnoData.id),
      obtenerFechasConActividades(alumnoData.id),
    ]);

    setHistorial(historialResultado.items);
    setCursorFecha(historialResultado.nuevoCursor);
    setHayMas(historialResultado.hayMasResultado);
    setIdsCargados(historialResultado.idsActualizados);
    setFechasConActividades(fechas);

    setRutinasCompletadas(metricas.rutinasCompletadas);
    setEvaluacionesCompletadas(metricas.evaluacionesCompletadas);
    setEjerciciosCompletados(metricas.ejerciciosCompletados);
    setCargando(false);
    cargandoRef.current = false;
  }

  async function cargarHistorial(
    alumnoId: string,
    rango: "semana" | "mes" | "3meses" | null,
    fecha: string | null,
    idsPreCargados: Set<string>,
    cursor: string | null,
  ): Promise<{ items: HistorialActividad[]; nuevoCursor: string | null; hayMasResultado: boolean; idsActualizados: Set<string> }> {
    const [rutinasCompletadas, evaluacionesRm, evaluacionesFms] = await Promise.all([
      cargarHistorialRutinas(alumnoId, rango, fecha, cursor),
      cargarHistorialRm(alumnoId, rango, fecha, cursor),
      cargarHistorialFms(alumnoId, rango, fecha, cursor),
    ]);

    const fusionado = ordenarPorFechaDesc([
      ...rutinasCompletadas,
      ...evaluacionesRm,
      ...evaluacionesFms,
    ]);

    // Deduplicar por id (evita repetir items con la misma fecha que el cursor)
    const vistos = new Set(idsPreCargados);
    const unicos: HistorialActividad[] = [];
    for (const item of fusionado) {
      if (!vistos.has(item.id)) {
        vistos.add(item.id);
        unicos.push(item);
      }
    }

    const items = unicos.slice(0, LIMITE_POR_PAGINA);
    const hayMasResultado = unicos.length > LIMITE_POR_PAGINA;

    // Actualizar el set de ids cargados
    const nuevosIds = new Set(idsPreCargados);
    items.forEach((item) => nuevosIds.add(item.id));

    // El cursor es la fecha del último item mostrado
    const ultimo = items[items.length - 1];
    const nuevoCursor = ultimo?.fecha ?? null;

    return { items, nuevoCursor, hayMasResultado, idsActualizados: nuevosIds };
  }

  async function cargarHistorialRutinas(
    alumnoId: string,
    rango: "semana" | "mes" | "3meses" | null,
    fecha: string | null,
    cursor: string | null,
  ): Promise<HistorialActividad[]> {
    let query = supabase
      .from("rutina_asignaciones")
      .select(
        `
          id,
          rutina_id,
          completada,
          fecha_asignacion,
          fecha_completada,
          created_at,
          rutinas (
            nombre
          )
        `,
      )
      .eq("alumno_id", alumnoId)
      .eq("completada", true)
      .order("fecha_completada", { ascending: false })
      .limit(LIMITE_POR_PAGINA + 1);

    if (fecha) {
      query = query.gte("fecha_completada", fecha).lt("fecha_completada", sumarUnDia(fecha));
    }
    if (rango) {
      const { desde: fechaDesde, hasta: fechaHasta } = obtenerRangoFechas(rango);
      query = query.gte("fecha_completada", fechaDesde).lte("fecha_completada", fechaHasta);
    }
    if (cursor) {
      query = query.lte("fecha_completada", cursor);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map((rutina) => {
      const rutinaRelacionada = Array.isArray(rutina.rutinas)
        ? rutina.rutinas[0]
        : rutina.rutinas;

      return {
        id: rutina.id,
        rutina_id: rutina.rutina_id ?? null,
        tipo: "rutina" as const,
        nombre: rutinaRelacionada?.nombre || "Rutina completada",
        fecha: rutina.fecha_completada || rutina.created_at || rutina.fecha_asignacion || null,
        estado: "completada",
      };
    });
  }

  async function cargarHistorialRm(
    alumnoId: string,
    rango: "semana" | "mes" | "3meses" | null,
    fecha: string | null,
    cursor: string | null,
  ): Promise<HistorialActividad[]> {
    let query = supabase
      .from("evaluaciones_rm")
      .select("id, nombre, estado, fecha_realizacion, created_at")
      .eq("alumno_id", alumnoId)
      .is("deleted_at", null)
      .not("estado", "in", "(pendiente,incompleta)")
      .order("fecha_realizacion", { ascending: false })
      .limit(LIMITE_POR_PAGINA + 1);

    if (fecha) {
      query = query.gte("fecha_realizacion", fecha).lt("fecha_realizacion", sumarUnDia(fecha));
    }
    if (rango) {
      const { desde: fechaDesde, hasta: fechaHasta } = obtenerRangoFechas(rango);
      query = query.gte("fecha_realizacion", fechaDesde).lte("fecha_realizacion", fechaHasta);
    }
    if (cursor) {
      query = query.lte("fecha_realizacion", cursor);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map((evaluacion) => ({
      id: evaluacion.id,
      tipo: "evaluacion" as const,
      subtipo: "rm",
      nombre: evaluacion.nombre || "Evaluación de RM",
      fecha: evaluacion.fecha_realizacion || evaluacion.created_at || null,
      estado: evaluacion.estado || null,
    }));
  }

  async function cargarHistorialFms(
    alumnoId: string,
    rango: "semana" | "mes" | "3meses" | null,
    fecha: string | null,
    cursor: string | null,
  ): Promise<HistorialActividad[]> {
    let query = supabase
      .from("evaluaciones_fms")
      .select("id, estado, fecha_realizacion, created_at")
      .eq("alumno_id", alumnoId)
      .is("deleted_at", null)
      .not("estado", "in", "(pendiente,incompleta)")
      .order("fecha_realizacion", { ascending: false })
      .limit(LIMITE_POR_PAGINA + 1);

    if (fecha) {
      query = query.gte("fecha_realizacion", fecha).lt("fecha_realizacion", sumarUnDia(fecha));
    }
    if (rango) {
      const { desde: fechaDesde, hasta: fechaHasta } = obtenerRangoFechas(rango);
      query = query.gte("fecha_realizacion", fechaDesde).lte("fecha_realizacion", fechaHasta);
    }
    if (cursor) {
      query = query.lte("fecha_realizacion", cursor);
    }

    const { data, error } = await query;

    if (error || !data) return [];

    return data.map((evaluacion) => ({
      id: evaluacion.id,
      tipo: "evaluacion" as const,
      subtipo: "fms",
      nombre: "Evaluación FMS",
      fecha: evaluacion.fecha_realizacion || evaluacion.created_at || null,
      estado: evaluacion.estado || null,
    }));
  }

  async function obtenerFechasConActividades(alumnoId: string): Promise<string[]> {
    const [rutinas, evaluacionesRm, evaluacionesFms] = await Promise.all([
      supabase
        .from("rutina_asignaciones")
        .select("fecha_completada")
        .eq("alumno_id", alumnoId)
        .eq("completada", true)
        .not("fecha_completada", "is", null),
      supabase
        .from("evaluaciones_rm")
        .select("fecha_realizacion")
        .eq("alumno_id", alumnoId)
        .is("deleted_at", null)
        .not("estado", "in", "(pendiente,incompleta)")
        .not("fecha_realizacion", "is", null),
      supabase
        .from("evaluaciones_fms")
        .select("fecha_realizacion")
        .eq("alumno_id", alumnoId)
        .is("deleted_at", null)
        .not("estado", "in", "(pendiente,incompleta)")
        .not("fecha_realizacion", "is", null),
    ]);

    const fechas = new Set<string>();

    (rutinas.data || []).forEach((r: any) => {
      if (r.fecha_completada) fechas.add(r.fecha_completada);
    });

    (evaluacionesRm.data || []).forEach((e: any) => {
      if (e.fecha_realizacion) fechas.add(e.fecha_realizacion);
    });

    (evaluacionesFms.data || []).forEach((e: any) => {
      if (e.fecha_realizacion) fechas.add(e.fecha_realizacion);
    });

    return Array.from(fechas).sort().reverse();
  }

  async function modificarEntrenamiento() {
    if (!confirmarModificar) return;

    if (confirmarModificar.rutina_id === null) {
      mostrarToast(t("alumno.historial.errorRutinaEliminada"), "error");
      setConfirmarModificar(null);
      return;
    }

    setModificando(true);

    try {
      sessionStorage.setItem(
        "rutina_a_modificar",
        JSON.stringify({
          asignacionId: confirmarModificar.id,
        })
      );

      router.push(`/alumno/rutina/${confirmarModificar.id}?modo=modificar`);
    } finally {
      setModificando(false);
      setConfirmarModificar(null);
    }
  }

  async function deshacerEntrenamiento() {
    if (!confirmarDeshacer) return;

    if (confirmarDeshacer.rutina_id === null) {
      mostrarToast(t("alumno.historial.errorRutinaEliminada"), "error");
      setConfirmarDeshacer(null);
      return;
    }

    setDeshaciendo(true);
    try {
      const rutina = confirmarDeshacer;
      if (!rutina) return;

      const { data: historial } = await supabase
        .from("rms_historial")
        .select("id, alumno_id, ejercicio_id")
        .eq("rutina_asignacion_id", rutina.id)
        .eq("origen", "entrenamiento");

      const alumnoId = historial?.[0]?.alumno_id;
      const ejercicios = [...new Set((historial || []).map((item) => item.ejercicio_id).filter(Boolean))] as string[];

      if (historial?.length) {
        const { error } = await supabase
          .from("rms_historial")
          .delete()
          .in(
            "id",
            historial.map((item) => item.id)
          );

        if (error) throw error;
      }

      const { error: registrosError } = await supabase
        .from("registros_entrenamiento")
        .delete()
        .eq("rutina_asignacion_id", rutina.id);

      if (registrosError) throw registrosError;

      const { error: asignacionError } = await supabase
        .from("rutina_asignaciones")
        .update({
          completada: false,
          activa: true,
          fecha_completada: null,
        })
        .eq("id", rutina.id);

      if (asignacionError) throw asignacionError;

      if (alumnoId) {
        for (const ejercicioId of ejercicios) {
          await recalcularRMActual({
            alumnoId,
            ejercicioId,
          });
        }
      }

      await cargarDatos();

      setConfirmarDeshacer(null);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : t("alumno.historial.errorDeshacer");
      mostrarToast(mensaje, "error");
    } finally {
      setDeshaciendo(false);
    }
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
            <p className="text-red-300 font-semibold">{t("alumno.historial.noPudimosCargarHistorial")}</p>
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

        <header>
          <p className="text-sm text-zinc-500">{t("alumno.historial.alumnoLabel")}</p>
          <h1 className="text-3xl font-bold">{t("alumno.historial.titulo")}</h1>
          <p className="text-zinc-400 mt-2">
            {t("alumno.historial.subtitulo")}
          </p>
        </header>

        {/* Filtros de fecha */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 space-y-3">
          <CalendarioFiltro
            fechasConActividades={fechasConActividades}
            fechaSeleccionada={filtroFecha}
            onSeleccionarFecha={(fecha) => {
              setFiltroFecha(fecha);
              setFiltroRango(null);
              aplicarFiltro(null, fecha);
            }}
            expandido={calendarioExpandido}
            onToggle={() => setCalendarioExpandido(!calendarioExpandido)}
          />

          <div className="flex flex-wrap gap-2 px-3 md:px-4 pb-3 md:pb-4">
            <button
              type="button"
              onClick={() => {
                setFiltroRango("semana");
                setFiltroFecha(null);
                setCalendarioExpandido(false);
                aplicarFiltro("semana", null);
              }}
              className={`rounded-full border px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold transition ${
                filtroRango === "semana"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {t("alumno.historial.ultimaSemana")}
            </button>
            <button
              type="button"
              onClick={() => {
                setFiltroRango("mes");
                setFiltroFecha(null);
                setCalendarioExpandido(false);
                aplicarFiltro("mes", null);
              }}
              className={`rounded-full border px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold transition ${
                filtroRango === "mes"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {t("alumno.historial.ultimoMes")}
            </button>
            <button
              type="button"
              onClick={() => {
                setFiltroRango("3meses");
                setFiltroFecha(null);
                setCalendarioExpandido(false);
                aplicarFiltro("3meses", null);
              }}
              className={`rounded-full border px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold transition ${
                filtroRango === "3meses"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {t("alumno.historial.ultimos3Meses")}
            </button>

            {(filtroFecha || filtroRango) && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="rounded-full border border-zinc-700 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-zinc-300 hover:border-zinc-500"
              >
                {t("alumno.historial.limpiar")}
              </button>
            )}
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm text-zinc-400">{t("alumno.historial.rutinasCompletadas")}</p>
            <p className="text-3xl font-bold mt-1">{rutinasCompletadas}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm text-zinc-400">{t("alumno.historial.evaluacionesRealizadas")}</p>
            <p className="text-3xl font-bold mt-1">{evaluacionesCompletadas}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm text-zinc-400">{t("alumno.historial.ejerciciosCompletados")}</p>
            <p className="text-3xl font-bold mt-1">{ejerciciosCompletados}</p>
          </div>
        </section>

        {cargandoFiltro ? (
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-zinc-700 border-t-emerald-500 animate-spin" />
            <p className="text-sm text-zinc-400">{t("alumno.historial.cargandoMas")}</p>
          </section>
        ) : historial.length === 0 ? (
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-xl font-bold">{t("alumno.historial.sinHistorial")}</h2>
            <p className="text-zinc-400 mt-2">
              {t("alumno.historial.sinHistorialDesc")}
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {historial.map((actividad) => (
              <div
                key={`${actividad.tipo}-${actividad.subtipo || "general"}-${actividad.id}`}
                className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-3xl">{obtenerIconoActividad(actividad)}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-400">
                        {obtenerEtiquetaActividad(actividad, t)}
                      </p>
                      <h2 className="text-xl font-bold mt-1 truncate">
                        {actividad.nombre}
                      </h2>
                      <div className="flex flex-wrap gap-2 text-sm text-zinc-500 mt-1">
                        <span>{t("alumno.historial.fechaCompletada", { fecha: formatearFechaCorta(actividad.fecha) || "" })}</span>
                        {actividad.estado && (
                          <>
                            <span>•</span>
                            <span>{actividad.estado}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    {actividad.tipo === "rutina" ? (
                      <button
                        type="button"
                        onClick={() => setModalRutina({ open: true, id: actividad.id, completada: true })}
                        className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                      >
                        {t("alumno.historial.verDetalles")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setModalEvaluacion({
                          open: true,
                          id: actividad.id,
                          subtipo: (actividad.subtipo as "rm" | "fms") || "rm",
                        })}
                        className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                      >
                        {t("alumno.historial.verDetalles")}
                      </button>
                    )}
                    {actividad.tipo === "rutina" && actividad.rutina_id !== null ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmarModificar(actividad)}
                          className="rounded-full border border-amber-800 px-4 py-2 text-sm font-semibold text-amber-300 hover:border-amber-500 hover:bg-amber-950/30"
                        >
                          {t("alumno.historial.modificar")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmarDeshacer(actividad)}
                          className="rounded-full border border-red-900/60 px-4 py-2 text-sm font-semibold text-red-300 hover:border-red-500 hover:bg-red-950/30"
                        >
                          {t("alumno.historial.deshacer")}
                        </button>
                      </>
                    ) : actividad.tipo === "rutina" && actividad.rutina_id === null ? (
                      <p className="max-w-[220px] text-right text-xs text-zinc-500">
                        {t("alumno.historial.rutinaEliminada")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {cargandoMas && (
              <div className="py-4 text-center text-sm text-zinc-500">
                {t("alumno.historial.cargandoMas")}
              </div>
            )}
            <div ref={sentinelRef} />
          </section>
        )}
      </div>
      {/* Modal de confirmación para Modificar */}
      {confirmarModificar && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <section className="w-full max-w-md rounded-3xl border border-amber-900 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-amber-300 mb-2">{t("alumno.historial.confirmarModificarTitulo")}</h2>
            <p className="text-zinc-300 mb-4">
              {t("alumno.historial.confirmarModificarDesc")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmarModificar(null)}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
                disabled={modificando}
              >
                {t("alumno.historial.cancelar")}
              </button>
              <button
                type="button"
                onClick={modificarEntrenamiento}
                disabled={modificando}
                className="rounded-full border border-amber-900 px-4 py-2 text-sm font-semibold text-amber-300 hover:border-amber-500 hover:bg-amber-950/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {modificando ? t("alumno.historial.abriendo") : t("alumno.historial.modificar")}
              </button>
            </div>
          </section>
        </div>
      )}
      {/* Modal de confirmación para Deshacer */}
      {confirmarDeshacer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <section className="w-full max-w-md rounded-3xl border border-red-900 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-red-300 mb-2">{t("alumno.historial.confirmarDeshacerTitulo")}</h2>
            <p className="text-zinc-300 mb-4">
              {t("alumno.historial.confirmarDeshacerDesc")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmarDeshacer(null)}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
                disabled={deshaciendo}
              >
                {t("alumno.historial.cancelar")}
              </button>
              <button
                type="button"
                onClick={deshacerEntrenamiento}
                disabled={deshaciendo}
                className="rounded-full border border-red-900 px-4 py-2 text-sm font-semibold text-red-300 hover:border-red-500 hover:bg-red-950/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {deshaciendo ? t("alumno.historial.procesando") : t("alumno.historial.deshacer")}
              </button>
            </div>
          </section>
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
      {modalEvaluacion?.open && (
        <VerEvaluacionModal
          open={modalEvaluacion.open}
          onClose={() => setModalEvaluacion(null)}
          evaluacionId={modalEvaluacion.id}
          subtipo={modalEvaluacion.subtipo}
          completada={true}
        />
      )}
    </main>
  );
}
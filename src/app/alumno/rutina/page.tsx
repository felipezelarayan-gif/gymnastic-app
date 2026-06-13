"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Rutina = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  objetivo?: string | null;
  estructura?: string | null;
  entrada_calor?: string | null;
};

type RutinaAsignada = {
  asignacion_id: string;
  rutina_id: string;
  activa?: boolean | null;
  fecha_asignacion?: string | null;
  orden?: number | null;
  completada?: boolean | null;
  fecha_completada?: string | null;
  rutinas?: Rutina | null;
};

type RutinaRelacion = Rutina | Rutina[] | null;

type RutinaAsignacionResponse = {
  id: string;
  rutina_id: string;
  activa?: boolean | null;
  fecha_asignacion?: string | null;
  orden?: number | null;
  completada?: boolean | null;
  fecha_completada?: string | null;
  rutinas?: RutinaRelacion;
};

type RutinaEjercicio = {
  id: string;
  rutina_id: string;
  rutina_asignacion_id?: string | null;
  ejercicio_id?: string | null;
  nombre_ejercicio: string;
  series?: number | null;
  tipo_prescripcion?: string | null;
  repeticiones?: string | null;
  duracion?: string | null;
  peso?: string | null;
  porcentaje_rm?: string | null;
  rir?: string | null;
  descanso?: string | null;
  observaciones?: string | null;
  orden?: number | null;
  tipo_configuracion?: "simple" | "avanzado" | null;
  youtube_url?: string | null;
};

type RutinaEjercicioSerie = {
  id: string;
  rutina_ejercicio_id: string;
  numero_serie: number;
  repeticiones?: string | null;
  peso?: string | null;
};

type EntradaCalorEjercicio = {
  id: string;
  rutina_id?: string | null;
  ejercicio_id?: string | null;
  nombre_ejercicio: string;
  series?: number | null;
  tipo_prescripcion?: string | null;
  duracion?: string | null;
  repeticiones?: string | null;
  observaciones?: string | null;
  orden?: number | null;
  youtube_url?: string | null;
};

type RMActual = {
  id: string;
  ejercicio_id: string;
  rm_calculado?: number | null;
};

type RegistroEntrenamiento = {
  id: string;
  rutina_id: string;
  rutina_asignacion_id?: string | null;
  rutina_ejercicio_id?: string | null;
  entrada_calor_id?: string | null;
  ejercicio_id?: string | null;
  nombre_ejercicio?: string | null;
  peso_kg?: number | null;
  repeticiones?: number | null;
  rpe?: number | null;
  rir?: number | null;
  completado?: boolean | null;
};

type SerieCompletadaCache = {
  numero_serie: number;
  peso_kg: number;
  repeticiones: number;
  rm_calculado: number | null;
};

type EjercicioCompletadoCache = {
  rutina_ejercicio_id: string;
  nombre_ejercicio: string;
  peso_kg: number;
  repeticiones: number;
  rpe: number;
  rir: number | null;
  rm_calculado: number | null;
  ejercicio_id?: string | null;
  rutina_id: string;
  rutina_asignacion_id: string;
  tipo_configuracion?: "simple" | "avanzado" | null;
  series_realizadas?: SerieCompletadaCache[];
};

type EntradaCalorCompletadaCache = {
  entrada_calor_id: string;
  nombre_ejercicio: string;
  rutina_id: string;
  rutina_asignacion_id: string;
  ejercicio_id?: string | null;
};

type VideoEjercicio = {
  id: string;
  youtube_url?: string | null;
  video_url?: string | null;
};

type ProgresoRutinaCache = {
  ejercicios: EjercicioCompletadoCache[];
  entradas: EntradaCalorCompletadaCache[];
};

const opcionesRPE = Array.from({ length: 10 }, (_, index) => index + 1);
const opcionesRIR = Array.from({ length: 10 }, (_, index) => index + 1);


function textoPrescripcion(item: {
  tipo_prescripcion?: string | null;
  repeticiones?: string | null;
  duracion?: string | null;
}) {
  if (item.tipo_prescripcion === "tiempo") {
    return item.duracion ? `Duración: ${item.duracion}` : "Duración: -";
  }

  return item.repeticiones ? `Reps: ${item.repeticiones}` : "Reps: -";
}

function textoPrescripcionAvanzada(series: RutinaEjercicioSerie[]) {
  if (series.length === 0) return "Serie por serie";

  return series
    .map((serie) => `S${serie.numero_serie}: ${serie.repeticiones || "-"} x ${serie.peso || "-"} kg`)
    .join(" · ");
}

function normalizarRutina(rutinas?: RutinaRelacion) {
  if (Array.isArray(rutinas)) return rutinas[0] || null;
  return rutinas || null;
}

function obtenerUrlVideo(video?: VideoEjercicio | null) {
  return video?.youtube_url || video?.video_url || null;
}

async function cargarVideosEjercicios(idsEjercicios: string[]) {
  const idsUnicos = Array.from(new Set(idsEjercicios.filter(Boolean)));

  if (idsUnicos.length === 0) return [] as VideoEjercicio[];

  const { data: videosYoutube, error: youtubeError } = await supabase
    .from("ejercicios")
    .select("id,youtube_url")
    .in("id", idsUnicos);

  if (!youtubeError) return (videosYoutube || []) as VideoEjercicio[];

  const { data: videosGenericos, error: videoError } = await supabase
    .from("ejercicios")
    .select("id,video_url")
    .in("id", idsUnicos);

  if (!videoError) return (videosGenericos || []) as VideoEjercicio[];

  return [] as VideoEjercicio[];
}

export default function AlumnoRutinaPage() {
  const [loading, setLoading] = useState(true);
  const [alumnoId, setAlumnoId] = useState("");
  const [rutinasAsignadas, setRutinasAsignadas] = useState<RutinaAsignada[]>([]);
  const [rutinasAbiertas, setRutinasAbiertas] = useState<Record<string, boolean>>({});
  const [ejerciciosPorRutina, setEjerciciosPorRutina] = useState<Record<string, RutinaEjercicio[]>>({});
  const [seriesPorEjercicio, setSeriesPorEjercicio] = useState<Record<string, RutinaEjercicioSerie[]>>({});
  const [entradaPorRutina, setEntradaPorRutina] = useState<Record<string, EntradaCalorEjercicio[]>>({});
  const [registros, setRegistros] = useState<RegistroEntrenamiento[]>([]);
  const [rmsActuales, setRmsActuales] = useState<RMActual[]>([]);
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState<RutinaEjercicio | null>(null);
  const [pesoUsado, setPesoUsado] = useState("");
  const [repsRealizadas, setRepsRealizadas] = useState("");
  const [rpe, setRpe] = useState("");
  const [rirReal, setRirReal] = useState("");
  const [seriesRealizadas, setSeriesRealizadas] = useState<Record<number, { peso: string; repeticiones: string }>>({});
  const [mostrarProximos, setMostrarProximos] = useState(true);
  const [mostrarCompletados, setMostrarCompletados] = useState(false);
  const [fechaCompletados, setFechaCompletados] = useState("");
  const [guardandoEjercicio, setGuardandoEjercicio] = useState(false);
  const [ejerciciosCompletadosCache, setEjerciciosCompletadosCache] = useState<EjercicioCompletadoCache[]>([]);
  const [entradaCalorCompletadaCache, setEntradaCalorCompletadaCache] = useState<EntradaCalorCompletadaCache[]>([]);
  const [guardandoRutina, setGuardandoRutina] = useState(false);
  const [mostrarAlertaSalida, setMostrarAlertaSalida] = useState(false);
  const [navegacionPendiente, setNavegacionPendiente] = useState<string | null>(null);
  const [guardandoAntesDeSalir, setGuardandoAntesDeSalir] = useState(false);
  const progresoLocalCargadoRef = useRef(false);
  const permitirSalidaRef = useRef(false);

  useEffect(() => {
    cargarTodo();
  }, []);

  // ETAPA 3: Sincronización de progreso local desde localStorage
  useEffect(() => {
    if (!alumnoId) return;

    progresoLocalCargadoRef.current = false;

    const progresoGuardado = localStorage.getItem(claveProgresoLocal(alumnoId));
    if (!progresoGuardado) {
      progresoLocalCargadoRef.current = true;
      return;
    }

    try {
      const progreso = JSON.parse(progresoGuardado) as ProgresoRutinaCache;
      queueMicrotask(() => {
        setEjerciciosCompletadosCache(progreso.ejercicios || []);
        setEntradaCalorCompletadaCache(progreso.entradas || []);
      });
    } catch {
      localStorage.removeItem(claveProgresoLocal(alumnoId));
    } finally {
      progresoLocalCargadoRef.current = true;
    }
  }, [alumnoId]);

  // ETAPA 3: Helpers para progreso local
  function claveProgresoLocal(idAlumno: string) {
    return `rutina_progreso_${idAlumno}`;
  }

  function hayProgresoPendiente() {
    return ejerciciosCompletadosCache.length > 0 || entradaCalorCompletadaCache.length > 0;
  }

  function guardarProgresoLocal() {
    if (!alumnoId) return;

    const progreso: ProgresoRutinaCache = {
      ejercicios: ejerciciosCompletadosCache,
      entradas: entradaCalorCompletadaCache,
    };

    if (progreso.ejercicios.length === 0 && progreso.entradas.length === 0) {
      localStorage.removeItem(claveProgresoLocal(alumnoId));
      return;
    }

    localStorage.setItem(claveProgresoLocal(alumnoId), JSON.stringify(progreso));
  }

  function guardarProgresoActual() {
    guardarProgresoLocal();
    alert("Tu progreso quedó guardado en este dispositivo. Cuando completes la rutina, se va a guardar definitivamente.");
  }

  function limpiarProgresoLocal() {
    if (!alumnoId) return;
    localStorage.removeItem(claveProgresoLocal(alumnoId));
  }

  function descartarProgresoPendiente() {
    if (alumnoId) {
      localStorage.removeItem(claveProgresoLocal(alumnoId));
    }

    setEjerciciosCompletadosCache([]);
    setEntradaCalorCompletadaCache([]);
  }

  function cerrarAlertaSalida() {
    setMostrarAlertaSalida(false);
    setNavegacionPendiente(null);
  }

  async function guardarYSalir() {
    setGuardandoAntesDeSalir(true);
    guardarProgresoLocal();
    permitirSalidaRef.current = true;

    const destino = navegacionPendiente;
    setGuardandoAntesDeSalir(false);
    setMostrarAlertaSalida(false);
    setNavegacionPendiente(null);

    if (destino) {
      window.location.href = destino;
    }
  }

  function salirSinGuardar() {
    permitirSalidaRef.current = true;
    descartarProgresoPendiente();

    const destino = navegacionPendiente;
    setMostrarAlertaSalida(false);
    setNavegacionPendiente(null);

    if (destino) {
      window.location.href = destino;
    }
  }

  useEffect(() => {
    if (!alumnoId || !progresoLocalCargadoRef.current) return;
    guardarProgresoLocal();
  }, [alumnoId, ejerciciosCompletadosCache, entradaCalorCompletadaCache]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hayProgresoPendiente() || permitirSalidaRef.current) return;

      guardarProgresoLocal();
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [alumnoId, ejerciciosCompletadosCache, entradaCalorCompletadaCache]);

  async function cargarTodo() {
    setLoading(true);

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

    const { data: alumno, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id,user_id")
      .eq("user_id", user.id)
      .single();

    if (alumnoError || !alumno) {
      setLoading(false);
      return;
    }

    setAlumnoId(alumno.id);

    const { data: asignacionesData, error: asignacionesError } = await supabase
      .from("rutina_asignaciones")
      .select(`
        id,
        rutina_id,
        activa,
        fecha_asignacion,
        orden,
        completada,
        fecha_completada,
        created_at,
        rutinas (
          id,
          nombre,
          descripcion,
          objetivo,
          estructura,
          entrada_calor
        )
      `)
      .eq("alumno_id", alumno.id)
      .order("fecha_asignacion", { ascending: true })
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true });

    if (asignacionesError) {
      alert(asignacionesError.message);
      setLoading(false);
      return;
    }

    const rutinaIds = Array.from(
      new Set((asignacionesData || []).map((item) => item.rutina_id).filter(Boolean))
    );

    let rutinasBase: Rutina[] = [];

if (rutinaIds.length > 0) {
  const { data: rutinasData, error: rutinasError } = await supabase
    .from("rutinas")
    .select("id,nombre,descripcion,objetivo,estructura,entrada_calor")
    .in("id", rutinaIds);

  if (rutinasError) {
    alert(rutinasError.message);
    setLoading(false);
    return;
  }

  rutinasBase = rutinasData || [];
}

    const asignacionesTipadas = (
      (asignacionesData || []) as RutinaAsignacionResponse[]
    ).map((item) => {
      const rutinaRelacion = normalizarRutina(item.rutinas);
      const rutinaManual = rutinasBase.find((rutina) => rutina.id === item.rutina_id) || null;

      return {
        asignacion_id: item.id,
        rutina_id: item.rutina_id,
        activa: item.activa,
        fecha_asignacion: item.fecha_asignacion,
        orden: item.orden,
        completada: item.completada,
        fecha_completada: item.fecha_completada,
        rutinas: rutinaManual || rutinaRelacion,
      };
    }) as RutinaAsignada[];

    if (rutinaIds.length === 0) {
      setRutinasAsignadas(asignacionesTipadas);
      setEjerciciosPorRutina({});
      setSeriesPorEjercicio({});
      setEntradaPorRutina({});
      setRegistros([]);
      setRmsActuales([]);
      setLoading(false);
      return;
    }

    const { data: rutinaEjercicios, error: ejerciciosError } = await supabase
      .from("rutina_ejercicios")
      .select("id,rutina_id,ejercicio_id,nombre_ejercicio,series,tipo_prescripcion,repeticiones,duracion,peso,porcentaje_rm,rir,descanso,observaciones,orden,tipo_configuracion")
      .in("rutina_id", rutinaIds)
      .order("orden", { ascending: true });

    if (ejerciciosError) {
      alert(ejerciciosError.message);
      setLoading(false);
      return;
    }

    const idsEjercicios =
      rutinaEjercicios?.map((item) => item.ejercicio_id).filter(Boolean) || [];

    const videosEjercicios = await cargarVideosEjercicios(idsEjercicios as string[]);

    const ejerciciosConVideo =
      rutinaEjercicios?.map((item) => {
        const video = videosEjercicios.find((v) => v.id === item.ejercicio_id);
        return { ...item, youtube_url: obtenerUrlVideo(video) };
      }) || [];

    const ejerciciosAvanzadosIds = ejerciciosConVideo
      .filter((item) => item.tipo_configuracion === "avanzado")
      .map((item) => item.id);

    let seriesAgrupadas: Record<string, RutinaEjercicioSerie[]> = {};

    if (ejerciciosAvanzadosIds.length > 0) {
      const { data: seriesData, error: seriesError } = await supabase
        .from("rutina_ejercicio_series")
        .select("id,rutina_ejercicio_id,numero_serie,repeticiones,peso")
        .in("rutina_ejercicio_id", ejerciciosAvanzadosIds)
        .order("numero_serie", { ascending: true });

      if (seriesError) {
        alert(seriesError.message);
        setLoading(false);
        return;
      }

      seriesAgrupadas = ((seriesData || []) as RutinaEjercicioSerie[]).reduce<Record<string, RutinaEjercicioSerie[]>>(
        (acc, serie) => {
          acc[serie.rutina_ejercicio_id] = acc[serie.rutina_ejercicio_id] || [];
          acc[serie.rutina_ejercicio_id].push(serie);
          return acc;
        },
        {}
      );
    }

    const agrupadosEjercicios: Record<string, RutinaEjercicio[]> = {};

    ejerciciosConVideo.forEach((item) => {
      if (!agrupadosEjercicios[item.rutina_id]) {
        agrupadosEjercicios[item.rutina_id] = [];
      }
      agrupadosEjercicios[item.rutina_id].push(item);
    });

    const { data: entrada, error: entradaError } = await supabase
      .from("rutina_entrada_calor")
      .select("id,rutina_id,ejercicio_id,nombre_ejercicio,series,tipo_prescripcion,duracion,repeticiones,observaciones,orden")
      .in("rutina_id", rutinaIds)
      .order("orden", { ascending: true });

    if (entradaError) {
      alert(entradaError.message);
      setLoading(false);
      return;
    }

    const idsEntrada =
      entrada?.map((item) => item.ejercicio_id).filter(Boolean) || [];

    const videosEntrada = await cargarVideosEjercicios(idsEntrada as string[]);

    const entradaConVideo =
      entrada?.map((item) => {
        const video = videosEntrada.find((v) => v.id === item.ejercicio_id);
        return { ...item, youtube_url: obtenerUrlVideo(video) };
      }) || [];

    const agrupadaEntrada: Record<string, EntradaCalorEjercicio[]> = {};

    entradaConVideo.forEach((item) => {
      if (!item.rutina_id) return;

      if (!agrupadaEntrada[item.rutina_id]) {
        agrupadaEntrada[item.rutina_id] = [];
      }

      agrupadaEntrada[item.rutina_id].push(item);
    });

    const asignacionIds = asignacionesTipadas.map((item) => item.asignacion_id);

    const { data: registrosData, error: registrosError } = await supabase
      .from("registros_entrenamiento")
      .select("id,rutina_id,rutina_asignacion_id,rutina_ejercicio_id,entrada_calor_id,ejercicio_id,nombre_ejercicio,peso_kg,repeticiones,rpe,rir")
      .eq("alumno_id", alumno.id)
      .in("rutina_asignacion_id", asignacionIds)
      .eq("completado", true);

    if (registrosError) {
      alert(registrosError.message);
      setLoading(false);
      return;
    }

    const { data: rms } = await supabase
      .from("rms_actuales")
      .select("id,ejercicio_id,rm_calculado")
      .eq("alumno_id", alumno.id);

    setRutinasAsignadas(asignacionesTipadas);
    setEjerciciosPorRutina(agrupadosEjercicios);
    setSeriesPorEjercicio(seriesAgrupadas);
    setEntradaPorRutina(agrupadaEntrada);
    setRegistros(registrosData || []);
    setRmsActuales(rms || []);
    setLoading(false);
  }

  function ejercicioEstaCompletado(rutinaAsignacionId: string, rutinaEjercicioId: string) {
    // Primero verifica en caché local
    const enCache = ejerciciosCompletadosCache.some(
      (item) =>
        item.rutina_asignacion_id === rutinaAsignacionId &&
        item.rutina_ejercicio_id === rutinaEjercicioId
    );
    
    if (enCache) return true;
    
    // Luego verifica en registros de BD
    return registros.some(
      (registro) =>
        registro.rutina_asignacion_id === rutinaAsignacionId &&
        registro.rutina_ejercicio_id === rutinaEjercicioId
    );
  }

  function entradaEstaCompletada(rutinaAsignacionId: string, entradaId: string) {
    const enCache = entradaCalorCompletadaCache.some(
      (item) =>
        item.rutina_asignacion_id === rutinaAsignacionId &&
        item.entrada_calor_id === entradaId
    );

    if (enCache) return true;

    return registros.some(
      (registro) =>
        registro.rutina_asignacion_id === rutinaAsignacionId &&
        registro.entrada_calor_id === entradaId
    );
  }

  function asignacionEstaCompletada(asignacion: RutinaAsignada) {
    return asignacion.completada === true || asignacion.activa === false;
  }

  function toggleRutina(asignacionId: string) {
    setRutinasAbiertas((actual) => ({
      ...actual,
      [asignacionId]: !actual[asignacionId],
    }));
  }

  function calcularPesoPorRM(item: RutinaEjercicio) {
    if (!item.ejercicio_id || !item.porcentaje_rm) return null;

    if (item.porcentaje_rm === "0") return "Peso corporal";

    const porcentaje = Number(String(item.porcentaje_rm).replace("%", "").trim());

    if (!porcentaje || Number.isNaN(porcentaje)) return null;

    const rm = rmsActuales.find((registro) => registro.ejercicio_id === item.ejercicio_id);

    if (!rm?.rm_calculado) return null;

    return `${Number(((Number(rm.rm_calculado) * porcentaje) / 100).toFixed(1))} kg`;
  }

  function calcularEpley(peso: number, reps: number) {
    return Number((peso * (1 + reps / 30)).toFixed(2));
  }

async function recargarManteniendoScroll() {
  const scrollActual = window.scrollY;

  await cargarTodo();

  setTimeout(() => {
    window.scrollTo({
      top: scrollActual,
      behavior: "auto",
    });
  }, 0);
}
  
async function recalcularRMActual(ejercicioId: string) {

  const { data: historial, error: historialError } = await supabase
    .from("rms_historial")
    .select("ejercicio_id,peso_kg,repeticiones,rm_calculado")
    .eq("alumno_id", alumnoId)
    .eq("ejercicio_id", ejercicioId)
    .order("rm_calculado", { ascending: false })
    .limit(1);

  if (historialError) {
    alert(historialError.message);
    return;
  }

  const mejor = historial?.[0];

  if (!mejor) {
    const { error: deleteError } = await supabase
      .from("rms_actuales")
      .delete()
      .eq("alumno_id", alumnoId)
      .eq("ejercicio_id", ejercicioId);

    if (deleteError) {
      alert(deleteError.message);
      return;
    }

    return;
  }

  const { data: existente, error: buscarActualError } = await supabase
    .from("rms_actuales")
    .select("id")
    .eq("alumno_id", alumnoId)
    .eq("ejercicio_id", ejercicioId)
    .maybeSingle();

  if (buscarActualError) {
    alert(buscarActualError.message);
    return;
  }

  if (!existente) {
    const { error: insertActualError } = await supabase
      .from("rms_actuales")
      .insert({
        alumno_id: alumnoId,
        ejercicio_id: ejercicioId,
        peso_kg: mejor.peso_kg,
        repeticiones: mejor.repeticiones,
        rm_calculado: mejor.rm_calculado,
        actualizado_en: new Date().toISOString(),
      });

    if (insertActualError) {
      alert(insertActualError.message);
      return;
    }
  } else {
    const { error: updateActualError } = await supabase
      .from("rms_actuales")
      .update({
        peso_kg: mejor.peso_kg,
        repeticiones: mejor.repeticiones,
        rm_calculado: mejor.rm_calculado,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", existente.id);

    if (updateActualError) {
      alert(updateActualError.message);
      return;
    }
  }
}

  function estaRutinaCacheCompleta(rutinaId: string, asignacionId: string): boolean {
    const ejercicios = ejerciciosPorRutina[rutinaId] || [];
    if (ejercicios.length === 0) return false;

    return ejercicios.every((ejercicio) =>
      ejercicioEstaCompletado(asignacionId, ejercicio.id)
    );
  }

  function hayProgresoEnRutina(_rutinaId: string, _asignacionId: string): boolean {
    return true;
  }

  async function verificarRutinaCacheCompleta(rutinaId: string, asignacionId: string) {
    return;
  }

  async function guardarCacheABD(asignacionId: string, rutinaId: string) {
    setGuardandoRutina(true);
    
    const ejerciciosDelCache = ejerciciosCompletadosCache.filter(
      (item) => item.rutina_asignacion_id === asignacionId
    );
    const entradasDelCache = entradaCalorCompletadaCache.filter(
      (item) => item.rutina_asignacion_id === asignacionId
    );

    try {
      for (const entradaCache of entradasDelCache) {
        const { error: deleteEntradaError } = await supabase
          .from("registros_entrenamiento")
          .delete()
          .eq("alumno_id", alumnoId)
          .eq("rutina_asignacion_id", asignacionId)
          .eq("entrada_calor_id", entradaCache.entrada_calor_id);

        if (deleteEntradaError) throw deleteEntradaError;

        const { error: entradaInsertError } = await supabase
          .from("registros_entrenamiento")
          .insert({
            alumno_id: alumnoId,
            rutina_id: entradaCache.rutina_id,
            rutina_asignacion_id: asignacionId,
            rutina_ejercicio_id: null,
            entrada_calor_id: entradaCache.entrada_calor_id,
            ejercicio_id: entradaCache.ejercicio_id || null,
            nombre_ejercicio: entradaCache.nombre_ejercicio,
            peso_kg: null,
            repeticiones: null,
            rpe: null,
            rir: null,
            rm_calculado: null,
            completado: true,
          });

        if (entradaInsertError) throw entradaInsertError;
      }
      for (const ejercicioCache of ejerciciosDelCache) {
        const { error: deleteError } = await supabase
          .from("registros_entrenamiento")
          .delete()
          .eq("alumno_id", alumnoId)
          .eq("rutina_asignacion_id", asignacionId)
          .eq("rutina_ejercicio_id", ejercicioCache.rutina_ejercicio_id);

        if (deleteError) throw deleteError;

        const seriesParaGuardar =
          ejercicioCache.tipo_configuracion === "avanzado" && ejercicioCache.series_realizadas?.length
            ? ejercicioCache.series_realizadas
            : [
                {
                  numero_serie: 1,
                  peso_kg: ejercicioCache.peso_kg,
                  repeticiones: ejercicioCache.repeticiones,
                  rm_calculado: ejercicioCache.rm_calculado,
                },
              ];

        const mejorSerieParaGuardar = [...seriesParaGuardar]
          .sort((a, b) => Number(b.rm_calculado || 0) - Number(a.rm_calculado || 0))[0];

        if (!mejorSerieParaGuardar) {
          throw new Error("No se encontró una serie válida para guardar.");
        }

        const { data: nuevoRegistro, error: registroError } = await supabase
          .from("registros_entrenamiento")
          .insert({
            alumno_id: alumnoId,
            rutina_id: ejercicioCache.rutina_id,
            rutina_asignacion_id: asignacionId,
            rutina_ejercicio_id: ejercicioCache.rutina_ejercicio_id,
            ejercicio_id: ejercicioCache.ejercicio_id,
            nombre_ejercicio: ejercicioCache.nombre_ejercicio,
            peso_kg: mejorSerieParaGuardar.peso_kg,
            repeticiones: mejorSerieParaGuardar.repeticiones,
            rpe: ejercicioCache.rpe,
            rir: ejercicioCache.rir,
            rm_calculado: mejorSerieParaGuardar.rm_calculado,
            completado: true,
          })
          .select("id,rm_calculado,peso_kg,repeticiones")
          .single();

        if (registroError) throw registroError;
        if (!nuevoRegistro) throw new Error("No se guardó el registro");

        if (ejercicioCache.ejercicio_id) {
          await supabase
            .from("rms_historial")
            .delete()
            .eq("alumno_id", alumnoId)
            .eq("rutina_id", rutinaId)
            .eq("rutina_ejercicio_id", ejercicioCache.rutina_ejercicio_id)
            .eq("rutina_asignacion_id", asignacionId);

          if (nuevoRegistro.rm_calculado !== null && nuevoRegistro.rm_calculado !== undefined) {
            await supabase.from("rms_historial").insert({
              alumno_id: alumnoId,
              ejercicio_id: ejercicioCache.ejercicio_id,
              rutina_id: rutinaId,
              rutina_ejercicio_id: ejercicioCache.rutina_ejercicio_id,
              rutina_asignacion_id: asignacionId,
              registro_entrenamiento_id: nuevoRegistro.id,
              peso_kg: nuevoRegistro.peso_kg,
              repeticiones: nuevoRegistro.repeticiones,
              rm_calculado: nuevoRegistro.rm_calculado,
              origen: "entrenamiento",
            });

            await recalcularRMActual(ejercicioCache.ejercicio_id);
          }
        }
      }

      // Marcar rutina como completada
      const { error: updateAsignacionError } = await supabase
        .from("rutina_asignaciones")
        .update({
          activa: false,
          completada: true,
          fecha_completada: new Date().toISOString(),
        })
        .eq("id", asignacionId);

      if (updateAsignacionError) throw updateAsignacionError;

      // Limpiar caché de esta rutina
      const ejerciciosRestantes = ejerciciosCompletadosCache.filter(
        (item) => item.rutina_asignacion_id !== asignacionId
      );
      const entradasRestantes = entradaCalorCompletadaCache.filter(
        (item) => item.rutina_asignacion_id !== asignacionId
      );

      setEjerciciosCompletadosCache(ejerciciosRestantes);
      setEntradaCalorCompletadaCache(entradasRestantes);

      if (alumnoId) {
        if (ejerciciosRestantes.length > 0 || entradasRestantes.length > 0) {
          localStorage.setItem(
            claveProgresoLocal(alumnoId),
            JSON.stringify({ ejercicios: ejerciciosRestantes, entradas: entradasRestantes })
          );
        } else {
          limpiarProgresoLocal();
        }
      }

      setGuardandoRutina(false);
      
      // Recargar
      await recargarManteniendoScroll();
    } catch (error: unknown) {
      setGuardandoRutina(false);
      alert(error instanceof Error ? error.message : "Error al guardar la rutina");
    }
  }

  async function revisarSiRutinaQuedoCompleta(
  rutinaId: string,
  asignacionId: string
) {
  const asignacionActual = rutinasAsignadas.find(
    (asignacion) => asignacion.asignacion_id === asignacionId
  );

  if (!asignacionActual) return;

  const ejercicios = ejerciciosPorRutina[rutinaId] || [];
  if (ejercicios.length === 0) return;

  const { data: registrosActualizados, error } = await supabase
    .from("registros_entrenamiento")
    .select("id,rutina_asignacion_id,rutina_ejercicio_id")
    .eq("alumno_id", alumnoId)
    .eq("rutina_asignacion_id", asignacionActual.asignacion_id)
    .eq("completado", true);

  if (error) {
    alert(error.message);
    return;
  }

  const idsCompletados = new Set(
    (registrosActualizados || [])
      .map((registro) => registro.rutina_ejercicio_id)
      .filter(Boolean)
  );

  const todosCompletados = ejercicios.every((ejercicio) =>
    idsCompletados.has(ejercicio.id)
  );

  if (!todosCompletados) return;

  const { error: updateError } = await supabase
    .from("rutina_asignaciones")
    .update({
      activa: false,
      completada: true,
      fecha_completada: new Date().toISOString(),
    })
    .eq("id", asignacionActual.asignacion_id);

  if (updateError) {
    alert(updateError.message);
  }
}

  async function completarEntradaCalor(item: EntradaCalorEjercicio, asignacionId: string) {
    if (!item.rutina_id) return;

    const asignacionActual = rutinasAsignadas.find(
      (asignacion) => asignacion.asignacion_id === asignacionId
    );

    if (!asignacionActual) {
      alert("No se encontró la asignación de esta rutina.");
      return;
    }

    if (entradaEstaCompletada(asignacionActual.asignacion_id, item.id)) {
      alert("Esta entrada en calor ya fue completada.");
      return;
    }

    const nuevaEntrada: EntradaCalorCompletadaCache = {
      entrada_calor_id: item.id,
      nombre_ejercicio: item.nombre_ejercicio,
      rutina_id: item.rutina_id,
      rutina_asignacion_id: asignacionActual.asignacion_id,
      ejercicio_id: item.ejercicio_id || null,
    };

    setEntradaCalorCompletadaCache((prev) => [...prev, nuevaEntrada]);
  }

  async function deshacerEntradaCalor(rutinaId: string, entradaId: string, asignacionId: string) {
    const confirmar = confirm("¿Querés deshacer esta entrada en calor?");
    if (!confirmar) return;

    const asignacionActual = rutinasAsignadas.find(
      (asignacion) => asignacion.asignacion_id === asignacionId
    );

    if (!asignacionActual) {
      alert("No se encontró la asignación de esta rutina.");
      return;
    }

    const estaEnCache = entradaCalorCompletadaCache.some(
      (item) =>
        item.rutina_asignacion_id === asignacionActual.asignacion_id &&
        item.entrada_calor_id === entradaId
    );

    if (estaEnCache) {
      setEntradaCalorCompletadaCache((prev) =>
        prev.filter(
          (item) =>
            !(item.rutina_asignacion_id === asignacionActual.asignacion_id && item.entrada_calor_id === entradaId)
        )
      );
      return;
    }

    const { error } = await supabase
      .from("registros_entrenamiento")
      .delete()
      .eq("alumno_id", alumnoId)
      .eq("rutina_asignacion_id", asignacionActual.asignacion_id)
      .eq("entrada_calor_id", entradaId);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .from("rutina_asignaciones")
      .update({
        activa: true,
        completada: false,
        fecha_completada: null,
      })
      .eq("id", asignacionActual.asignacion_id);

    // Actualizar estado local en vez de recargar todo
    setRegistros((prev) =>
      prev.filter(
        (r) =>
          !(r.rutina_asignacion_id === asignacionActual.asignacion_id && r.entrada_calor_id === entradaId)
      )
    );

    setRutinasAsignadas((prev) =>
      prev.map((a) =>
        a.asignacion_id === asignacionActual.asignacion_id
          ? { ...a, activa: true, completada: false, fecha_completada: null }
          : a
      )
    );
  }


  function abrirCompletado(item: RutinaEjercicio, asignacionId: string) {
    const asignacionActual = rutinasAsignadas.find(
      (asignacion) => asignacion.asignacion_id === asignacionId
    );

    if (!asignacionActual) {
      alert("No se encontró la asignación de esta rutina.");
      return;
    }

    if (ejercicioEstaCompletado(asignacionActual.asignacion_id, item.id)) {
      alert("Este ejercicio ya fue completado.");
      return;
    }

    setEjercicioSeleccionado({
      ...item,
      rutina_asignacion_id: asignacionActual.asignacion_id,
    } as RutinaEjercicio);

    const pesoSugerido = calcularPesoPorRM(item);

    if (pesoSugerido === "Peso corporal") {
      setPesoUsado("0");
    } else {
      setPesoUsado(pesoSugerido ? String(pesoSugerido).replace(" kg", "") : "");
    }

    setRepsRealizadas("");
    setRpe("");
    setRirReal("");

    if (item.tipo_configuracion === "avanzado") {
      const series = seriesPorEjercicio[item.id] || [];
      const valoresIniciales = series.reduce<Record<number, { peso: string; repeticiones: string }>>((acc, serie) => {
        acc[serie.numero_serie] = {
          peso: serie.peso || "",
          repeticiones: serie.repeticiones || "",
        };
        return acc;
      }, {});

      setSeriesRealizadas(valoresIniciales);
    } else {
      setSeriesRealizadas({});
    }
  }

  async function guardarCompletado() {
    if (!ejercicioSeleccionado || guardandoEjercicio) return;
    
    setGuardandoEjercicio(true);

    const asignacionActual = rutinasAsignadas.find(
      (asignacion) =>
        asignacion.asignacion_id === ejercicioSeleccionado.rutina_asignacion_id
    );

    if (!asignacionActual) {
      alert("No se encontró la asignación de esta rutina.");
      setGuardandoEjercicio(false);
      return;
    }

    if (
      ejercicioEstaCompletado(
        asignacionActual.asignacion_id,
        ejercicioSeleccionado.id
      )
    ) {
      alert("Este ejercicio ya fue completado.");
      setEjercicioSeleccionado(null);
      setGuardandoEjercicio(false);
      return;
    }

    if (!rpe) {
      alert("Completá el RPE.");
      setGuardandoEjercicio(false);
      return;
    }

    const esAvanzado = ejercicioSeleccionado.tipo_configuracion === "avanzado";
    const seriesConfiguradas = seriesPorEjercicio[ejercicioSeleccionado.id] || [];

    if (!esAvanzado && (pesoUsado === "" || !repsRealizadas)) {
      alert("Completá peso, repeticiones y RPE.");
      setGuardandoEjercicio(false);
      return;
    }

    if (esAvanzado) {
      const seriesIncompletas = seriesConfiguradas.some((serie) => {
        const valores = seriesRealizadas[serie.numero_serie];
        return !valores?.peso || !valores?.repeticiones;
      });

      if (seriesIncompletas) {
        alert("Completá peso y repeticiones en cada serie.");
        setGuardandoEjercicio(false);
        return;
      }
    }

    const rpeNumero = Number(rpe);
    const rirNumero = rirReal ? Number(rirReal) : null;

    if (Number.isNaN(rpeNumero)) {
      alert("Revisá el RPE ingresado.");
      setGuardandoEjercicio(false);
      return;
    }

    const esPesoCorporal = ejercicioSeleccionado.porcentaje_rm === "0";

    const seriesRealizadasFinales: SerieCompletadaCache[] = esAvanzado
      ? seriesConfiguradas.map((serie) => {
          const valores = seriesRealizadas[serie.numero_serie];
          const pesoNumeroSerie = Number(valores?.peso || 0);
          const repsNumeroSerie = Number(valores?.repeticiones || 0);

          return {
            numero_serie: serie.numero_serie,
            peso_kg: pesoNumeroSerie,
            repeticiones: repsNumeroSerie,
            rm_calculado: esPesoCorporal ? null : calcularEpley(pesoNumeroSerie, repsNumeroSerie),
          };
        })
      : [];

    if (
      esAvanzado &&
      seriesRealizadasFinales.some(
        (serie) => Number.isNaN(serie.peso_kg) || Number.isNaN(serie.repeticiones)
      )
    ) {
      alert("Revisá los valores ingresados en las series.");
      setGuardandoEjercicio(false);
      return;
    }

    const pesoNumero = esAvanzado ? seriesRealizadasFinales[0]?.peso_kg || 0 : Number(pesoUsado);
    const repsNumero = esAvanzado ? seriesRealizadasFinales[0]?.repeticiones || 0 : Number(repsRealizadas);

    if (!esAvanzado && (Number.isNaN(pesoNumero) || Number.isNaN(repsNumero))) {
      alert("Revisá los valores ingresados.");
      setGuardandoEjercicio(false);
      return;
    }

    const mejorSerie = seriesRealizadasFinales
      .filter((serie) => serie.rm_calculado !== null)
      .sort((a, b) => Number(b.rm_calculado || 0) - Number(a.rm_calculado || 0))[0];

    const rmCalculado = esAvanzado
      ? mejorSerie?.rm_calculado || null
      : esPesoCorporal
      ? null
      : calcularEpley(pesoNumero, repsNumero);

    // Agregar al caché local
    const nuevoEjercicioEnCache: EjercicioCompletadoCache = {
      rutina_ejercicio_id: ejercicioSeleccionado.id,
      nombre_ejercicio: ejercicioSeleccionado.nombre_ejercicio,
      peso_kg: pesoNumero,
      repeticiones: repsNumero,
      rpe: rpeNumero,
      rir: rirNumero,
      rm_calculado: rmCalculado,
      ejercicio_id: ejercicioSeleccionado.ejercicio_id || null,
      rutina_id: ejercicioSeleccionado.rutina_id,
      rutina_asignacion_id: asignacionActual.asignacion_id,
      tipo_configuracion: ejercicioSeleccionado.tipo_configuracion || "simple",
      series_realizadas: esAvanzado ? seriesRealizadasFinales : undefined,
    };

    setEjerciciosCompletadosCache((prev) => [
      ...prev.filter(
        (item) =>
          !(
            item.rutina_asignacion_id === nuevoEjercicioEnCache.rutina_asignacion_id &&
            item.rutina_ejercicio_id === nuevoEjercicioEnCache.rutina_ejercicio_id
          )
      ),
      nuevoEjercicioEnCache,
    ]);

    // Cerrar modal
    setEjercicioSeleccionado(null);
    setPesoUsado("");
    setRepsRealizadas("");
    setRpe("");
    setRirReal("");
    setSeriesRealizadas({});
    setGuardandoEjercicio(false);

    // Verificar si la rutina quedó completa (en caché)
    await verificarRutinaCacheCompleta(
      ejercicioSeleccionado.rutina_id,
      asignacionActual.asignacion_id
    );
  }

  async function deshacerCompletado(rutinaId: string, rutinaEjercicioId: string, asignacionId: string) {
    const confirmar = confirm("¿Querés deshacer este ejercicio?");
    if (!confirmar) return;

    const asignacionActual = rutinasAsignadas.find(
      (asignacion) => asignacion.asignacion_id === asignacionId
    );

    if (!asignacionActual) {
      alert("No se encontró la asignación de esta rutina.");
      return;
    }

    // Primero, intentar remover del caché
    const estaEnCache = ejerciciosCompletadosCache.some(
      (item) =>
        item.rutina_asignacion_id === asignacionActual.asignacion_id &&
        item.rutina_ejercicio_id === rutinaEjercicioId
    );

    if (estaEnCache) {
      // Remover del caché
      setEjerciciosCompletadosCache((prev) =>
        prev.filter(
          (item) =>
            !(
              item.rutina_asignacion_id === asignacionActual.asignacion_id &&
              item.rutina_ejercicio_id === rutinaEjercicioId
            )
        )
      );
      return;
    }

    // Si no está en caché, remover de BD
    const { data: registroActual } = await supabase
      .from("registros_entrenamiento")
      .select("ejercicio_id")
      .eq("alumno_id", alumnoId)
      .eq("rutina_asignacion_id", asignacionActual.asignacion_id)
      .eq("rutina_ejercicio_id", rutinaEjercicioId)
      .maybeSingle();

    await supabase
      .from("rms_historial")
      .delete()
      .eq("alumno_id", alumnoId)
      .eq("rutina_id", rutinaId)
      .eq("rutina_ejercicio_id", rutinaEjercicioId);

    const { error } = await supabase
      .from("registros_entrenamiento")
      .delete()
      .eq("alumno_id", alumnoId)
      .eq("rutina_asignacion_id", asignacionActual.asignacion_id)
      .eq("rutina_ejercicio_id", rutinaEjercicioId);

    if (error) {
      alert(error.message);
      return;
    }

    if (registroActual?.ejercicio_id) {
      await recalcularRMActual(registroActual.ejercicio_id);
    }

    await supabase
      .from("rutina_asignaciones")
      .update({
        activa: true,
        completada: false,
        fecha_completada: null,
      })
      .eq("id", asignacionActual.asignacion_id);

    // Actualizar estado local en vez de recargar todo
    setRegistros((prev) =>
      prev.filter(
        (r) =>
          !(r.rutina_asignacion_id === asignacionActual.asignacion_id && r.rutina_ejercicio_id === rutinaEjercicioId)
      )
    );

    setRutinasAsignadas((prev) =>
      prev.map((a) =>
        a.asignacion_id === asignacionActual.asignacion_id
          ? { ...a, activa: true, completada: false, fecha_completada: null }
          : a
      )
    );

    // Actualizar RM si se recalcularon
    if (registroActual?.ejercicio_id) {
      const { data: nuevoRM } = await supabase
        .from("rms_actuales")
        .select("id,ejercicio_id,rm_calculado")
        .eq("alumno_id", alumnoId)
        .eq("ejercicio_id", registroActual.ejercicio_id)
        .maybeSingle();

      if (nuevoRM) {
        setRmsActuales((prev) => {
          const existe = prev.find((r) => r.ejercicio_id === registroActual.ejercicio_id);
          if (existe) {
            return prev.map((r) =>
              r.ejercicio_id === registroActual.ejercicio_id ? nuevoRM : r
            );
          }
          return [...prev, nuevoRM];
        });
      } else {
        setRmsActuales((prev) =>
          prev.filter((r) => r.ejercicio_id !== registroActual.ejercicio_id)
        );
      }
    }
  }

  function renderRutinaCard(asignacion: RutinaAsignada) {
    const rutina =
      asignacion.rutinas || {
        id: asignacion.rutina_id,
        nombre: "Rutina finalizada",
        descripcion: null,
        objetivo: null,
        estructura: null,
        entrada_calor: null,
      };

    const completada = asignacionEstaCompletada(asignacion);
    const abierta = !!rutinasAbiertas[asignacion.asignacion_id];
    const entrada = entradaPorRutina[rutina.id] || [];
    const ejercicios = ejerciciosPorRutina[rutina.id] || [];

    return (
      <div
        key={asignacion.asignacion_id}
        className={`rounded-2xl border p-5 ${
          completada
            ? "border-emerald-800 bg-emerald-500/5"
            : "border-zinc-800 bg-zinc-900"
        }`}
      >
        <button
          type="button"
          onClick={() => toggleRutina(asignacion.asignacion_id)}
          className="w-full flex items-center justify-between gap-4"
        >
          <div className="text-left">
            <h2 className="text-2xl font-bold">{rutina.nombre}</h2>

            <div className="flex flex-wrap gap-2 mt-3">
              {rutina.objetivo && (
                <span className="text-sm rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1">
                  {rutina.objetivo}
                </span>
              )}

              {rutina.estructura && (
                <span className="text-sm rounded-full bg-zinc-800 text-zinc-300 px-3 py-1">
                  {rutina.estructura}
                </span>
              )}

              {asignacion.fecha_asignacion && (
                <span className="text-sm rounded-full bg-zinc-800 text-zinc-300 px-3 py-1">
                  Asignada: {asignacion.fecha_asignacion}
                </span>
              )}

              {asignacion.fecha_completada && (
                <span className="text-sm rounded-full bg-zinc-800 text-zinc-300 px-3 py-1">
                  Completada: {asignacion.fecha_completada.slice(0, 10)}
                </span>
              )}

              {completada && (
                <span className="text-sm rounded-full bg-emerald-600 text-white px-3 py-1 font-bold">
                  COMPLETADA
                </span>
              )}
            </div>

            {rutina.descripcion && (
              <p className="text-zinc-400 mt-3">{rutina.descripcion}</p>
            )}
          </div>

          <span className="text-2xl">{abierta ? "▲" : "▼"}</span>
        </button>

        {abierta && (
          <div className="mt-6 space-y-4">
            <section className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-xl font-semibold mb-4">Entrada en calor</h3>

              {entrada.length === 0 ? (
                <p className="text-zinc-500">Sin entrada en calor cargada.</p>
              ) : (
                <div className="space-y-3">
                  {entrada.map((item) => {
                    const itemCompletado = entradaEstaCompletada(
                      asignacion.asignacion_id,
                      item.id
                    );

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-xl p-4 ${
                          itemCompletado
                            ? "border-emerald-800 bg-emerald-500/5"
                            : "border-zinc-800"
                        }`}
                      >
                        <h4 className="font-semibold text-lg">
                          {item.nombre_ejercicio}
                        </h4>

                        <p className="text-zinc-400 mt-1">
                          {item.series || "-"} series · {textoPrescripcion(item)}
                        </p>

                        {item.observaciones && (
                          <p className="text-zinc-500 mt-3 whitespace-pre-wrap">
                            {item.observaciones}
                          </p>
                        )}

                        {item.youtube_url && (
                          <a
                            href={item.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 block w-full rounded-lg border border-red-800 bg-red-500/10 px-3 py-2 text-center text-sm font-semibold text-red-400 hover:bg-red-500/20"
                          >
                            ▶ Ver video
                          </a>
                        )}

                        {itemCompletado ? (
                          <button
                            type="button"
                            onClick={() =>
                              item.rutina_id &&
                              deshacerEntradaCalor(item.rutina_id, item.id, asignacion.asignacion_id)
                            }
                            className="mt-4 w-full rounded-lg border border-yellow-700 bg-yellow-500/10 px-3 py-2 text-sm font-semibold text-yellow-400 hover:bg-yellow-500/20"
                          >
                            ↩ Deshacer entrada en calor
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => completarEntradaCalor(item, asignacion.asignacion_id)}
                            disabled={completada}
                            className={`mt-4 w-full rounded-lg px-3 py-2 text-sm font-semibold ${
                              completada
                                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                : "bg-emerald-500 text-white hover:bg-emerald-600"
                            }`}
                          >
                            Completar entrada en calor
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-xl font-semibold mb-4">Ejercicios</h3>

              {ejercicios.length === 0 ? (
                <p className="text-zinc-400">
                  Todavía no hay ejercicios cargados en esta rutina.
                </p>
              ) : (
                <div className="space-y-3">
                  {ejercicios.map((item) => {
                    const pesoSugerido = calcularPesoPorRM(item);
                    const itemCompletado = ejercicioEstaCompletado(
                      asignacion.asignacion_id,
                      item.id
                    );

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-xl p-4 ${
                          itemCompletado
                            ? "border-emerald-800 bg-emerald-500/5"
                            : "border-zinc-800"
                        }`}
                      >
                        <h4 className="font-semibold text-lg">
                          {item.nombre_ejercicio}
                        </h4>

                        <p className="text-zinc-400 mt-1">
                          {item.series || "-"} series · {item.tipo_configuracion === "avanzado"
                            ? textoPrescripcionAvanzada(seriesPorEjercicio[item.id] || [])
                            : textoPrescripcion(item)}
                        </p>

                        {item.tipo_configuracion === "avanzado" && (
                          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                            <p className="text-xs font-semibold text-zinc-400 mb-2">
                              Series indicadas
                            </p>

                            <div className="space-y-1 text-sm text-zinc-300">
                              {(seriesPorEjercicio[item.id] || []).map((serie) => (
                                <div
                                  key={serie.id}
                                  className="flex justify-between gap-3"
                                >
                                  <span>Serie {serie.numero_serie}</span>
                                  <span>
                                    {serie.repeticiones || "-"} reps · {serie.peso || "-"} kg
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-3 text-sm">
                          {item.peso && (
                            <span className="rounded-full bg-zinc-800 px-3 py-1">
                              Peso indicado: {item.peso}
                            </span>
                          )}

                          {item.porcentaje_rm && (
                            <span className="rounded-full bg-zinc-800 px-3 py-1">
                              {item.porcentaje_rm === "0"
                                ? "%RM: Peso corporal"
                                : `%RM: ${item.porcentaje_rm}%`}
                            </span>
                          )}

                          {pesoSugerido && (
                            <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1">
                              Peso sugerido: {pesoSugerido}
                            </span>
                          )}

                          {item.rir && (
                            <span className="rounded-full bg-zinc-800 px-3 py-1">
                              RIR: {item.rir}
                            </span>
                          )}

                          {item.descanso && (
                            <span className="rounded-full bg-zinc-800 px-3 py-1">
                              Descanso entre series: {item.descanso}
                            </span>
                          )}
                        </div>

                        {item.observaciones && (
                          <p className="text-zinc-500 mt-3 whitespace-pre-wrap">
                            {item.observaciones}
                          </p>
                        )}

                        {item.youtube_url && (
                          <a
                            href={item.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 block w-full rounded-lg border border-red-800 bg-red-500/10 px-3 py-2 text-center text-sm font-semibold text-red-400 hover:bg-red-500/20"
                          >
                            ▶ Ver video
                          </a>
                        )}

                        {itemCompletado ? (
                          <button
                            type="button"
                            onClick={() => deshacerCompletado(rutina.id, item.id, asignacion.asignacion_id)}
                            className="mt-4 w-full rounded-lg border border-yellow-700 bg-yellow-500/10 px-3 py-2 text-sm font-semibold text-yellow-400 hover:bg-yellow-500/20"
                          >
                            ↩ Deshacer
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => abrirCompletado(item, asignacion.asignacion_id)}
                            disabled={completada}
                            className={`mt-4 w-full rounded-lg px-3 py-2 text-sm font-semibold ${
                              completada
                                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                : "bg-emerald-500 text-white hover:bg-emerald-600"
                            }`}
                          >
                            Completar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {completada ? (
                <div className="mt-5 rounded-xl border border-emerald-800 bg-emerald-500/10 p-4 text-center font-semibold text-emerald-400">
                  ✓ Rutina completada
                </div>
              ) : estaRutinaCacheCompleta(asignacion.rutina_id, asignacion.asignacion_id) ? (
                <button
                  type="button"
                  onClick={() => guardarCacheABD(asignacion.asignacion_id, asignacion.rutina_id)}
                  disabled={guardandoRutina}
                  className={`mt-5 w-full rounded-xl py-3 font-semibold flex items-center justify-center gap-2 ${
                    guardandoRutina
                      ? "bg-emerald-600 opacity-70 cursor-not-allowed"
                      : "bg-emerald-500 hover:bg-emerald-600"
                  }`}
                >
                  {guardandoRutina && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {guardandoRutina ? "Guardando rutina..." : "Completar Rutina"}
                </button>
              ) : hayProgresoEnRutina(asignacion.rutina_id, asignacion.asignacion_id) ? (
                <button
                  type="button"
                  onClick={guardarProgresoActual}
                  className="mt-5 w-full rounded-xl border border-blue-700 bg-blue-500/10 py-3 font-semibold text-blue-300 hover:bg-blue-500/20"
                >
                  Guardar progreso
                </button>
              ) : null}
            </section>
          </div>
        )}
      </div>
    );
  }

  async function deshacerRutinaCompleta(asignacion: RutinaAsignada) {
  const confirmar = confirm("¿Querés deshacer esta rutina completada?");
  if (!confirmar) return;

  const { data: registrosABorrar, error: buscarError } = await supabase
    .from("registros_entrenamiento")
    .select("id, ejercicio_id")
    .eq("alumno_id", alumnoId)
    .eq("rutina_asignacion_id", asignacion.asignacion_id);

  if (buscarError) {
    alert(buscarError.message);
    return;
  }

  const ejercicioIds = Array.from(
    new Set(
      (registrosABorrar || [])
        .map((registro) => registro.ejercicio_id)
        .filter(Boolean)
    )
  ) as string[];

  const registroIds = (registrosABorrar || []).map((registro) => registro.id);

  if (registroIds.length > 0) {
    const { error: rmHistorialError } = await supabase
      .from("rms_historial")
      .delete()
      .in("registro_entrenamiento_id", registroIds);

    if (rmHistorialError) {
      alert(rmHistorialError.message);
      return;
    }
  }

  const { error: registrosError } = await supabase
    .from("registros_entrenamiento")
    .delete()
    .eq("alumno_id", alumnoId)
    .eq("rutina_asignacion_id", asignacion.asignacion_id);

  if (registrosError) {
    alert(registrosError.message);
    return;
  }

  const { error: asignacionError } = await supabase
    .from("rutina_asignaciones")
    .update({
      activa: true,
      completada: false,
      fecha_completada: null,
    })
    .eq("id", asignacion.asignacion_id);

  if (asignacionError) {
    alert(asignacionError.message);
    return;
  }

  if (ejercicioIds.length > 0) {
  const { error: limpiarActualesError } = await supabase
    .from("rms_actuales")
    .delete()
    .eq("alumno_id", alumnoId)
    .in("ejercicio_id", ejercicioIds);

  if (limpiarActualesError) {
    alert(limpiarActualesError.message);
    return;
  }

  for (const ejercicioId of ejercicioIds) {
    await recalcularRMActual(ejercicioId);
  }
}

  if (ejercicioIds.length > 0) {
  const { error: limpiarActualesError } = await supabase
    .from("rms_actuales")
    .delete()
    .eq("alumno_id", alumnoId)
    .in("ejercicio_id", ejercicioIds);

  if (limpiarActualesError) {
    alert(limpiarActualesError.message);
    return;
  }

  for (const ejercicioId of ejercicioIds) {
    await recalcularRMActual(ejercicioId);
  }
}

  await recargarManteniendoScroll();
}

  function renderCompletadoCard(asignacion: RutinaAsignada) {
  const rutina =
  asignacion.rutinas ||
  rutinasAsignadas.find((item) => item.rutina_id === asignacion.rutina_id)
    ?.rutinas ||
  null;
  const abierta = !!rutinasAbiertas[asignacion.asignacion_id];

  const registrosDeEstaRutina = registros
  .filter((registro) => registro.rutina_asignacion_id === asignacion.asignacion_id)
  .filter((registro, index, array) => {
    const clave =
      registro.rutina_ejercicio_id ||
      registro.entrada_calor_id ||
      registro.id;

    return (
      array.findIndex((item) => {
        const claveItem =
          item.rutina_ejercicio_id ||
          item.entrada_calor_id ||
          item.id;

        return claveItem === clave;
      }) === index
    );
  });

  return (
    <div
      key={asignacion.asignacion_id}
      className="rounded-2xl border border-emerald-800 bg-emerald-500/5 p-5"
    >
      <button
        type="button"
        onClick={() => toggleRutina(asignacion.asignacion_id)}
        className="w-full flex items-center justify-between gap-4"
      >
        <div className="text-left">
          <h2 className="text-2xl font-bold">
            {rutina?.nombre || "Rutina completada"}
          </h2>

          <div className="flex flex-wrap gap-2 mt-3">
            {rutina?.estructura && (
              <span className="text-sm rounded-full bg-zinc-800 text-zinc-300 px-3 py-1">
                {rutina.estructura}
              </span>
            )}

            {rutina?.objetivo && (
              <span className="text-sm rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1">
                {rutina.objetivo}
              </span>
            )}

            <span className="text-sm rounded-full bg-emerald-600 text-white px-3 py-1 font-bold">
              COMPLETADA
            </span>
          </div>
        </div>

        <span className="text-2xl">{abierta ? "▲" : "▼"}</span>
      </button>

      {abierta && (
        <div className="mt-5 space-y-3">
          {registrosDeEstaRutina.length === 0 ? (
            <p className="text-zinc-400">
              No hay detalles guardados para este entrenamiento.
            </p>
          ) : (
            registrosDeEstaRutina.map((registro) => (
              <div
                key={registro.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
              >
                <h3 className="font-semibold">
                  {registro.nombre_ejercicio || "Ejercicio"}
                </h3>

                <div className="flex flex-wrap gap-2 mt-2 text-sm">
                  {registro.peso_kg !== null && registro.peso_kg !== undefined && (
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
                </div>
              </div>
            ))
          )}

          <button
            type="button"
            onClick={() => deshacerRutinaCompleta(asignacion)}
            className="mt-4 w-full rounded-lg border border-yellow-700 bg-yellow-500/10 px-3 py-2 text-sm font-semibold text-yellow-400 hover:bg-yellow-500/20"
          >
            ↩ Deshacer rutina completada
          </button>
        </div>
      )}
    </div>
  );
}

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando rutinas...
      </main>
    );
  }

  const entrenamientosCompletados = rutinasAsignadas
    .filter((asignacion) => asignacionEstaCompletada(asignacion))
    .sort((a, b) => {
      const fechaA = a.fecha_completada || a.fecha_asignacion || "";
      const fechaB = b.fecha_completada || b.fecha_asignacion || "";
      return fechaB.localeCompare(fechaA);
    });

  const proximosEntrenamientos = rutinasAsignadas
    .filter((asignacion) => !asignacionEstaCompletada(asignacion))
    .slice(0, 3);

  const completadosFiltrados = fechaCompletados
    ? entrenamientosCompletados.filter((asignacion) =>
        (asignacion.fecha_completada || asignacion.fecha_asignacion || "")
          .slice(0, 10)
          .startsWith(fechaCompletados)
      )
    : entrenamientosCompletados.slice(0, 3);

  const noHayEntrenamientos =
    proximosEntrenamientos.length === 0 &&
    entrenamientosCompletados.length === 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      {mostrarAlertaSalida && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-2xl font-bold">Tenés progreso sin guardar</h2>
            <p className="mt-3 text-zinc-400">
              Si salís ahora, podés perder lo que anotaste. Podés guardar el progreso en este dispositivo y continuar después.
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={guardarYSalir}
                disabled={guardandoAntesDeSalir}
                className={`w-full rounded-xl py-3 font-semibold ${
                  guardandoAntesDeSalir
                    ? "bg-emerald-600 opacity-70 cursor-not-allowed"
                    : "bg-emerald-500 hover:bg-emerald-600"
                }`}
              >
                {guardandoAntesDeSalir ? "Guardando..." : "Guardar progreso y salir"}
              </button>

              <button
                type="button"
                onClick={salirSinGuardar}
                disabled={guardandoAntesDeSalir}
                className="w-full rounded-xl border border-red-800 bg-red-500/10 py-3 font-semibold text-red-300 hover:bg-red-500/20"
              >
                Salir sin guardar
              </button>

              <button
                type="button"
                onClick={cerrarAlertaSalida}
                disabled={guardandoAntesDeSalir}
                className="w-full rounded-xl border border-zinc-700 py-3 font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Mis rutinas</h1>

        <p className="text-zinc-400 mb-6">
          Al completar todas las sesiones, enviar mensaje privado para asignar
          nuevos entrenamientos.
        </p>

        {noHayEntrenamientos ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">
              No hay entrenamientos asignados
            </h2>
            <p className="text-zinc-400 mt-2">
              Cuando tu profesor cargue una rutina, va a aparecer acá.
            </p>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <button
                type="button"
                onClick={() => setMostrarProximos(!mostrarProximos)}
                className="w-full flex items-center justify-between gap-4"
              >
                <div className="text-left">
                  <h2 className="text-2xl font-bold">
                    Próximos entrenamientos
                  </h2>
                  <p className="text-zinc-400 mt-1">
                    {proximosEntrenamientos.length === 0
                      ? "No tenés entrenamientos pendientes."
                      : `Mostrando ${proximosEntrenamientos.length} de los próximos 3.`}
                  </p>
                </div>
                <span className="text-2xl">
                  {mostrarProximos ? "▲" : "▼"}
                </span>
              </button>

              {mostrarProximos && (
                <div className="mt-5 space-y-4">
                  {proximosEntrenamientos.length === 0 ? (
                    <p className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-zinc-400">
                      No hay entrenamientos pendientes por ahora.
                    </p>
                  ) : (
                    proximosEntrenamientos.map(renderRutinaCard)
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <button
                type="button"
                onClick={() => setMostrarCompletados(!mostrarCompletados)}
                className="w-full flex items-center justify-between gap-4"
              >
                <div className="text-left">
                  <h2 className="text-2xl font-bold">
                    Entrenamientos completados
                  </h2>
                  <p className="text-zinc-400 mt-1">
                    {entrenamientosCompletados.length === 0
                      ? "Todavía no completaste entrenamientos."
                      : `Últimos 3 de ${entrenamientosCompletados.length} completados.`}
                  </p>
                </div>
                <span className="text-2xl">
                  {mostrarCompletados ? "▲" : "▼"}
                </span>
              </button>

              {mostrarCompletados && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                    <label className="block text-sm font-medium text-zinc-300">
                      Buscar por fecha
                    </label>

                    <div className="mt-2 flex flex-col gap-2 md:flex-row">
                      <div className="relative w-full">
                        <input
                          type="date"
                          value={fechaCompletados}
                          onChange={(event) =>
                            setFechaCompletados(event.target.value)
                          }
                          onClick={(event) => event.currentTarget.showPicker?.()}
                          className="w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white"
                        />
                      </div>

                      {fechaCompletados && (
                        <button
                          type="button"
                          onClick={() => setFechaCompletados("")}
                          className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>

                  {completadosFiltrados.length === 0 ? (
                    <p className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-zinc-400">
                      No se encontraron entrenamientos completados para esa fecha.
                    </p>
                  ) : (
                    completadosFiltrados.map(renderCompletadoCard)
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {ejercicioSeleccionado && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-1">
                Ejercicio completado
              </h2>

              <p className="text-zinc-400 mb-4">
                {ejercicioSeleccionado.nombre_ejercicio}
              </p>

              <div className="space-y-3">
                {ejercicioSeleccionado.tipo_configuracion === "avanzado" ? (
                  <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
                    <p className="text-sm font-semibold text-zinc-300">Cargar cada serie</p>

                    {(seriesPorEjercicio[ejercicioSeleccionado.id] || []).map((serie) => (
                      <div key={serie.id} className="grid grid-cols-[70px_1fr_1fr] gap-2 items-center">
                        <span className="text-sm text-zinc-400">Serie {serie.numero_serie}</span>

                        <input
                          type="number"
                          value={seriesRealizadas[serie.numero_serie]?.peso || ""}
                          onChange={(e) =>
                            setSeriesRealizadas((actual) => ({
                              ...actual,
                              [serie.numero_serie]: {
                                peso: e.target.value,
                                repeticiones: actual[serie.numero_serie]?.repeticiones || "",
                              },
                            }))
                          }
                          className="w-full bg-zinc-800 rounded-xl p-3"
                          placeholder="Peso"
                        />

                        <input
                          type="number"
                          value={seriesRealizadas[serie.numero_serie]?.repeticiones || ""}
                          onChange={(e) =>
                            setSeriesRealizadas((actual) => ({
                              ...actual,
                              [serie.numero_serie]: {
                                peso: actual[serie.numero_serie]?.peso || "",
                                repeticiones: e.target.value,
                              },
                            }))
                          }
                          className="w-full bg-zinc-800 rounded-xl p-3"
                          placeholder="Reps"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <input
                      type="number"
                      value={pesoUsado}
                      onChange={(e) => setPesoUsado(e.target.value)}
                      className="w-full bg-zinc-800 rounded-xl p-3"
                      placeholder="Peso usado en kg (0 = peso corporal)"
                    />

                    <input
                      type="number"
                      value={repsRealizadas}
                      onChange={(e) => setRepsRealizadas(e.target.value)}
                      className="w-full bg-zinc-800 rounded-xl p-3"
                      placeholder="Repeticiones realizadas"
                    />
                  </>
                )}

                <select
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                >
                  <option value="">RPE</option>
                  {opcionesRPE.map((valor) => (
                    <option key={valor} value={String(valor)}>
                      {valor}{" "}
                      {valor === 1
                        ? "- muy fácil"
                        : valor === 10
                          ? "- muy difícil"
                          : ""}
                    </option>
                  ))}
                </select>

                <select
                  value={rirReal}
                  onChange={(e) => setRirReal(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                >
                  <option value="">RIR opcional</option>
                  {opcionesRIR.map((valor) => (
                    <option key={valor} value={String(valor)}>
                      {valor}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setEjercicioSeleccionado(null)}
                  className="flex-1 border border-zinc-700 rounded-xl py-3"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarCompletado}
                  disabled={guardandoEjercicio}
                  className={`flex-1 rounded-xl py-3 font-semibold flex items-center justify-center gap-2 ${
                    guardandoEjercicio
                      ? "bg-emerald-600 opacity-70 cursor-not-allowed"
                      : "bg-emerald-500 hover:bg-emerald-600"
                  }`}
                >
                  {guardandoEjercicio && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {guardandoEjercicio ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recalcularRMActual } from "@/lib/recalcularRMActual";

// ─── Types ────────────────────────────────────────────────────────────────────

type Alumno = {
  id: string;
  nombre: string | null;
  apellido?: string | null;
  email?: string | null;
};

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

type ProgresoRutinaCache = {
  ejercicios: EjercicioCompletadoCache[];
  entradas: EntradaCalorCompletadaCache[];
};

type CacheRegistrarEntrenamientos = {
  alumnosEntrenando: Alumno[];
  alumnoSeleccionado: Alumno | null;
};

type AlumnoRelacion = Alumno | Alumno[] | null;

type AlumnoSugerenciaResponse = {
  alumno_id?: string | null;
  alumnos?: AlumnoRelacion;
  rm_calculado?: number | null;
  created_at?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = "registrar-entrenamientos-cache-v3";
const opcionesRPE = Array.from({ length: 10 }, (_, i) => i + 1);
const opcionesRIR = Array.from({ length: 10 }, (_, i) => i + 1);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nombreAlumno(alumno: Alumno): string {
  return `${alumno.nombre ?? ""} ${alumno.apellido ?? ""}`.trim() || "Alumno sin nombre";
}

function normalizarRutina(rutinas?: RutinaRelacion): Rutina | null {
  if (Array.isArray(rutinas)) return rutinas[0] || null;
  return rutinas || null;
}

function normalizarAlumnoRelacion(alumnos?: AlumnoRelacion): Alumno | null {
  if (Array.isArray(alumnos)) return alumnos[0] || null;
  return alumnos || null;
}

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
    .map((s) => `S${s.numero_serie}: ${s.repeticiones || "-"} x ${s.peso || "-"} kg`)
    .join(" · ");
}

function calcularEpley(peso: number, reps: number) {
  return Number((peso * (1 + reps / 30)).toFixed(2));
}

function claveProgresoLocal(alumnoId: string) {
  return `rutina_progreso_coach_${alumnoId}`;
}

// ─── PanelAlumno ─────────────────────────────────────────────────────────────

function PanelAlumno({ alumno }: { alumno: Alumno }) {
  const alumnoId = alumno.id;

  const [loading, setLoading] = useState(true);
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
  const [guardandoEjercicio, setGuardandoEjercicio] = useState(false);
  const [guardandoRutina, setGuardandoRutina] = useState(false);

  const [ejerciciosCompletadosCache, setEjerciciosCompletadosCache] = useState<EjercicioCompletadoCache[]>([]);
  const [entradaCalorCompletadaCache, setEntradaCalorCompletadaCache] = useState<EntradaCalorCompletadaCache[]>([]);

  const progresoLocalCargadoRef = useRef(false);

  // Cargar datos cuando cambia el alumno
  useEffect(() => {
    progresoLocalCargadoRef.current = false;
    setEjerciciosCompletadosCache([]);
    setEntradaCalorCompletadaCache([]);
    setRutinasAbiertas({});
    cargarTodo();
  }, [alumnoId]);

  // Restaurar progreso local
  useEffect(() => {
    if (!alumnoId) return;
    progresoLocalCargadoRef.current = false;

    const guardado = localStorage.getItem(claveProgresoLocal(alumnoId));
    if (!guardado) {
      progresoLocalCargadoRef.current = true;
      return;
    }

    try {
      const progreso = JSON.parse(guardado) as ProgresoRutinaCache;
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

  // Persistir progreso
  useEffect(() => {
    if (!alumnoId || !progresoLocalCargadoRef.current) return;
    const progreso: ProgresoRutinaCache = {
      ejercicios: ejerciciosCompletadosCache,
      entradas: entradaCalorCompletadaCache,
    };
    if (progreso.ejercicios.length === 0 && progreso.entradas.length === 0) {
      localStorage.removeItem(claveProgresoLocal(alumnoId));
    } else {
      localStorage.setItem(claveProgresoLocal(alumnoId), JSON.stringify(progreso));
    }
  }, [alumnoId, ejerciciosCompletadosCache, entradaCalorCompletadaCache]);

  async function cargarTodo() {
    setLoading(true);

    const asignacionesSelect = `
        id, rutina_id, activa, fecha_asignacion, orden,
        completada, fecha_completada, created_at,
        rutinas (id, nombre, descripcion, objetivo, estructura, entrada_calor)
      `;

    const { data: asignacionesActivasData, error: asignacionesActivasError } = await supabase
      .from("rutina_asignaciones")
      .select(asignacionesSelect)
      .eq("alumno_id", alumnoId)
      .eq("activa", true)
      .neq("completada", true)
      .order("fecha_asignacion", { ascending: true })
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(2);

    const { data: asignacionesCompletadasData, error: asignacionesCompletadasError } = await supabase
      .from("rutina_asignaciones")
      .select(asignacionesSelect)
      .eq("alumno_id", alumnoId)
      .eq("completada", true)
      .order("fecha_completada", { ascending: false })
      .order("fecha_asignacion", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2);

    const asignacionesData = [
      ...(asignacionesActivasData || []),
      ...(asignacionesCompletadasData || []),
    ];

    const asignacionesError = asignacionesActivasError || asignacionesCompletadasError;

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
      const { data: rutinasData } = await supabase
        .from("rutinas")
        .select("id,nombre,descripcion,objetivo,estructura,entrada_calor")
        .in("id", rutinaIds);
      rutinasBase = rutinasData || [];
    }

    const asignacionesTipadas = (
      (asignacionesData || []) as RutinaAsignacionResponse[]
    ).map((item) => {
      const rutinaRelacion = normalizarRutina(item.rutinas);
      const rutinaManual = rutinasBase.find((r) => r.id === item.rutina_id) || null;
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

    // Ejercicios
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

    // Series avanzadas
    const ejerciciosAvanzadosIds = (rutinaEjercicios || [])
      .filter((item) => item.tipo_configuracion === "avanzado")
      .map((item) => item.id);

    let seriesAgrupadas: Record<string, RutinaEjercicioSerie[]> = {};
    if (ejerciciosAvanzadosIds.length > 0) {
      const { data: seriesData } = await supabase
        .from("rutina_ejercicio_series")
        .select("id,rutina_ejercicio_id,numero_serie,repeticiones,peso")
        .in("rutina_ejercicio_id", ejerciciosAvanzadosIds)
        .order("numero_serie", { ascending: true });

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
    (rutinaEjercicios || []).forEach((item) => {
      if (!agrupadosEjercicios[item.rutina_id]) agrupadosEjercicios[item.rutina_id] = [];
      agrupadosEjercicios[item.rutina_id].push(item);
    });

    // Entrada en calor
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

    const agrupadaEntrada: Record<string, EntradaCalorEjercicio[]> = {};
    (entrada || []).forEach((item) => {
      if (!item.rutina_id) return;
      if (!agrupadaEntrada[item.rutina_id]) agrupadaEntrada[item.rutina_id] = [];
      agrupadaEntrada[item.rutina_id].push(item);
    });

    // Registros existentes
    const asignacionIds = asignacionesTipadas.map((a) => a.asignacion_id);
    const { data: registrosData } = await supabase
      .from("registros_entrenamiento")
      .select("id,rutina_id,rutina_asignacion_id,rutina_ejercicio_id,entrada_calor_id,ejercicio_id,nombre_ejercicio,peso_kg,repeticiones,rpe,rir")
      .eq("alumno_id", alumnoId)
      .in("rutina_asignacion_id", asignacionIds)
      .eq("completado", true);

    // RMs
    const { data: rms } = await supabase
      .from("rms_actuales")
      .select("id,ejercicio_id,rm_calculado")
      .eq("alumno_id", alumnoId);

    setRutinasAsignadas(asignacionesTipadas);
    setEjerciciosPorRutina(agrupadosEjercicios);
    setSeriesPorEjercicio(seriesAgrupadas);
    setEntradaPorRutina(agrupadaEntrada);
    setRegistros(registrosData || []);
    setRmsActuales(rms || []);
    setLoading(false);
  }

  // ─── Helpers de estado ─────────────────────────────────────────────────────

  function ejercicioEstaCompletado(asignacionId: string, ejercicioId: string) {
    return (
      ejerciciosCompletadosCache.some(
        (item) => item.rutina_asignacion_id === asignacionId && item.rutina_ejercicio_id === ejercicioId
      ) ||
      registros.some(
        (r) => r.rutina_asignacion_id === asignacionId && r.rutina_ejercicio_id === ejercicioId
      )
    );
  }

  function entradaEstaCompletada(asignacionId: string, entradaId: string) {
    return (
      entradaCalorCompletadaCache.some(
        (item) => item.rutina_asignacion_id === asignacionId && item.entrada_calor_id === entradaId
      ) ||
      registros.some(
        (r) => r.rutina_asignacion_id === asignacionId && r.entrada_calor_id === entradaId
      )
    );
  }

  function asignacionEstaCompletada(asignacion: RutinaAsignada) {
    return asignacion.completada === true || asignacion.activa === false;
  }

  function estaRutinaCacheCompleta(rutinaId: string, asignacionId: string) {
    const ejercicios = ejerciciosPorRutina[rutinaId] || [];
    if (ejercicios.length === 0) return false;
    return ejercicios.every((ej) => ejercicioEstaCompletado(asignacionId, ej.id));
  }

  function calcularPesoPorRM(item: RutinaEjercicio) {
    if (!item.ejercicio_id || !item.porcentaje_rm) return null;
    if (item.porcentaje_rm === "0") return "Peso corporal";
    const porcentaje = Number(String(item.porcentaje_rm).replace("%", "").trim());
    if (!porcentaje || Number.isNaN(porcentaje)) return null;
    const rm = rmsActuales.find((r) => r.ejercicio_id === item.ejercicio_id);
    if (!rm?.rm_calculado) return null;
    return `${Number(((Number(rm.rm_calculado) * porcentaje) / 100).toFixed(1))} kg`;
  }

  function toggleRutina(asignacionId: string) {
    setRutinasAbiertas((prev) => ({ ...prev, [asignacionId]: !prev[asignacionId] }));
  }

  // ─── Acciones ──────────────────────────────────────────────────────────────

  function guardarProgresoActual() {
    const progreso: ProgresoRutinaCache = {
      ejercicios: ejerciciosCompletadosCache,
      entradas: entradaCalorCompletadaCache,
    };
    localStorage.setItem(claveProgresoLocal(alumnoId), JSON.stringify(progreso));
    alert("Progreso guardado en este dispositivo. Al completar la rutina se guarda definitivamente.");
  }

  async function completarEntradaCalor(item: EntradaCalorEjercicio, asignacionId: string) {
    if (!item.rutina_id) return;
    if (entradaEstaCompletada(asignacionId, item.id)) return;
    const nueva: EntradaCalorCompletadaCache = {
      entrada_calor_id: item.id,
      nombre_ejercicio: item.nombre_ejercicio,
      rutina_id: item.rutina_id,
      rutina_asignacion_id: asignacionId,
      ejercicio_id: item.ejercicio_id || null,
    };
    setEntradaCalorCompletadaCache((prev) => [...prev, nueva]);
  }

  async function deshacerEntradaCalor(rutinaId: string, entradaId: string, asignacionId: string) {
    if (!confirm("¿Querés deshacer esta entrada en calor?")) return;

    const estaEnCache = entradaCalorCompletadaCache.some(
      (item) => item.rutina_asignacion_id === asignacionId && item.entrada_calor_id === entradaId
    );

    if (estaEnCache) {
      setEntradaCalorCompletadaCache((prev) =>
        prev.filter((item) => !(item.rutina_asignacion_id === asignacionId && item.entrada_calor_id === entradaId))
      );
      return;
    }

    const { error } = await supabase
      .from("registros_entrenamiento")
      .delete()
      .eq("alumno_id", alumnoId)
      .eq("rutina_asignacion_id", asignacionId)
      .eq("entrada_calor_id", entradaId);

    if (error) { alert(error.message); return; }

    await supabase
      .from("rutina_asignaciones")
      .update({ activa: true, completada: false, fecha_completada: null })
      .eq("id", asignacionId);

    setRegistros((prev) =>
      prev.filter((r) => !(r.rutina_asignacion_id === asignacionId && r.entrada_calor_id === entradaId))
    );
    setRutinasAsignadas((prev) =>
      prev.map((a) => a.asignacion_id === asignacionId ? { ...a, activa: true, completada: false, fecha_completada: null } : a)
    );
  }

  function abrirCompletado(item: RutinaEjercicio, asignacionId: string) {
    if (ejercicioEstaCompletado(asignacionId, item.id)) {
      alert("Este ejercicio ya fue completado.");
      return;
    }

    setEjercicioSeleccionado({ ...item, rutina_asignacion_id: asignacionId } as RutinaEjercicio);

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
      const iniciales = series.reduce<Record<number, { peso: string; repeticiones: string }>>((acc, s) => {
        acc[s.numero_serie] = { peso: s.peso || "", repeticiones: s.repeticiones || "" };
        return acc;
      }, {});
      setSeriesRealizadas(iniciales);
    } else {
      setSeriesRealizadas({});
    }
  }

  async function guardarCompletado() {
    if (!ejercicioSeleccionado || guardandoEjercicio) return;
    setGuardandoEjercicio(true);

    const asignacionActual = rutinasAsignadas.find(
      (a) => a.asignacion_id === ejercicioSeleccionado.rutina_asignacion_id
    );
    if (!asignacionActual) {
      alert("No se encontró la asignación.");
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
      const incompletas = seriesConfiguradas.some((s) => {
        const v = seriesRealizadas[s.numero_serie];
        return !v?.peso || !v?.repeticiones;
      });
      if (incompletas) {
        alert("Completá peso y repeticiones en cada serie.");
        setGuardandoEjercicio(false);
        return;
      }
    }

    const rpeNumero = Number(rpe);
    const rirNumero = rirReal ? Number(rirReal) : null;

    const seriesRealizadasFinales: SerieCompletadaCache[] = esAvanzado
      ? seriesConfiguradas.map((s) => {
          const v = seriesRealizadas[s.numero_serie];
          const p = Number(v?.peso || 0);
          const r = Number(v?.repeticiones || 0);
          return {
            numero_serie: s.numero_serie,
            peso_kg: p,
            repeticiones: r,
            rm_calculado: p > 0 && r > 0 ? calcularEpley(p, r) : null,
          };
        })
      : [];

    const pesoNumero = esAvanzado ? seriesRealizadasFinales[0]?.peso_kg || 0 : Number(pesoUsado);
    const repsNumero = esAvanzado ? seriesRealizadasFinales[0]?.repeticiones || 0 : Number(repsRealizadas);

    const mejorSerie = seriesRealizadasFinales
      .filter((s) => s.rm_calculado !== null)
      .sort((a, b) => Number(b.rm_calculado || 0) - Number(a.rm_calculado || 0))[0];

    const rmCalculado = esAvanzado
      ? mejorSerie?.rm_calculado || null
      : pesoNumero > 0 && repsNumero > 0 ? calcularEpley(pesoNumero, repsNumero) : null;

    const nuevoEnCache: EjercicioCompletadoCache = {
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
        (item) => !(item.rutina_asignacion_id === nuevoEnCache.rutina_asignacion_id && item.rutina_ejercicio_id === nuevoEnCache.rutina_ejercicio_id)
      ),
      nuevoEnCache,
    ]);

    setEjercicioSeleccionado(null);
    setPesoUsado("");
    setRepsRealizadas("");
    setRpe("");
    setRirReal("");
    setSeriesRealizadas({});
    setGuardandoEjercicio(false);
  }

  async function deshacerCompletado(rutinaId: string, rutinaEjercicioId: string, asignacionId: string) {
    if (!confirm("¿Querés deshacer este ejercicio?")) return;

    const estaEnCache = ejerciciosCompletadosCache.some(
      (item) => item.rutina_asignacion_id === asignacionId && item.rutina_ejercicio_id === rutinaEjercicioId
    );

    if (estaEnCache) {
      setEjerciciosCompletadosCache((prev) =>
        prev.filter((item) => !(item.rutina_asignacion_id === asignacionId && item.rutina_ejercicio_id === rutinaEjercicioId))
      );
      return;
    }

    const { data: registroActual } = await supabase
      .from("registros_entrenamiento")
      .select("ejercicio_id")
      .eq("alumno_id", alumnoId)
      .eq("rutina_asignacion_id", asignacionId)
      .eq("rutina_ejercicio_id", rutinaEjercicioId)
      .maybeSingle();

    await supabase.from("rms_historial").delete()
      .eq("alumno_id", alumnoId)
      .eq("rutina_id", rutinaId)
      .eq("rutina_ejercicio_id", rutinaEjercicioId);

    const { error } = await supabase.from("registros_entrenamiento").delete()
      .eq("alumno_id", alumnoId)
      .eq("rutina_asignacion_id", asignacionId)
      .eq("rutina_ejercicio_id", rutinaEjercicioId);

    if (error) { alert(error.message); return; }

    if (registroActual?.ejercicio_id) {
      await recalcularRMActual({ alumnoId, ejercicioId: registroActual.ejercicio_id });
    }

    await supabase.from("rutina_asignaciones")
      .update({ activa: true, completada: false, fecha_completada: null })
      .eq("id", asignacionId);

    setRegistros((prev) =>
      prev.filter((r) => !(r.rutina_asignacion_id === asignacionId && r.rutina_ejercicio_id === rutinaEjercicioId))
    );
    setRutinasAsignadas((prev) =>
      prev.map((a) => a.asignacion_id === asignacionId ? { ...a, activa: true, completada: false, fecha_completada: null } : a)
    );

    if (registroActual?.ejercicio_id) {
      const { data: nuevoRM } = await supabase
        .from("rms_actuales")
        .select("id,ejercicio_id,rm_calculado")
        .eq("alumno_id", alumnoId)
        .eq("ejercicio_id", registroActual.ejercicio_id)
        .maybeSingle();
      if (nuevoRM) {
        setRmsActuales((prev) => prev.map((r) => r.ejercicio_id === registroActual.ejercicio_id ? nuevoRM : r));
      } else {
        setRmsActuales((prev) => prev.filter((r) => r.ejercicio_id !== registroActual.ejercicio_id));
      }
    }
  }

  async function guardarCacheABD(asignacionId: string, rutinaId: string) {
    setGuardandoRutina(true);

    const ejerciciosDelCache = ejerciciosCompletadosCache.filter((item) => item.rutina_asignacion_id === asignacionId);
    const entradasDelCache = entradaCalorCompletadaCache.filter((item) => item.rutina_asignacion_id === asignacionId);

    try {
      if (entradasDelCache.length > 0) {
        await supabase.from("registros_entrenamiento").delete()
          .eq("alumno_id", alumnoId).eq("rutina_asignacion_id", asignacionId)
          .in("entrada_calor_id", entradasDelCache.map((e) => e.entrada_calor_id));

        await supabase.from("registros_entrenamiento").insert(
          entradasDelCache.map((e) => ({
            alumno_id: alumnoId, rutina_id: e.rutina_id, rutina_asignacion_id: asignacionId,
            rutina_ejercicio_id: null, entrada_calor_id: e.entrada_calor_id,
            ejercicio_id: e.ejercicio_id || null, nombre_ejercicio: e.nombre_ejercicio,
            peso_kg: null, repeticiones: null, rpe: null, rir: null, rm_calculado: null, completado: true,
          }))
        );
      }

      if (ejerciciosDelCache.length > 0) {
        await supabase.from("registros_entrenamiento").delete()
          .eq("alumno_id", alumnoId).eq("rutina_asignacion_id", asignacionId)
          .in("rutina_ejercicio_id", ejerciciosDelCache.map((e) => e.rutina_ejercicio_id));

        const conEjercicioId = ejerciciosDelCache.filter((e) => e.ejercicio_id);
        if (conEjercicioId.length > 0) {
          await supabase.from("rms_historial").delete()
            .eq("alumno_id", alumnoId).eq("rutina_id", rutinaId).eq("rutina_asignacion_id", asignacionId)
            .in("rutina_ejercicio_id", conEjercicioId.map((e) => e.rutina_ejercicio_id));
        }
      }

      const registrosBatch = ejerciciosDelCache.map((ej) => {
        const series = ej.tipo_configuracion === "avanzado" && ej.series_realizadas?.length
          ? ej.series_realizadas
          : [{ numero_serie: 1, peso_kg: ej.peso_kg, repeticiones: ej.repeticiones, rm_calculado: ej.rm_calculado }];

        const mejorSerie = [...series].sort((a, b) => Number(b.rm_calculado || 0) - Number(a.rm_calculado || 0))[0];

        return {
          alumno_id: alumnoId, rutina_id: ej.rutina_id, rutina_asignacion_id: asignacionId,
          rutina_ejercicio_id: ej.rutina_ejercicio_id, ejercicio_id: ej.ejercicio_id,
          nombre_ejercicio: ej.nombre_ejercicio, peso_kg: mejorSerie.peso_kg,
          repeticiones: mejorSerie.repeticiones, rpe: ej.rpe, rir: ej.rir,
          rm_calculado: mejorSerie.rm_calculado, completado: true,
        };
      });

      let registrosInsertados: { id: string; rm_calculado: number | null; peso_kg: number | null; repeticiones: number | null }[] = [];

      if (registrosBatch.length > 0) {
        const { data, error: registrosError } = await supabase
          .from("registros_entrenamiento")
          .insert(registrosBatch)
          .select("id,rm_calculado,peso_kg,repeticiones");

        if (registrosError) throw new Error(`Error al insertar registros: ${registrosError.message}`);
        registrosInsertados = data || [];
      }

      const historialBatch = ejerciciosDelCache
        .map((ej, i) => {
          const reg = registrosInsertados?.[i];
          if (!ej.ejercicio_id || !reg?.rm_calculado) return null;
          return {
            alumno_id: alumnoId, ejercicio_id: ej.ejercicio_id, rutina_id: rutinaId,
            rutina_ejercicio_id: ej.rutina_ejercicio_id, rutina_asignacion_id: asignacionId,
            registro_entrenamiento_id: reg.id, peso_kg: reg.peso_kg,
            repeticiones: reg.repeticiones, rm_calculado: reg.rm_calculado, origen: "entrenamiento",
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (historialBatch.length > 0) {
        const { error: histError } = await supabase.from("rms_historial").insert(historialBatch);
        if (histError) throw histError;
      }

      for (const ej of ejerciciosDelCache) {
        if (ej.ejercicio_id) await recalcularRMActual({ alumnoId, ejercicioId: ej.ejercicio_id });
      }

      await supabase.from("rutina_asignaciones")
        .update({ activa: false, completada: true, fecha_completada: new Date().toISOString() })
        .eq("id", asignacionId);

      setRutinasAsignadas((prev) =>
        prev.map((a) => a.asignacion_id === asignacionId
          ? { ...a, activa: false, completada: true, fecha_completada: new Date().toISOString() }
          : a
        )
      );

      setRegistros((prev) => [
        ...prev,
        ...(registrosInsertados || []).map((r, i) => ({
          id: r.id, rutina_id: ejerciciosDelCache[i]?.rutina_id || "",
          rutina_asignacion_id: asignacionId,
          rutina_ejercicio_id: ejerciciosDelCache[i]?.rutina_ejercicio_id || null,
          entrada_calor_id: null,
          ejercicio_id: ejerciciosDelCache[i]?.ejercicio_id || null,
          nombre_ejercicio: ejerciciosDelCache[i]?.nombre_ejercicio || null,
          peso_kg: r.peso_kg, repeticiones: r.repeticiones,
          rpe: ejerciciosDelCache[i]?.rpe ?? null, rir: ejerciciosDelCache[i]?.rir ?? null,
        })),
      ]);

      const { data: rmsActualizados } = await supabase
        .from("rms_actuales").select("id,ejercicio_id,rm_calculado").eq("alumno_id", alumnoId);
      setRmsActuales(rmsActualizados || []);

      const ejRestantes = ejerciciosCompletadosCache.filter((item) => item.rutina_asignacion_id !== asignacionId);
      const entRestantes = entradaCalorCompletadaCache.filter((item) => item.rutina_asignacion_id !== asignacionId);
      setEjerciciosCompletadosCache(ejRestantes);
      setEntradaCalorCompletadaCache(entRestantes);

      if (ejRestantes.length > 0 || entRestantes.length > 0) {
        localStorage.setItem(claveProgresoLocal(alumnoId), JSON.stringify({ ejercicios: ejRestantes, entradas: entRestantes }));
      } else {
        localStorage.removeItem(claveProgresoLocal(alumnoId));
      }

      setGuardandoRutina(false);
    } catch (error: unknown) {
      setGuardandoRutina(false);
      console.error("Error al guardar la rutina:", error);
      if (error instanceof Error) {
        alert(error.message);
        return;
      }
      if (typeof error === "object" && error !== null && "message" in error) {
        alert(String((error as { message?: unknown }).message));
        return;
      }
      alert("Error al guardar la rutina. Revisá la consola para ver el detalle.");
    }
  }

  async function deshacerRutinaCompleta(asignacion: RutinaAsignada) {
    if (!confirm("¿Querés deshacer esta rutina completada?")) return;

    const { data: registrosABorrar } = await supabase
      .from("registros_entrenamiento")
      .select("id,ejercicio_id")
      .eq("alumno_id", alumnoId)
      .eq("rutina_asignacion_id", asignacion.asignacion_id);

    const ejercicioIds = Array.from(
      new Set((registrosABorrar || []).map((r) => r.ejercicio_id).filter(Boolean))
    ) as string[];
    const registroIds = (registrosABorrar || []).map((r) => r.id);

    if (registroIds.length > 0) {
      await supabase.from("rms_historial").delete().in("registro_entrenamiento_id", registroIds);
    }
    await supabase.from("registros_entrenamiento").delete()
      .eq("alumno_id", alumnoId).eq("rutina_asignacion_id", asignacion.asignacion_id);

    await supabase.from("rutina_asignaciones")
      .update({ activa: true, completada: false, fecha_completada: null })
      .eq("id", asignacion.asignacion_id);

    if (ejercicioIds.length > 0) {
      await supabase.from("rms_actuales").delete()
        .eq("alumno_id", alumnoId).in("ejercicio_id", ejercicioIds);
      for (const eid of ejercicioIds) {
        await recalcularRMActual({ alumnoId, ejercicioId: eid });
      }
    }

    await cargarTodo();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  function renderRutinaCard(asignacion: RutinaAsignada) {
    const rutina = asignacion.rutinas || { id: asignacion.rutina_id, nombre: "Rutina" };
    const completada = asignacionEstaCompletada(asignacion);
    const abierta = !!rutinasAbiertas[asignacion.asignacion_id];
    const entrada = entradaPorRutina[rutina.id] || [];
    const ejercicios = ejerciciosPorRutina[rutina.id] || [];
    const hayProgreso = ejerciciosCompletadosCache.some((e) => e.rutina_asignacion_id === asignacion.asignacion_id)
      || entradaCalorCompletadaCache.some((e) => e.rutina_asignacion_id === asignacion.asignacion_id);

    return (
      <div key={asignacion.asignacion_id} className={abierta ? "rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5" : "hidden"}>
        <button type="button" onClick={() => toggleRutina(asignacion.asignacion_id)} className="flex w-full items-start justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left transition hover:bg-zinc-800/70">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">{rutina.nombre}</h2>
            <p className="mt-2 text-sm text-zinc-500">
              {asignacion.fecha_asignacion ? `Asignada: ${asignacion.fecha_asignacion}` : "Rutina asignada"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(rutina as Rutina).objetivo && (
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400">{(rutina as Rutina).objetivo}</span>
              )}
              {(rutina as Rutina).estructura && (
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">{(rutina as Rutina).estructura}</span>
              )}
              {completada && (
                <span className="rounded-full bg-emerald-600/20 px-3 py-1 text-sm font-bold text-emerald-200">COMPLETADA</span>
              )}
            </div>
          </div>
          <span className="pt-1 text-xl text-zinc-400">{abierta ? "▲" : "▼"}</span>
        </button>

        {abierta && (
          <div className="mt-5 space-y-5">
            {/* Entrada en calor */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Entrada en calor</h3>
              {entrada.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin entrada en calor cargada.</p>
              ) : (
                <div className="space-y-3">
                  {entrada.map((item) => {
                    const itemCompletado = entradaEstaCompletada(asignacion.asignacion_id, item.id);
                    return (
                      <div key={item.id} className={`rounded-2xl border p-5 ${itemCompletado ? "border-emerald-700 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900"}`}>
                        <div className="flex items-start gap-3">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${itemCompletado ? "bg-emerald-500/20 text-emerald-200" : "bg-zinc-800 text-zinc-500"}`}>
                            ✓
                          </span>
                          <div>
                            <h4 className="text-lg font-bold text-zinc-100">{item.nombre_ejercicio}</h4>
                            <p className="mt-1 text-sm text-zinc-400">
                              {item.series || "-"} series · {textoPrescripcion(item)}
                            </p>
                          </div>
                        </div>
                        {item.observaciones && (
                          <p className="mt-2 text-sm text-zinc-500">{item.observaciones}</p>
                        )}
                        {itemCompletado ? (
                          <button type="button" onClick={() => item.rutina_id && deshacerEntradaCalor(item.rutina_id, item.id, asignacion.asignacion_id)}
                            className="mt-4 w-full rounded-2xl border border-yellow-700 bg-yellow-500/10 px-4 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500/20 active:scale-[0.99]">
                            ↩ Deshacer entrada en calor
                          </button>
                        ) : (
                          <button type="button" onClick={() => completarEntradaCalor(item, asignacion.asignacion_id)} disabled={completada}
                            className={`mt-4 w-full rounded-2xl border px-4 py-3 text-sm font-bold transition active:scale-[0.99] ${completada ? "cursor-not-allowed border-zinc-800 bg-zinc-800 text-zinc-500" : "border-emerald-500 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"}`}>
                            Completar entrada en calor
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Ejercicios */}
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Ejercicios</h3>
              {ejercicios.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin ejercicios cargados.</p>
              ) : (
                <div className="space-y-3">
                  {ejercicios.map((item) => {
                    const pesoSugerido = calcularPesoPorRM(item);
                    const itemCompletado = ejercicioEstaCompletado(asignacion.asignacion_id, item.id);

                    return (
                      <div key={item.id} className={`rounded-2xl border p-5 ${itemCompletado ? "border-emerald-700 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900"}`}>
                        <div className="flex items-start gap-3">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${itemCompletado ? "bg-emerald-500/20 text-emerald-200" : "bg-zinc-800 text-zinc-500"}`}>
                            ✓
                          </span>
                          <div>
                            <h4 className="text-lg font-bold text-zinc-100">{item.nombre_ejercicio}</h4>
                            <p className="mt-1 text-sm text-zinc-400">
                              {item.series || "-"} series · {item.tipo_configuracion === "avanzado"
                                ? textoPrescripcionAvanzada(seriesPorEjercicio[item.id] || [])
                                : textoPrescripcion(item)}
                            </p>
                          </div>
                        </div>

                        {item.tipo_configuracion === "avanzado" && (
                          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                            <p className="mb-2 text-xs font-semibold text-zinc-400">Series indicadas</p>
                            <div className="space-y-1 text-sm text-zinc-300">
                              {(seriesPorEjercicio[item.id] || []).map((serie) => (
                                <div key={serie.id} className="flex justify-between gap-3">
                                  <span>Serie {serie.numero_serie}</span>
                                  <span>{serie.repeticiones || "-"} reps · {serie.peso || "-"} kg</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2 text-sm">
                          {item.peso && (
                            <span className="rounded-full bg-zinc-800 px-3 py-1">Peso indicado: {item.peso}</span>
                          )}
                          {item.porcentaje_rm && (
                            <span className="rounded-full bg-zinc-800 px-3 py-1">
                              {item.porcentaje_rm === "0" ? "%RM: Peso corporal" : `%RM: ${item.porcentaje_rm}%`}
                            </span>
                          )}
                          {pesoSugerido && (
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400">
                              Peso sugerido: {pesoSugerido}
                            </span>
                          )}
                          {item.rir && <span className="rounded-full bg-zinc-800 px-3 py-1">RIR: {item.rir}</span>}
                          {item.descanso && <span className="rounded-full bg-zinc-800 px-3 py-1">Descanso: {item.descanso}</span>}
                        </div>

                        {item.observaciones && (
                          <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-500">{item.observaciones}</p>
                        )}

                        {itemCompletado ? (
                          <button type="button" onClick={() => deshacerCompletado(rutina.id, item.id, asignacion.asignacion_id)}
                            className="mt-4 w-full rounded-2xl border border-yellow-700 bg-yellow-500/10 px-4 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500/20 active:scale-[0.99]">
                            ↩ Deshacer
                          </button>
                        ) : (
                          <button type="button" onClick={() => abrirCompletado(item, asignacion.asignacion_id)} disabled={completada}
                            className={`mt-4 w-full rounded-2xl border px-4 py-3 text-sm font-bold transition active:scale-[0.99] ${completada ? "cursor-not-allowed border-zinc-800 bg-zinc-800 text-zinc-500" : "border-emerald-500 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"}`}>
                            Completar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Botón inferior */}
            {completada ? (
              <div className="rounded-2xl border border-emerald-600 bg-emerald-600/20 p-4 text-center font-bold text-emerald-200">
                ✓ Rutina completada
              </div>
            ) : estaRutinaCacheCompleta(asignacion.rutina_id, asignacion.asignacion_id) ? (
              <button type="button" onClick={() => guardarCacheABD(asignacion.asignacion_id, asignacion.rutina_id)} disabled={guardandoRutina}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white transition active:scale-[0.99] ${guardandoRutina ? "cursor-not-allowed bg-emerald-600 opacity-70" : "bg-emerald-500 hover:bg-emerald-600"}`}>
                {guardandoRutina && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {guardandoRutina ? "Guardando rutina..." : "Completar Rutina"}
              </button>
            ) : hayProgreso ? (
              <button type="button" onClick={guardarProgresoActual}
                className="w-full rounded-2xl border border-blue-500 bg-blue-500/20 py-4 text-base font-bold text-blue-200 transition hover:bg-blue-500/30 active:scale-[0.99]">
                Guardar progreso
              </button>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  function renderCompletadoCard(asignacion: RutinaAsignada) {
    const rutina = asignacion.rutinas || null;
    const abierta = !!rutinasAbiertas[asignacion.asignacion_id];

    const registrosDeEstaRutina = registros
      .filter((r) => r.rutina_asignacion_id === asignacion.asignacion_id)
      .filter((r, i, arr) => {
        const clave = r.rutina_ejercicio_id || r.entrada_calor_id || r.id;
        return arr.findIndex((item) => (item.rutina_ejercicio_id || item.entrada_calor_id || item.id) === clave) === i;
      });

    return (
      <div key={asignacion.asignacion_id} className={abierta ? "rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5" : "hidden"}>
        <button type="button" onClick={() => toggleRutina(asignacion.asignacion_id)} className="flex w-full items-start justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left transition hover:bg-zinc-800/70">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">{rutina?.nombre || "Rutina completada"}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {rutina?.estructura && <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">{rutina.estructura}</span>}
              {rutina?.objetivo && <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400">{rutina.objetivo}</span>}
              <span className="rounded-full bg-emerald-600/20 px-3 py-1 text-sm font-bold text-emerald-200">COMPLETADA</span>
            </div>
          </div>
          <span className="pt-1 text-xl text-zinc-400">{abierta ? "▲" : "▼"}</span>
        </button>

        {abierta && (
          <div className="mt-5 space-y-3">
            {registrosDeEstaRutina.length === 0 ? (
              <p className="text-sm text-zinc-400">No hay detalles guardados.</p>
            ) : (
              registrosDeEstaRutina.map((registro) => (
                <div key={registro.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-200">
                      ✓
                    </span>
                    <h3 className="text-lg font-bold text-zinc-100">{registro.nombre_ejercicio || "Ejercicio"}</h3>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {registro.peso_kg != null && <span className="rounded-full bg-zinc-800 px-3 py-1">Peso: {registro.peso_kg} kg</span>}
                    {registro.repeticiones != null && <span className="rounded-full bg-zinc-800 px-3 py-1">Reps: {registro.repeticiones}</span>}
                    {registro.rpe != null && <span className="rounded-full bg-zinc-800 px-3 py-1">RPE: {registro.rpe}</span>}
                    {registro.rir != null && <span className="rounded-full bg-zinc-800 px-3 py-1">RIR: {registro.rir}</span>}
                  </div>
                </div>
              ))
            )}
            <button type="button" onClick={() => deshacerRutinaCompleta(asignacion)}
              className="w-full rounded-2xl border border-yellow-700 bg-yellow-500/10 px-4 py-3 text-sm font-bold text-yellow-300 transition hover:bg-yellow-500/20 active:scale-[0.99]">
              ↩ Deshacer rutina completada
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Render principal ──────────────────────────────────────────────────────

  const proximasRutinas = rutinasAsignadas.filter((a) => !asignacionEstaCompletada(a)).slice(0, 2);
  const rutinasCompletadas = rutinasAsignadas
    .filter((a) => asignacionEstaCompletada(a))
    .sort((a, b) => (b.fecha_completada || b.fecha_asignacion || "").localeCompare(a.fecha_completada || a.fecha_asignacion || ""));

  if (loading) {
    return <p className="text-sm text-zinc-500">Cargando rutinas...</p>;
  }

  if (rutinasAsignadas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400">
        Este alumno no tiene rutinas asignadas.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {proximasRutinas.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Rutinas activas</h3>
          <div className="flex flex-wrap gap-2">
            {proximasRutinas.map((asignacion) => {
              const rutina = asignacion.rutinas || { id: asignacion.rutina_id, nombre: "Rutina" };
              const abierta = !!rutinasAbiertas[asignacion.asignacion_id];
              return (
                <button
                  key={asignacion.asignacion_id}
                  type="button"
                  onClick={() => toggleRutina(asignacion.asignacion_id)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition active:scale-[0.99] ${abierta ? "border-blue-500 bg-blue-500/20 text-blue-200" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}
                >
                  {rutina.nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {rutinasCompletadas.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Completadas</h3>
          <div className="flex flex-wrap gap-2">
            {rutinasCompletadas.slice(0, 2).map((asignacion) => {
              const rutina = asignacion.rutinas || { id: asignacion.rutina_id, nombre: "Rutina completada" };
              const abierta = !!rutinasAbiertas[asignacion.asignacion_id];
              return (
                <button
                  key={asignacion.asignacion_id}
                  type="button"
                  onClick={() => toggleRutina(asignacion.asignacion_id)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition active:scale-[0.99] ${abierta ? "border-emerald-600 bg-emerald-600/20 text-emerald-200" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"}`}
                >
                  ✓ {rutina.nombre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {proximasRutinas.map(renderRutinaCard)}
      {rutinasCompletadas.slice(0, 2).map(renderCompletadoCard)}

      {/* Modal */}
      {ejercicioSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-bold">Ejercicio completado</h2>
            <p className="mb-4 mt-1 text-sm text-zinc-400">{ejercicioSeleccionado.nombre_ejercicio}</p>

            <div className="space-y-3">
              {ejercicioSeleccionado.tipo_configuracion === "avanzado" ? (
                <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
                  <p className="text-sm font-semibold text-zinc-300">Cargar cada serie</p>
                  {(seriesPorEjercicio[ejercicioSeleccionado.id] || []).map((serie) => (
                    <div key={serie.id} className="grid grid-cols-[70px_1fr_1fr] items-center gap-2">
                      <span className="text-sm text-zinc-400">Serie {serie.numero_serie}</span>
                      <input type="number" value={seriesRealizadas[serie.numero_serie]?.peso || ""}
                        onChange={(e) => setSeriesRealizadas((prev) => ({ ...prev, [serie.numero_serie]: { peso: e.target.value, repeticiones: prev[serie.numero_serie]?.repeticiones || "" } }))}
                        className="w-full rounded-xl bg-zinc-800 p-3" placeholder="Peso" />
                      <input type="number" value={seriesRealizadas[serie.numero_serie]?.repeticiones || ""}
                        onChange={(e) => setSeriesRealizadas((prev) => ({ ...prev, [serie.numero_serie]: { peso: prev[serie.numero_serie]?.peso || "", repeticiones: e.target.value } }))}
                        className="w-full rounded-xl bg-zinc-800 p-3" placeholder="Reps" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <input type="number" value={pesoUsado} onChange={(e) => setPesoUsado(e.target.value)}
                    className="w-full rounded-xl bg-zinc-800 p-3" placeholder="Peso usado en kg (0 = peso corporal)" />
                  <input type="number" value={repsRealizadas} onChange={(e) => setRepsRealizadas(e.target.value)}
                    className="w-full rounded-xl bg-zinc-800 p-3" placeholder="Repeticiones realizadas" />
                </>
              )}

              <select value={rpe} onChange={(e) => setRpe(e.target.value)} className="w-full rounded-xl bg-zinc-800 p-3">
                <option value="">RPE</option>
                {opcionesRPE.map((v) => (
                  <option key={v} value={String(v)}>{v}{v === 1 ? " - muy fácil" : v === 10 ? " - muy difícil" : ""}</option>
                ))}
              </select>

              <select value={rirReal} onChange={(e) => setRirReal(e.target.value)} className="w-full rounded-xl bg-zinc-800 p-3">
                <option value="">RIR opcional</option>
                {opcionesRIR.map((v) => <option key={v} value={String(v)}>{v}</option>)}
              </select>
            </div>

            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setEjercicioSeleccionado(null)}
                className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-900 py-3 font-semibold text-zinc-200 transition hover:bg-zinc-800 active:scale-[0.99]">
                Cancelar
              </button>
              <button type="button" onClick={guardarCompletado} disabled={guardandoEjercicio}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 font-bold text-white transition active:scale-[0.99] ${guardandoEjercicio ? "cursor-not-allowed bg-emerald-600 opacity-70" : "bg-emerald-500 hover:bg-emerald-600"}`}>
                {guardandoEjercicio && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {guardandoEjercicio ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RegistrarEntrenamientosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnosEntrenando, setAlumnosEntrenando] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [alumnosConRutina, setAlumnosConRutina] = useState<Set<string>>(new Set());
  const [alumnosRecientes, setAlumnosRecientes] = useState<Alumno[]>([]);
  const [alumnosTopRM, setAlumnosTopRM] = useState<Alumno[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cache = localStorage.getItem(CACHE_KEY);
    if (cache) {
      try {
        const data = JSON.parse(cache) as Partial<CacheRegistrarEntrenamientos>;
        setAlumnosEntrenando(data.alumnosEntrenando ?? []);
        setAlumnoSeleccionado(data.alumnoSeleccionado ?? null);
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }
    cargarAlumnos();
    cargarAlumnosConRutina();
    cargarSugerenciasAlumnos();
  }, []);

  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ alumnosEntrenando, alumnoSeleccionado }));
  }, [alumnosEntrenando, alumnoSeleccionado]);

  async function cargarAlumnos() {
    setLoading(true);
    const { data } = await supabase.from("alumnos").select("id,nombre,apellido,email").order("nombre", { ascending: true });
    setAlumnos((data ?? []) as Alumno[]);
    setLoading(false);
  }

  async function cargarAlumnosConRutina() {
    const { data } = await supabase.from("rutina_asignaciones").select("alumno_id").neq("activa", false).neq("completada", true);
    const ids = new Set((data ?? []).map((item) => item.alumno_id).filter(Boolean));
    setAlumnosConRutina(ids);
  }

  async function cargarSugerenciasAlumnos() {
    const { data: asignacionesActivas } = await supabase
      .from("rutina_asignaciones")
      .select("alumno_id")
      .eq("activa", true)
      .neq("completada", true);

    const idsActivos = new Set((asignacionesActivas ?? []).map((item) => item.alumno_id).filter(Boolean));

    if (idsActivos.size === 0) {
      setAlumnosRecientes([]);
      setAlumnosTopRM([]);
      return;
    }

    const tomarAlumno = (item: AlumnoSugerenciaResponse) => {
      const alumno = normalizarAlumnoRelacion(item.alumnos);
      if (!alumno || !idsActivos.has(alumno.id)) return null;
      return alumno;
    };

    const deduplicar = (items: Alumno[], excluir = new Set<string>(), limite = 3) => {
      const vistos = new Set<string>(excluir);
      const resultado: Alumno[] = [];

      for (const alumno of items) {
        if (vistos.has(alumno.id)) continue;
        vistos.add(alumno.id);
        resultado.push(alumno);
        if (resultado.length >= limite) break;
      }

      return resultado;
    };

    const { data: recientesData } = await supabase
      .from("registros_entrenamiento")
      .select("alumno_id, created_at, alumnos(id,nombre,apellido,email)")
      .in("alumno_id", Array.from(idsActivos))
      .order("created_at", { ascending: false })
      .limit(30);

    const recientes = deduplicar(
      ((recientesData || []) as AlumnoSugerenciaResponse[])
        .map(tomarAlumno)
        .filter((alumno): alumno is Alumno => Boolean(alumno))
    );

    const idsRecientes = new Set(recientes.map((alumno) => alumno.id));

    const { data: topRMData } = await supabase
      .from("rms_actuales")
      .select("alumno_id, rm_calculado, alumnos(id,nombre,apellido,email)")
      .in("alumno_id", Array.from(idsActivos))
      .order("rm_calculado", { ascending: false })
      .limit(30);

    const topRM = deduplicar(
      ((topRMData || []) as AlumnoSugerenciaResponse[])
        .map(tomarAlumno)
        .filter((alumno): alumno is Alumno => Boolean(alumno)),
      idsRecientes
    );

    setAlumnosRecientes(recientes);
    setAlumnosTopRM(topRM);
  }

  function agregarAlumno(alumno: Alumno) {
    const tieneRutinaActiva = alumnosConRutina.has(alumno.id);

    if (!tieneRutinaActiva) {
      alert("Este alumno no tiene rutinas activas asignadas. No se puede agregar a la lista de alumnos entrenando.");
      return;
    }

    const yaExiste = alumnosEntrenando.some((item) => item.id === alumno.id);
    if (!yaExiste) setAlumnosEntrenando((prev) => [...prev, alumno]);
    setAlumnoSeleccionado(alumno);
    setBusqueda("");
    cargarSugerenciasAlumnos();
  }

  function quitarAlumno(alumno: Alumno) {
    setAlumnosEntrenando((prev) => prev.filter((item) => item.id !== alumno.id));
    if (alumnoSeleccionado?.id === alumno.id) setAlumnoSeleccionado(null);
    cargarSugerenciasAlumnos();
  }

  const alumnosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    const idsEntrenando = new Set(alumnosEntrenando.map((a) => a.id));
    return alumnos
      .filter((a) => !idsEntrenando.has(a.id))
      .filter((a) => {
        if (!texto) return true;
        return nombreAlumno(a).toLowerCase().includes(texto) || (a.email?.toLowerCase() ?? "").includes(texto);
      });
  }, [alumnos, alumnosEntrenando, busqueda]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 text-zinc-100">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Registrar entrenamientos</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Cargá rutinas de alumnos que están entrenando sin teléfono.
            </p>
          </div>
          {loading && <span className="text-sm text-blue-300">Cargando...</span>}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <aside className="flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div>
            <h2 className="text-base font-semibold">Buscar alumno</h2>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o email..."
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          {busqueda && (
            <div className="max-h-52 overflow-y-auto rounded-xl border border-zinc-800">
              {alumnosFiltrados.length === 0 ? (
                <p className="p-3 text-sm text-zinc-500">Sin resultados.</p>
              ) : (
                alumnosFiltrados.map((alumno) => (
                  <button key={alumno.id} type="button" onClick={() => agregarAlumno(alumno)}
                    className="flex w-full flex-col border-b border-zinc-800 px-3 py-3 text-left transition last:border-b-0 hover:bg-zinc-900 active:bg-zinc-800">
                    <span className="text-sm font-medium">
                      {nombreAlumno(alumno)} {alumnosConRutina.has(alumno.id) && <span>⭐</span>}
                    </span>
                    {alumno.email && <span className="text-xs text-zinc-500">{alumno.email}</span>}
                  </button>
                ))
              )}
            </div>
          )}

          {!busqueda && (alumnosRecientes.length > 0 || alumnosTopRM.length > 0) && (
            <div className="space-y-4">
              {alumnosRecientes.length > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Recientes</h2>
                  <div className="flex flex-col gap-2">
                    {alumnosRecientes.map((alumno) => (
                      <button
                        key={alumno.id}
                        type="button"
                        onClick={() => agregarAlumno(alumno)}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-left transition hover:border-zinc-700 hover:bg-zinc-800 active:scale-[0.99]"
                      >
                        <span className="block text-sm font-semibold text-zinc-200">
                          {nombreAlumno(alumno)} {alumnosConRutina.has(alumno.id) && <span>⭐</span>}
                        </span>
                        {alumno.email && <span className="text-xs text-zinc-500">{alumno.email}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {alumnosTopRM.length > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Mejores por RM</h2>
                  <div className="flex flex-col gap-2">
                    {alumnosTopRM.map((alumno) => (
                      <button
                        key={alumno.id}
                        type="button"
                        onClick={() => agregarAlumno(alumno)}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-left transition hover:border-zinc-700 hover:bg-zinc-800 active:scale-[0.99]"
                      >
                        <span className="block text-sm font-semibold text-zinc-200">
                          {nombreAlumno(alumno)} {alumnosConRutina.has(alumno.id) && <span>⭐</span>}
                        </span>
                        {alumno.email && <span className="text-xs text-zinc-500">{alumno.email}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <h2 className="mb-2 text-base font-semibold">
              Entrenando ahora{" "}
              {alumnosEntrenando.length > 0 && (
                <span className="ml-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                  {alumnosEntrenando.length}
                </span>
              )}
            </h2>

            {alumnosEntrenando.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-sm text-zinc-500">
                Buscá un alumno para agregarlo.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {alumnosEntrenando.map((alumno) => {
                  const activo = alumnoSeleccionado?.id === alumno.id;
                  return (
                    <div key={alumno.id} className={`rounded-2xl border px-3 py-3 transition ${activo ? "border-blue-500 bg-blue-500/20 text-blue-200" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"}`}>
                      <button type="button" onClick={() => setAlumnoSeleccionado(alumno)} className="w-full text-left">
                        <span className="block text-sm font-semibold">
                          {nombreAlumno(alumno)} {alumnosConRutina.has(alumno.id) && <span>⭐</span>}
                        </span>
                        {alumno.email && <span className="text-xs text-zinc-500">{alumno.email}</span>}
                      </button>
                      <button type="button" onClick={() => quitarAlumno(alumno)}
                        className="mt-3 rounded-full border border-red-900 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20">
                        Quitar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Panel principal */}
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          {!alumnoSeleccionado ? (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-zinc-800 text-center text-sm text-zinc-500">
              Seleccioná un alumno para ver y registrar su rutina.
            </div>
          ) : (
            <div>
              <div className="mb-5 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-300">
                  {(alumnoSeleccionado.nombre?.[0] ?? "A").toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{nombreAlumno(alumnoSeleccionado)}</p>
                  {alumnoSeleccionado.email && <p className="text-xs text-zinc-500">{alumnoSeleccionado.email}</p>}
                </div>
              </div>
              <PanelAlumno key={alumnoSeleccionado.id} alumno={alumnoSeleccionado} />
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

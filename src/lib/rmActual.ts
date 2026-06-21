import { supabase } from "@/lib/supabase";

export type OrigenRMActual = "entrenamiento" | "evaluacion_rm";

export type RMActualCalculado = {
  id: string;
  alumno_id: string;
  ejercicio_id: string;
  peso_kg: number | null;
  repeticiones: number | null;
  rm_calculado: number | null;
  actualizado_en: string | null;
  origen: OrigenRMActual;
  registro_entrenamiento_id?: string | null;
  rms_historial_id?: string | null;
  evaluacion_rm_id?: string | null;
};

type RegistroEntrenamientoRM = {
  id: string;
  alumno_id: string;
  ejercicio_id: string | null;
  peso_kg: number | null;
  repeticiones: number | null;
  rm_calculado: number | null;
  created_at: string | null;
};

type RMHistorialEvaluacion = {
  id: string;
  alumno_id: string;
  ejercicio_id: string | null;
  peso_kg: number | null;
  repeticiones: number | null;
  rm_calculado: number | null;
  fecha: string | null;
  origen: string | null;
  evaluacion_rm_id?: string | null;
};

type RMHistorialEntrenamiento = {
  id: string;
  alumno_id: string;
  ejercicio_id: string | null;
  peso_kg: number | null;
  repeticiones: number | null;
  rm_calculado: number | null;
  fecha: string | null;
  origen: string | null;
  registro_entrenamiento_id?: string | null;
};

function fechaLimiteVigencia() {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() - 6);
  return fecha;
}

async function obtenerRMsActualesAlumnoBase(alumnoId: string, ejercicioId?: string) {
  const fechaLimite = fechaLimiteVigencia();
  const fechaLimiteISO = fechaLimite.toISOString();

  let registrosQuery = supabase
    .from("registros_entrenamiento")
    .select("id, alumno_id, ejercicio_id, peso_kg, repeticiones, rm_calculado, created_at")
    .eq("alumno_id", alumnoId)
    .not("rm_calculado", "is", null)
    .gte("created_at", fechaLimiteISO)
    .order("created_at", { ascending: false });

  let evaluacionesQuery = supabase
    .from("rms_historial")
    .select("id, alumno_id, ejercicio_id, peso_kg, repeticiones, rm_calculado, fecha, origen, evaluacion_rm_id")
    .eq("alumno_id", alumnoId)
    .eq("origen", "evaluacion_rm")
    .not("rm_calculado", "is", null)
    .gte("fecha", fechaLimiteISO)
    .order("fecha", { ascending: false });

  let historialEntrenamientosQuery = supabase
    .from("rms_historial")
    .select("id, alumno_id, ejercicio_id, peso_kg, repeticiones, rm_calculado, fecha, origen, registro_entrenamiento_id")
    .eq("alumno_id", alumnoId)
    .eq("origen", "entrenamiento")
    .not("rm_calculado", "is", null)
    .gte("fecha", fechaLimiteISO)
    .order("fecha", { ascending: false });

  if (ejercicioId) {
    registrosQuery = registrosQuery.eq("ejercicio_id", ejercicioId);
    evaluacionesQuery = evaluacionesQuery.eq("ejercicio_id", ejercicioId);
    historialEntrenamientosQuery = historialEntrenamientosQuery.eq("ejercicio_id", ejercicioId);
  }

  const [
    { data: registrosData, error: registrosError },
    { data: evaluacionesData, error: evaluacionesError },
    { data: historialEntrenamientosData, error: historialEntrenamientosError },
  ] = await Promise.all([registrosQuery, evaluacionesQuery, historialEntrenamientosQuery]);

  if (registrosError) {
    return { data: [] as RMActualCalculado[], error: registrosError };
  }

  if (evaluacionesError) {
    return { data: [] as RMActualCalculado[], error: evaluacionesError };
  }

  if (historialEntrenamientosError) {
    return { data: [] as RMActualCalculado[], error: historialEntrenamientosError };
  }

  const mejoresPorEjercicio = new Map<string, RMActualCalculado>();

  ((registrosData || []) as RegistroEntrenamientoRM[]).forEach((registro) => {
    if (
      !registro.ejercicio_id ||
      registro.rm_calculado === null ||
      registro.rm_calculado === undefined ||
      !registro.created_at ||
      new Date(registro.created_at) < fechaLimite
    ) {
      return;
    }

    const actual = mejoresPorEjercicio.get(registro.ejercicio_id);

    if (Number(registro.rm_calculado) > Number(actual?.rm_calculado || 0)) {
      mejoresPorEjercicio.set(registro.ejercicio_id, {
        id: `entrenamiento-${registro.id}`,
        alumno_id: registro.alumno_id,
        ejercicio_id: registro.ejercicio_id,
        peso_kg: registro.peso_kg,
        repeticiones: registro.repeticiones,
        rm_calculado: registro.rm_calculado,
        actualizado_en: registro.created_at,
        origen: "entrenamiento",
        registro_entrenamiento_id: registro.id,
        evaluacion_rm_id: null,
      });
    }
  });

  ((historialEntrenamientosData || []) as RMHistorialEntrenamiento[]).forEach((registro) => {
    if (
      !registro.ejercicio_id ||
      registro.rm_calculado === null ||
      registro.rm_calculado === undefined ||
      !registro.fecha ||
      new Date(registro.fecha) < fechaLimite
    ) {
      return;
    }

    const actual = mejoresPorEjercicio.get(registro.ejercicio_id);

    if (Number(registro.rm_calculado) > Number(actual?.rm_calculado || 0)) {
      mejoresPorEjercicio.set(registro.ejercicio_id, {
        id: `historial-entrenamiento-${registro.id}`,
        alumno_id: registro.alumno_id,
        ejercicio_id: registro.ejercicio_id,
        peso_kg: registro.peso_kg,
        repeticiones: registro.repeticiones,
        rm_calculado: registro.rm_calculado,
        actualizado_en: registro.fecha,
        origen: "entrenamiento",
        registro_entrenamiento_id: registro.registro_entrenamiento_id || null,
        rms_historial_id: registro.id,
        evaluacion_rm_id: null,
      });
    }
  });

  ((evaluacionesData || []) as RMHistorialEvaluacion[]).forEach((evaluacion) => {
    if (
      !evaluacion.ejercicio_id ||
      evaluacion.rm_calculado === null ||
      evaluacion.rm_calculado === undefined ||
      !evaluacion.fecha ||
      new Date(evaluacion.fecha) < fechaLimite
    ) {
      return;
    }

    const actual = mejoresPorEjercicio.get(evaluacion.ejercicio_id);
    const fechaEvaluacion = new Date(evaluacion.fecha).getTime();
    const fechaActual = actual?.actualizado_en
      ? new Date(actual.actualizado_en).getTime()
      : 0;

    if (!actual || fechaEvaluacion > fechaActual) {
      mejoresPorEjercicio.set(evaluacion.ejercicio_id, {
        id: `evaluacion-${evaluacion.id}`,
        alumno_id: evaluacion.alumno_id,
        ejercicio_id: evaluacion.ejercicio_id,
        peso_kg: evaluacion.peso_kg,
        repeticiones: evaluacion.repeticiones,
        rm_calculado: evaluacion.rm_calculado,
        actualizado_en: evaluacion.fecha,
        origen: "evaluacion_rm",
        rms_historial_id: evaluacion.id,
        evaluacion_rm_id: evaluacion.evaluacion_rm_id || null,
      });
    }
  });

  return {
    data: Array.from(mejoresPorEjercicio.values()).sort(
      (a, b) => Number(b.rm_calculado || 0) - Number(a.rm_calculado || 0)
    ),
    error: null,
  };
}

export async function obtenerRMsActualesAlumno(alumnoId: string) {
  return obtenerRMsActualesAlumnoBase(alumnoId);
}

export async function obtenerRMActualAlumnoEjercicio(alumnoId: string, ejercicioId: string) {
  const { data, error } = await obtenerRMsActualesAlumnoBase(alumnoId, ejercicioId);

  if (error) {
    return { data: null as RMActualCalculado | null, error };
  }

  return {
    data: data[0] || null,
    error: null,
  };
}
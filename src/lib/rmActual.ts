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

  let evaluacionesQuery = supabase
    .from("rms_historial")
    .select("id, alumno_id, ejercicio_id, peso_kg, repeticiones, rm_calculado, fecha, origen, evaluacion_rm_id")
    .eq("alumno_id", alumnoId)
    .eq("origen", "evaluacion_rm")
    .not("rm_calculado", "is", null)
    .gte("fecha", fechaLimiteISO)
    .order("fecha", { ascending: false })
    .limit(100);

  let historialEntrenamientosQuery = supabase
    .from("rms_historial")
    .select("id, alumno_id, ejercicio_id, peso_kg, repeticiones, rm_calculado, fecha, origen, registro_entrenamiento_id")
    .eq("alumno_id", alumnoId)
    .eq("origen", "entrenamiento")
    .not("rm_calculado", "is", null)
    .gte("fecha", fechaLimiteISO)
    .order("fecha", { ascending: false })
    .limit(100);

  if (ejercicioId) {
    evaluacionesQuery = evaluacionesQuery.eq("ejercicio_id", ejercicioId);
    historialEntrenamientosQuery = historialEntrenamientosQuery.eq("ejercicio_id", ejercicioId);
  }

  const [
    { data: evaluacionesData, error: evaluacionesError },
    { data: historialEntrenamientosData, error: historialEntrenamientosError },
  ] = await Promise.all([
    evaluacionesQuery,
    historialEntrenamientosQuery,
  ]);

  if (evaluacionesError) {
    return { data: [] as RMActualCalculado[], error: evaluacionesError };
  }

  if (historialEntrenamientosError) {
    return { data: [] as RMActualCalculado[], error: historialEntrenamientosError };
  }

  // Group records by ejercicio_id
  const mejoresPorEjercicio = new Map<string, RMActualCalculado>();
  const entrenamientosPorEjercicio = new Map<string, RMHistorialEntrenamiento[]>();
  const evaluacionesPorEjercicio = new Map<string, RMHistorialEvaluacion[]>();

  // Agrupar entrenamientos
  for (const registro of (historialEntrenamientosData || []) as RMHistorialEntrenamiento[]) {
    if (
      !registro.ejercicio_id ||
      registro.rm_calculado === null ||
      registro.rm_calculado === undefined ||
      !registro.fecha ||
      new Date(registro.fecha) < fechaLimite
    ) {
      continue;
    }
    if (!entrenamientosPorEjercicio.has(registro.ejercicio_id)) {
      entrenamientosPorEjercicio.set(registro.ejercicio_id, []);
    }
    entrenamientosPorEjercicio.get(registro.ejercicio_id)!.push(registro);
  }

  // Agrupar evaluaciones
  for (const evaluacion of (evaluacionesData || []) as RMHistorialEvaluacion[]) {
    if (
      !evaluacion.ejercicio_id ||
      evaluacion.rm_calculado === null ||
      evaluacion.rm_calculado === undefined ||
      !evaluacion.fecha ||
      new Date(evaluacion.fecha) < fechaLimite
    ) {
      continue;
    }
    if (!evaluacionesPorEjercicio.has(evaluacion.ejercicio_id)) {
      evaluacionesPorEjercicio.set(evaluacion.ejercicio_id, []);
    }
    evaluacionesPorEjercicio.get(evaluacion.ejercicio_id)!.push(evaluacion);
  }

  // Unir todas las claves de ejercicios
  const ejercicioIds = new Set([
    ...Array.from(entrenamientosPorEjercicio.keys()),
    ...Array.from(evaluacionesPorEjercicio.keys()),
  ]);

  for (const ejercicio_id of ejercicioIds) {
    const entrenamientos = entrenamientosPorEjercicio.get(ejercicio_id) || [];
    const evaluaciones = evaluacionesPorEjercicio.get(ejercicio_id) || [];

    // Buscar evaluacionMasReciente
    let evaluacionMasReciente: RMHistorialEvaluacion | null = null;
    if (evaluaciones.length > 0) {
      evaluacionMasReciente = evaluaciones.reduce((a, b) =>
        new Date(a.fecha!).getTime() > new Date(b.fecha!).getTime() ? a : b
      );
    }

    // Buscar mejorEntrenamiento (mayor rm_calculado)
    let mejorEntrenamiento: RMHistorialEntrenamiento | null = null;
    if (entrenamientos.length > 0) {
      mejorEntrenamiento = entrenamientos.reduce((a, b) =>
        Number(a.rm_calculado) > Number(b.rm_calculado) ? a : b
      );
    }

    // Buscar mejorEntrenamientoPosterior (fecha > evaluacionMasReciente.fecha, mayor rm_calculado)
    let mejorEntrenamientoPosterior: RMHistorialEntrenamiento | null = null;
    if (evaluacionMasReciente && entrenamientos.length > 0) {
      const fechaEvaluacion = new Date(evaluacionMasReciente.fecha!).getTime();
      mejorEntrenamientoPosterior = entrenamientos
        .filter(e => new Date(e.fecha!).getTime() > fechaEvaluacion)
        .reduce((a, b) =>
          (!a || Number(b.rm_calculado) > Number(a.rm_calculado)) ? b : a
        , null as RMHistorialEntrenamiento | null);
    }

    // Seleccionar el resultado según las reglas
    let seleccionado: RMHistorialEntrenamiento | RMHistorialEvaluacion | null = null;
    let origenSeleccionado: OrigenRMActual = "entrenamiento";

    if (entrenamientos.length > 0 && evaluaciones.length === 0) {
      // Solo entrenamientos
      seleccionado = mejorEntrenamiento;
      origenSeleccionado = "entrenamiento";
    } else if (evaluaciones.length > 0 && entrenamientos.length === 0) {
      // Solo evaluaciones
      seleccionado = evaluacionMasReciente;
      origenSeleccionado = "evaluacion_rm";
    } else if (entrenamientos.length > 0 && evaluaciones.length > 0 && evaluacionMasReciente) {
      // Ambos presentes
      seleccionado = evaluacionMasReciente;
      origenSeleccionado = "evaluacion_rm";
      if (
        mejorEntrenamientoPosterior &&
        Number(mejorEntrenamientoPosterior.rm_calculado) > Number(evaluacionMasReciente.rm_calculado)
      ) {
        seleccionado = mejorEntrenamientoPosterior;
        origenSeleccionado = "entrenamiento";
      }
    }

    if (seleccionado) {
      if (origenSeleccionado === "entrenamiento") {
        const registro = seleccionado as RMHistorialEntrenamiento;
        mejoresPorEjercicio.set(ejercicio_id, {
          id: `historial-entrenamiento-${registro.id}`,
          alumno_id: registro.alumno_id,
          ejercicio_id: registro.ejercicio_id!,
          peso_kg: registro.peso_kg,
          repeticiones: registro.repeticiones,
          rm_calculado: registro.rm_calculado,
          actualizado_en: registro.fecha,
          origen: "entrenamiento",
          registro_entrenamiento_id: registro.registro_entrenamiento_id || null,
          rms_historial_id: registro.id,
          evaluacion_rm_id: null,
        });
      } else if (origenSeleccionado === "evaluacion_rm") {
        const evaluacion = seleccionado as RMHistorialEvaluacion;
        mejoresPorEjercicio.set(ejercicio_id, {
          id: `evaluacion-${evaluacion.id}`,
          alumno_id: evaluacion.alumno_id,
          ejercicio_id: evaluacion.ejercicio_id!,
          peso_kg: evaluacion.peso_kg,
          repeticiones: evaluacion.repeticiones,
          rm_calculado: evaluacion.rm_calculado,
          actualizado_en: evaluacion.fecha,
          origen: "evaluacion_rm",
          rms_historial_id: evaluacion.id,
          evaluacion_rm_id: evaluacion.evaluacion_rm_id || null,
        });
      }
    }
  }

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
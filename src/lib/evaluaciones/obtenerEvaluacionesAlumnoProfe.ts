

import type { SupabaseClient } from "@supabase/supabase-js";

export type TipoEvaluacionAlumnoProfe = "rm" | "fms" | string;

export type EvaluacionAlumnoProfe = {
  id: string;
  alumno_id: string;
  profesor_id: string | null;
  tipo: TipoEvaluacionAlumnoProfe;
  nombre: string;
  estado: string | null;
  fecha_asignacion: string | null;
  fecha_realizacion: string | null;
  created_at: string | null;
  observaciones: string | null;
  cantidad_items: number;
};

type EvaluacionRmRow = {
  id: string;
  alumno_id: string;
  profesor_id: string | null;
  nombre?: string | null;
  estado: string | null;
  fecha_asignacion?: string | null;
  fecha_realizacion: string | null;
  created_at: string | null;
  observaciones: string | null;
  evaluaciones_rm_resultados?: { id: string }[] | null;
};

type EvaluacionFmsRow = {
  id: string;
  alumno_id: string;
  profesor_id: string | null;
  estado: string | null;
  fecha_asignacion: string | null;
  fecha_realizacion: string | null;
  created_at: string | null;
  observaciones: string | null;
  evaluaciones_fms_tests?: { id: string }[] | null;
};

function ordenarEvaluaciones(
  a: EvaluacionAlumnoProfe,
  b: EvaluacionAlumnoProfe,
) {
  const fechaA = a.fecha_realizacion || a.fecha_asignacion || a.created_at;
  const fechaB = b.fecha_realizacion || b.fecha_asignacion || b.created_at;

  const timestampA = fechaA ? new Date(fechaA).getTime() : 0;
  const timestampB = fechaB ? new Date(fechaB).getTime() : 0;

  return timestampB - timestampA;
}

function normalizarEvaluacionRm(row: EvaluacionRmRow): EvaluacionAlumnoProfe {
  return {
    id: row.id,
    alumno_id: row.alumno_id,
    profesor_id: row.profesor_id,
    tipo: "rm",
    nombre: row.nombre || "Evaluación de RM",
    estado: row.estado,
    fecha_asignacion: row.fecha_asignacion || null,
    fecha_realizacion: row.fecha_realizacion,
    created_at: row.created_at,
    observaciones: row.observaciones,
    cantidad_items: row.evaluaciones_rm_resultados?.length || 0,
  };
}

function normalizarEvaluacionFms(row: EvaluacionFmsRow): EvaluacionAlumnoProfe {
  return {
    id: row.id,
    alumno_id: row.alumno_id,
    profesor_id: row.profesor_id,
    tipo: "fms",
    nombre: "Evaluación FMS",
    estado: row.estado,
    fecha_asignacion: row.fecha_asignacion,
    fecha_realizacion: row.fecha_realizacion,
    created_at: row.created_at,
    observaciones: row.observaciones,
    cantidad_items: row.evaluaciones_fms_tests?.length || 0,
  };
}

async function obtenerEvaluacionesRmAlumno(
  supabase: SupabaseClient,
  alumnoId: string,
): Promise<EvaluacionAlumnoProfe[]> {
  const { data, error } = await supabase
    .from("evaluaciones_rm")
    .select(
      `
        id,
        alumno_id,
        profesor_id,
        nombre,
        estado,
        fecha_asignacion,
        fecha_realizacion,
        created_at,
        observaciones,
        evaluaciones_rm_resultados (
          id
        )
      `,
    )
    .eq("alumno_id", alumnoId)
    .is("deleted_at", null);

  if (error) {
    console.error("Error obteniendo evaluaciones RM del alumno:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  if (!data) return [];

  return (data as EvaluacionRmRow[]).map(normalizarEvaluacionRm);
}

async function obtenerEvaluacionesFmsAlumno(
  supabase: SupabaseClient,
  alumnoId: string,
): Promise<EvaluacionAlumnoProfe[]> {
  const { data, error } = await supabase
    .from("evaluaciones_fms")
    .select(
      `
        id,
        alumno_id,
        profesor_id,
        estado,
        fecha_asignacion,
        fecha_realizacion,
        created_at,
        observaciones,
        evaluaciones_fms_tests (
          id
        )
      `,
    )
    .eq("alumno_id", alumnoId)
    .is("deleted_at", null);

  if (error) {
    console.error("Error obteniendo evaluaciones FMS del alumno:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  if (!data) return [];

  return (data as EvaluacionFmsRow[]).map(normalizarEvaluacionFms);
}

export async function obtenerEvaluacionesAlumnoProfe(
  supabase: SupabaseClient,
  alumnoId: string,
): Promise<EvaluacionAlumnoProfe[]> {
  const [evaluacionesRm, evaluacionesFms] = await Promise.all([
    obtenerEvaluacionesRmAlumno(supabase, alumnoId),
    obtenerEvaluacionesFmsAlumno(supabase, alumnoId),
  ]);

  return [...evaluacionesRm, ...evaluacionesFms].sort(ordenarEvaluaciones);
}
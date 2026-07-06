import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFechaLocal } from "../utils/formatearFecha";

export type TipoPendienteAlumno = "rutina" | "evaluacion";

export type PendienteAlumno = {
  id: string;
  tipo: TipoPendienteAlumno;
  subtipo?: string;
  nombre: string;
  href: string;
  fecha?: string | null;
  puedeCargarAlumno?: boolean | null;
};

export type ResumenPendientesAlumno = {
  tienePendientes: boolean;
  pendientes: PendienteAlumno[];
  rutinasPendientes: PendienteAlumno[];
  evaluacionesPendientes: PendienteAlumno[];
};

type RutinaAsignadaRow = {
  id: string;
  rutina_id: string | null;
  activa: boolean | null;
  completada: boolean | null;
  fecha_asignacion: string | null;
  rutinas?: {
    nombre?: string | null;
  } | null;
};

type EvaluacionRow = {
  id: string;
  nombre?: string | null;
  estado?: string | null;
  fecha_realizacion?: string | null;
  puede_cargar_alumno?: boolean | null;
  created_at?: string | null;
};

function normalizarFechaSoloDia(fecha?: string | null) {
  if (!fecha) return null;
  return fecha.split("T")[0];
}

function timestampFechaLocal(fecha?: string | null) {
  const fechaNormalizada = normalizarFechaSoloDia(fecha);
  if (!fechaNormalizada) return 0;
  return parseFechaLocal(fechaNormalizada)?.getTime() ?? 0;
}

function ordenarPendientes(a: PendienteAlumno, b: PendienteAlumno) {
  const fechaA = timestampFechaLocal(a.fecha);
  const fechaB = timestampFechaLocal(b.fecha);

  return fechaB - fechaA;
}

function normalizarRutinaPendiente(row: RutinaAsignadaRow): PendienteAlumno {
  return {
    id: row.id,
    tipo: "rutina",
    nombre: row.rutinas?.nombre || "Rutina asignada",
    href: `/alumno/rutina`,
    fecha: normalizarFechaSoloDia(row.fecha_asignacion),
  };
}

function normalizarEvaluacionPendiente(
  row: EvaluacionRow,
  subtipo: string,
): PendienteAlumno {
  const nombreBase =
    row.nombre ||
    (subtipo === "rm"
      ? "Evaluación de RM"
      : subtipo === "fms"
        ? "Evaluación FMS"
        : "Evaluación pendiente");

  return {
    id: row.id,
    tipo: "evaluacion",
    subtipo,
    nombre: nombreBase,
    href: `/alumno/evaluaciones/${subtipo}/${row.id}`,
    fecha: normalizarFechaSoloDia(row.fecha_realizacion || row.created_at || null),
    puedeCargarAlumno: row.puede_cargar_alumno ?? null,
  };
}

async function obtenerRutinasPendientes(
  supabase: SupabaseClient,
  alumnoId: string,
): Promise<PendienteAlumno[]> {
  const { data, error } = await supabase
    .from("rutina_asignaciones")
    .select(
      `
        id,
        rutina_id,
        activa,
        completada,
        fecha_asignacion,
        rutinas (
          nombre
        )
      `,
    )
    .eq("alumno_id", alumnoId)
    .order("fecha_asignacion", { ascending: false });

  if (error) {
    console.error("Error obteniendo rutinas pendientes:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  if (!data) return [];

  return (data as RutinaAsignadaRow[])
    .filter((rutina) => {
      if (rutina.activa === false) return false;
      if (rutina.completada === true) return false;

      return true;
    })
    .map(normalizarRutinaPendiente);
}

async function obtenerEvaluacionesRmPendientes(
  supabase: SupabaseClient,
  alumnoId: string,
): Promise<PendienteAlumno[]> {
  const { data, error } = await supabase
    .from("evaluaciones_rm")
    .select(
      `
        id,
        nombre,
        estado,
        fecha_realizacion,
        puede_cargar_alumno,
        created_at
      `,
    )
    .eq("alumno_id", alumnoId)
    .is("deleted_at", null)
    .in("estado", ["pendiente", "incompleta"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error obteniendo evaluaciones RM pendientes:", error);
    return [];
  }

  if (!data) return [];

  return (data as EvaluacionRow[]).map((evaluacion) =>
    normalizarEvaluacionPendiente(evaluacion, "rm"),
  );
}

async function obtenerEvaluacionesFmsPendientes(
  supabase: SupabaseClient,
  alumnoId: string,
): Promise<PendienteAlumno[]> {
  const { data, error } = await supabase
    .from("evaluaciones_fms")
    .select(
      `
        id,
        estado,
        fecha_realizacion,
        puede_cargar_alumno,
        created_at
      `,
    )
    .eq("alumno_id", alumnoId)
    .is("deleted_at", null)
    .in("estado", ["pendiente", "incompleta"])
    .order("fecha_realizacion", { ascending: true });

  if (error) {
    console.error("Error obteniendo evaluaciones FMS pendientes:", error);
    return [];
  }

  if (!data) return [];

  return (data as EvaluacionRow[]).map((evaluacion) =>
    normalizarEvaluacionPendiente(evaluacion, "fms"),
  );
}

export async function obtenerPendientesAlumno(
  supabase: SupabaseClient,
  alumnoId: string,
): Promise<ResumenPendientesAlumno> {
  const [rutinasPendientes, evaluacionesRmPendientes, evaluacionesFmsPendientes] =
    await Promise.all([
      obtenerRutinasPendientes(supabase, alumnoId),
      obtenerEvaluacionesRmPendientes(supabase, alumnoId),
      obtenerEvaluacionesFmsPendientes(supabase, alumnoId),
    ]);

  const evaluacionesPendientes = [
    ...evaluacionesRmPendientes,
    ...evaluacionesFmsPendientes,
  ].sort(ordenarPendientes);

  const pendientes = [
    ...rutinasPendientes,
    ...evaluacionesPendientes,
  ].sort(ordenarPendientes);

  return {
    tienePendientes: pendientes.length > 0,
    pendientes,
    rutinasPendientes,
    evaluacionesPendientes,
  };
}
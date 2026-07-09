import { supabase as supabaseClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MetricasResumen = {
  ejerciciosCompletados: number;
  rutinasCompletadas: number;
  evaluacionesCompletadas: number;
};

export async function obtenerMetricasResumen(
  cliente: SupabaseClient | typeof supabaseClient,
  alumnoId: string
): Promise<MetricasResumen> {
  const [
    ejerciciosCount,
    rutinasCount,
    evaluacionesRMCount,
    evaluacionesFMSCount,
  ] = await Promise.all([
    // Total ejercicios completados
    cliente
      .from("registros_entrenamiento")
      .select("id", { count: "exact", head: true })
      .eq("alumno_id", alumnoId)
      .eq("completado", true),
    // Total rutinas completadas (desde rutina_asignaciones)
    cliente
      .from("rutina_asignaciones")
      .select("id", { count: "exact", head: true })
      .eq("alumno_id", alumnoId)
      .eq("completada", true),
    // Total evaluaciones RM completadas
    cliente
      .from("evaluaciones_rm")
      .select("id", { count: "exact", head: true })
      .eq("alumno_id", alumnoId)
      .is("deleted_at", null)
      .not("estado", "in", "(pendiente,incompleta)"),
    // Total evaluaciones FMS completadas
    cliente
      .from("evaluaciones_fms")
      .select("id", { count: "exact", head: true })
      .eq("alumno_id", alumnoId)
      .not("estado", "in", "(pendiente,incompleta)"),
  ]);

  return {
    ejerciciosCompletados: ejerciciosCount.count ?? 0,
    rutinasCompletadas: rutinasCount.count ?? 0,
    evaluacionesCompletadas:
      (evaluacionesRMCount.count ?? 0) + (evaluacionesFMSCount.count ?? 0),
  };
}
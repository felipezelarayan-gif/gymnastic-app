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
    // Total ejercicios completados (ejercicio único por rutina_asignacion)
    cliente
      .from("registros_entrenamiento")
      .select("ejercicio_id, rutina_asignacion_id")
      .eq("alumno_id", alumnoId)
      .eq("completado", true)
      .not("ejercicio_id", "is", null)
      .not("rutina_asignacion_id", "is", null),
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

  // Contar pares únicos (ejercicio_id + rutina_asignacion_id)
  const ejerciciosData = ejerciciosCount.data || [];
  const paresUnicos = new Set(
    ejerciciosData.map((r: any) => `${r.ejercicio_id}_${r.rutina_asignacion_id}`)
  );

  return {
    ejerciciosCompletados: paresUnicos.size,
    rutinasCompletadas: rutinasCount.count ?? 0,
    evaluacionesCompletadas:
      (evaluacionesRMCount.count ?? 0) + (evaluacionesFMSCount.count ?? 0),
  };
}
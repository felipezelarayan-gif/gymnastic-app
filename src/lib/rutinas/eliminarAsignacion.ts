/**
 * Centraliza la lógica de eliminación de asignaciones de rutinas.
 *
 * Este módulo es responsable de eliminar una asignación y todos sus datos relacionados:
 * - Registros de entrenamiento
 * - Historial de RM
 * - Recalculo de RM actual (mediante recalcularRMActual)
 *
 * NO elimina directamente de rms_actuales.
 * La tabla rms_actuales se actualiza exclusivamente mediante recalcularRMActual().
 */

import { recalcularRMActual } from "@/lib/recalcularRMActual";

export interface EliminarAsignacionOptions {
  supabase: any;
  asignacionId: string;
}

export interface EliminarAsignacionResultado {
  ok: boolean;
  error?: string;
}

export async function eliminarAsignacion(
  options: EliminarAsignacionOptions
): Promise<EliminarAsignacionResultado> {
  const { supabase, asignacionId } = options;

  // 1. Obtener información de la asignación
  const { data: asignacion, error: asignacionError } = await supabase
    .from("rutina_asignaciones")
    .select("id, alumno_id, rutina_id")
    .eq("id", asignacionId)
    .maybeSingle();

  if (asignacionError) {
    return { ok: false, error: asignacionError.message };
  }

  if (!asignacion) {
    return { ok: false, error: "No se encontró la asignación" };
  }

  const alumnoId = asignacion.alumno_id;

  // 2. Buscar registros de entrenamiento asociados
  const { data: registros, error: registrosError } = await supabase
    .from("registros_entrenamiento")
    .select("id, ejercicio_id")
    .eq("alumno_id", alumnoId)
    .eq("rutina_asignacion_id", asignacionId);

  if (registrosError) {
    return { ok: false, error: registrosError.message };
  }

  const registroIds = (registros ?? []).map((r: any) => r.id);
  const ejercicioIds = Array.from(
    new Set((registros ?? []).map((r: any) => r.ejercicio_id).filter(Boolean))
  ) as string[];

  // 3. Eliminar historial de RM (rms_historial)
  if (registroIds.length > 0) {
    const { error: historialError } = await supabase
      .from("rms_historial")
      .delete()
      .in("registro_entrenamiento_id", registroIds);

    if (historialError) {
      return { ok: false, error: historialError.message };
    }
  }

  // 4. Eliminar registros de entrenamiento
  if (registroIds.length > 0) {
    const { error: registrosDeleteError } = await supabase
      .from("registros_entrenamiento")
      .delete()
      .in("id", registroIds);

    if (registrosDeleteError) {
      return { ok: false, error: registrosDeleteError.message };
    }
  }

  // 5. Eliminar la asignación
  const { error: asignacionDeleteError } = await supabase
    .from("rutina_asignaciones")
    .delete()
    .eq("id", asignacionId);

  if (asignacionDeleteError) {
    return { ok: false, error: asignacionDeleteError.message };
  }

  // 6. Recalcular RM actual para cada ejercicio afectado
  if (ejercicioIds.length > 0 && alumnoId) {
    for (const ejercicioId of ejercicioIds) {
      try {
        await recalcularRMActual({
          alumnoId,
          ejercicioId,
        });
      } catch (error) {
        // Log del error pero continuar con los demás ejercicios
        console.error(`Error al recalcular RM para ejercicio ${ejercicioId}:`, error);
      }
    }
  }

  return { ok: true };
}
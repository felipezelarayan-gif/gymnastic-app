

/**
 * Centralized module for handling the routine deletion workflow.
 * This should be the single source of truth for deleting routines.
 * Use this from both `src/app/rutinas/page.tsx` and `src/app/rutinas/[id]/page.tsx`.
 */

export interface BorrarRutinaOptions {
  supabase: any;
  rutinaId: string;
  profesorId: string;
  onProgress?: (mensaje: string) => void;
  onConfirm?: (pendientes: number, completadas: number) => Promise<boolean> | boolean;
}

export interface BorrarRutinaResultado {
  ok: boolean;
  pendientes: number;
  completadas: number;
  error?: string;
}

export async function borrarRutina(options: BorrarRutinaOptions): Promise<BorrarRutinaResultado> {
  const { supabase, rutinaId, profesorId, onProgress, onConfirm } = options;

  if (!profesorId) {
    return {
      ok: false,
      pendientes: 0,
      completadas: 0,
      error: "No se pudo validar el profesor actual.",
    };
  }

  onProgress?.("Consultando asignaciones...");

  const { data, error } = await supabase
    .from("rutina_asignaciones")
    .select("id, completada")
    .eq("rutina_id", rutinaId);

  if (error) {
    return {
      ok: false,
      pendientes: 0,
      completadas: 0,
      error: error.message,
    };
  }

  const pendientes = (data ?? []).filter((a: any) => a.completada === false).length;
  const completadas = (data ?? []).filter((a: any) => a.completada === true).length;

  if (onConfirm) {
    const confirmado = await onConfirm(pendientes, completadas);

    if (!confirmado) {
      return {
        ok: false,
        pendientes,
        completadas,
        error: "Operación cancelada por el usuario.",
      };
    }
  }

  // Workflow: Delete assignments, registros, historial, and finally the routine itself.
  // Split assignments into pendientes and completadas
  const asignaciones = data ?? [];
  const pendientesRows = asignaciones.filter((a: any) => a.completada === false);
  // const completadasRows = asignaciones.filter((a: any) => a.completada === true);

  for (const asignacion of pendientesRows) {
    const asignacionId = asignacion.id;
    // 1. Query registros_entrenamiento for this asignacion
    const { data: registros, error: errorRegistros } = await supabase
      .from("registros_entrenamiento")
      .select("id")
      .eq("rutina_asignacion_id", asignacionId);
    if (errorRegistros) {
      return {
        ok: false,
        pendientes,
        completadas,
        error: errorRegistros.message,
      };
    }
    const registroIds: string[] = (registros ?? []).map((r: any) => r.id);
    // 2. Delete related rows from rms_historial
    if (registroIds.length > 0) {
      const { error: errorHistorial } = await supabase
        .from("rms_historial")
        .delete()
        .in("registro_entrenamiento_id", registroIds);
      if (errorHistorial) {
        return {
          ok: false,
          pendientes,
          completadas,
          error: errorHistorial.message,
        };
      }
    }
    // 3. Delete registros_entrenamiento for this asignacion
    if (registroIds.length > 0) {
      const { error: errorRegistrosDelete } = await supabase
        .from("registros_entrenamiento")
        .delete()
        .in("id", registroIds);
      if (errorRegistrosDelete) {
        return {
          ok: false,
          pendientes,
          completadas,
          error: errorRegistrosDelete.message,
        };
      }
    }
    // 4. Delete the pending row from rutina_asignaciones
    const { error: errorAsignacionDelete } = await supabase
      .from("rutina_asignaciones")
      .delete()
      .eq("id", asignacionId);
    if (errorAsignacionDelete) {
      return {
        ok: false,
        pendientes,
        completadas,
        error: errorAsignacionDelete.message,
      };
    }
  }
  // 5. Delete the routine row from rutinas
  const { error: errorRutinaDelete } = await supabase
    .from("rutinas")
    .delete()
    .eq("id", rutinaId);
  if (errorRutinaDelete) {
    return {
      ok: false,
      pendientes,
      completadas,
      error: errorRutinaDelete.message,
    };
  }

  return {
    ok: true,
    pendientes,
    completadas,
  };
}
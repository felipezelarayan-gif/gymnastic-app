/**
 * Centraliza la lógica de guardado de rutinas.
 *
 * Este módulo es responsable de todas las operaciones de escritura
 * relacionadas con el guardado de una rutina y sus entidades relacionadas:
 * - Datos generales de la rutina
 * - Ejercicios principales y sus series
 * - Entrada en calor
 * - Asignaciones a alumnos
 *
 * NO debe contener lógica de UI, alerts, navegación o manejo de estados locales.
 * Es una función pura de negocio que recibe datos y devuelve el resultado.
 */

import { supabase } from "@/lib/supabase";
import { eliminarAsignacion } from "@/lib/rutinas/eliminarAsignacion";

export interface GuardarRutinaOptions {
  supabase: any;
  rutinaId: string;
  profesorId: string;
  // Datos de la rutina
  rutina: {
    nombre: string;
    descripcion?: string;
    objetivo?: string;
    estructura?: string;
    entrada_calor?: string;
  };
  // Ejercicios principales con sus series (opcional en etapas iniciales)
  ejercicios?: any[];
  seriesPorEjercicio?: Record<string, any[]>;
  // Entrada en calor (opcional en etapas iniciales)
  entradaCalorEjercicios?: any[];
  // Asignaciones (opcional en etapas iniciales)
  asignaciones?: any[];
}

export interface GuardarRutinaResultado {
  ok: boolean;
  error?: string;
}

async function guardarDatosGeneralesRutina(
  supabase: any,
  rutinaId: string,
  profesorId: string,
  rutina: GuardarRutinaOptions["rutina"]
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("rutinas")
    .update({
      nombre: rutina.nombre,
      descripcion: rutina.descripcion,
      objetivo: rutina.objetivo,
      estructura: rutina.estructura,
      entrada_calor: rutina.entrada_calor,
    })
    .eq("id", rutinaId)
    .eq("profesor_id", profesorId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

async function insertarEjercicios(
  supabase: any,
  rutinaId: string,
  ejercicios: any[],
  seriesPorEjercicio: Record<string, any[]>
): Promise<{ ok: boolean; error?: string }> {
  for (const ejercicio of ejercicios) {
    if (ejercicio._estado !== "nuevo") continue;

    const { data: nuevoEjercicio, error } = await supabase
      .from("rutina_ejercicios")
      .insert({
        rutina_id: rutinaId,
        ejercicio_id: ejercicio.ejercicio_id,
        nombre_ejercicio: ejercicio.nombre_ejercicio,
        series: ejercicio.series,
        tipo_prescripcion: ejercicio.tipo_prescripcion,
        repeticiones: ejercicio.repeticiones,
        duracion: ejercicio.duracion,
        peso: ejercicio.peso,
        descanso: ejercicio.descanso,
        rir: ejercicio.rir,
        porcentaje_rm: ejercicio.porcentaje_rm,
        observaciones: ejercicio.observaciones,
        orden: ejercicio.orden,
        tipo_configuracion: ejercicio.tipo_configuracion,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    // Guardar el ID real para que page.tsx pueda actualizar el estado local
    ejercicio._nuevoId = nuevoEjercicio.id;

    // Si es configuración avanzada, insertar las series
    if (ejercicio.tipo_configuracion === "avanzado") {
      const seriesDelEjercicio = seriesPorEjercicio[ejercicio._localId] || [];
      if (seriesDelEjercicio.length > 0) {
        const { error: seriesError } = await supabase
          .from("rutina_ejercicio_series")
          .insert(
            seriesDelEjercicio.map((serie: any) => ({
              rutina_ejercicio_id: nuevoEjercicio.id,
              numero_serie: serie.numero_serie,
              repeticiones: serie.repeticiones || "",
              peso: serie.peso || null,
              porcentaje_rm: serie.porcentaje_rm || null,
            }))
          );

        if (seriesError) {
          return { ok: false, error: seriesError.message };
        }
      }
    }
  }

  return { ok: true };
}

async function actualizarEjercicios(
  supabase: any,
  ejercicios: any[],
  seriesPorEjercicio: Record<string, any[]>
): Promise<{ ok: boolean; error?: string }> {
  for (const ejercicio of ejercicios) {
    if (ejercicio._estado !== "editado") continue;

    // Actualizar ejercicio
    const { error } = await supabase
      .from("rutina_ejercicios")
      .update({
        ejercicio_id: ejercicio.ejercicio_id,
        nombre_ejercicio: ejercicio.nombre_ejercicio,
        series: ejercicio.series,
        tipo_prescripcion: ejercicio.tipo_prescripcion,
        repeticiones: ejercicio.repeticiones,
        duracion: ejercicio.duracion,
        peso: ejercicio.peso,
        descanso: ejercicio.descanso,
        rir: ejercicio.rir,
        porcentaje_rm: ejercicio.porcentaje_rm,
        observaciones: ejercicio.observaciones,
        orden: ejercicio.orden,
        tipo_configuracion: ejercicio.tipo_configuracion,
      })
      .eq("id", ejercicio.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    // Actualizar series: eliminar las anteriores y insertar las nuevas
    if (ejercicio.id) {
      const { error: borrarSeriesError } = await supabase
        .from("rutina_ejercicio_series")
        .delete()
        .eq("rutina_ejercicio_id", ejercicio.id);

      if (borrarSeriesError) {
        return { ok: false, error: borrarSeriesError.message };
      }

      // Insertar nuevas series si existen
      const seriesDelEjercicio = seriesPorEjercicio[ejercicio._localId] || [];
      if (seriesDelEjercicio.length > 0) {
        const { error: insertarSeriesError } = await supabase
          .from("rutina_ejercicio_series")
          .insert(
            seriesDelEjercicio.map((serie) => ({
              rutina_ejercicio_id: ejercicio.id,
              numero_serie: serie.numero_serie,
              repeticiones: serie.repeticiones || "",
              peso: serie.peso || null,
              porcentaje_rm: serie.porcentaje_rm || null,
            }))
          );

        if (insertarSeriesError) {
          return { ok: false, error: insertarSeriesError.message };
        }
      }
    }
  }

  return { ok: true };
}

async function eliminarEjercicios(
  supabase: any,
  ejercicios: any[]
): Promise<{ ok: boolean; error?: string }> {
  for (const ejercicio of ejercicios) {
    if (ejercicio._estado !== "eliminado" || !ejercicio.id) continue;

    // Eliminar series primero
    const { error: seriesError } = await supabase
      .from("rutina_ejercicio_series")
      .delete()
      .eq("rutina_ejercicio_id", ejercicio.id);

    if (seriesError) {
      return { ok: false, error: seriesError.message };
    }

    // Eliminar ejercicio
    const { error } = await supabase
      .from("rutina_ejercicios")
      .delete()
      .eq("id", ejercicio.id);

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

async function guardarEjercicios(
  supabase: any,
  rutinaId: string,
  ejercicios: any[],
  seriesPorEjercicio: Record<string, any[]>
): Promise<{ ok: boolean; error?: string }> {
  // 1. Insertar ejercicios nuevos
  const resultadoInsert = await insertarEjercicios(supabase, rutinaId, ejercicios, seriesPorEjercicio);
  if (!resultadoInsert.ok) {
    return resultadoInsert;
  }

  // 2. Actualizar ejercicios editados
  const resultadoUpdate = await actualizarEjercicios(supabase, ejercicios, seriesPorEjercicio);
  if (!resultadoUpdate.ok) {
    return resultadoUpdate;
  }

  // 3. Eliminar ejercicios marcados como eliminados
  const resultadoDelete = await eliminarEjercicios(supabase, ejercicios);
  if (!resultadoDelete.ok) {
    return resultadoDelete;
  }

  return { ok: true };
}

async function insertarEntradaCalor(
  supabase: any,
  entradas: any[]
): Promise<{ ok: boolean; error?: string }> {
  for (const entrada of entradas) {
    if (entrada._estado !== "nuevo") continue;

    const { data: nuevaEntrada, error } = await supabase
      .from("rutina_entrada_calor")
      .insert({
        rutina_id: entrada.rutina_id,
        ejercicio_id: entrada.ejercicio_id,
        nombre_ejercicio: entrada.nombre_ejercicio,
        series: entrada.series,
        tipo_prescripcion: entrada.tipo_prescripcion,
        duracion: entrada.duracion,
        repeticiones: entrada.repeticiones,
        observaciones: entrada.observaciones,
        orden: entrada.orden,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    // Guardar el ID real para que page.tsx pueda actualizar el estado local
    entrada._nuevoId = nuevaEntrada.id;
  }

  return { ok: true };
}

async function actualizarEntradaCalor(
  supabase: any,
  entradas: any[]
): Promise<{ ok: boolean; error?: string }> {
  for (const entrada of entradas) {
    if (entrada._estado !== "editado" || !entrada.id) continue;

    const { error } = await supabase
      .from("rutina_entrada_calor")
      .update({
        ejercicio_id: entrada.ejercicio_id,
        nombre_ejercicio: entrada.nombre_ejercicio,
        series: entrada.series,
        tipo_prescripcion: entrada.tipo_prescripcion,
        duracion: entrada.duracion,
        repeticiones: entrada.repeticiones,
        observaciones: entrada.observaciones,
        orden: entrada.orden,
      })
      .eq("id", entrada.id);

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

async function eliminarEntradaCalor(
  supabase: any,
  entradas: any[]
): Promise<{ ok: boolean; error?: string }> {
  for (const entrada of entradas) {
    if (entrada._estado !== "eliminado" || !entrada.id) continue;

    const { error } = await supabase
      .from("rutina_entrada_calor")
      .delete()
      .eq("id", entrada.id);

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

async function guardarEntradaCalor(
  supabase: any,
  entradas: any[]
): Promise<{ ok: boolean; error?: string }> {
  // 1. Insertar entradas nuevas
  const resultadoInsert = await insertarEntradaCalor(supabase, entradas);
  if (!resultadoInsert.ok) {
    return resultadoInsert;
  }

  // 2. Actualizar entradas editadas
  const resultadoUpdate = await actualizarEntradaCalor(supabase, entradas);
  if (!resultadoUpdate.ok) {
    return resultadoUpdate;
  }

  // 3. Eliminar entradas marcadas como eliminadas
  const resultadoDelete = await eliminarEntradaCalor(supabase, entradas);
  if (!resultadoDelete.ok) {
    return resultadoDelete;
  }

  return { ok: true };
}

async function eliminarAsignaciones(
  supabase: any,
  asignaciones: any[]
): Promise<{ ok: boolean; error?: string }> {
  for (const asignacion of asignaciones) {
    if (asignacion._estado !== "eliminado" || !asignacion.id) continue;

    const resultado = await eliminarAsignacion({
      supabase,
      asignacionId: asignacion.id,
    });

    if (!resultado.ok) {
      return resultado;
    }
  }

  return { ok: true };
}

export async function guardarRutina(
  options: GuardarRutinaOptions
): Promise<GuardarRutinaResultado> {
  const { supabase, rutinaId, profesorId, rutina, ejercicios, seriesPorEjercicio, entradaCalorEjercicios, asignaciones } = options;

  // 1. Guardar datos generales de la rutina
  const resultadoRutina = await guardarDatosGeneralesRutina(
    supabase,
    rutinaId,
    profesorId,
    rutina
  );

  if (!resultadoRutina.ok) {
    return { ok: false, error: resultadoRutina.error };
  }

  // 2. Guardar ejercicios principales (si se proporcionan)
  if (ejercicios && ejercicios.length > 0) {
    const resultadoEjercicios = await guardarEjercicios(
      supabase,
      rutinaId,
      ejercicios,
      seriesPorEjercicio || {}
    );

    if (!resultadoEjercicios.ok) {
      return { ok: false, error: resultadoEjercicios.error };
    }
  }

  // 3. Guardar entrada en calor (si se proporciona)
  if (entradaCalorEjercicios && entradaCalorEjercicios.length > 0) {
    const resultadoEntradaCalor = await guardarEntradaCalor(
      supabase,
      entradaCalorEjercicios
    );

    if (!resultadoEntradaCalor.ok) {
      return { ok: false, error: resultadoEntradaCalor.error };
    }
  }

  // 4. Eliminar asignaciones marcadas como eliminadas (si se proporcionan)
  if (asignaciones && asignaciones.length > 0) {
    const resultadoAsignaciones = await eliminarAsignaciones(
      supabase,
      asignaciones
    );

    if (!resultadoAsignaciones.ok) {
      return { ok: false, error: resultadoAsignaciones.error };
    }
  }

  return { ok: true };
}

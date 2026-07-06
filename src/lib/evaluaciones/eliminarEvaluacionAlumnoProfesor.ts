
import { recalcularRMActual } from "@/lib/recalcularRMActual";


import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoEvaluacionAlumnoProfe } from "./obtenerEvaluacionesAlumnoProfe";

export type EliminarEvaluacionAlumnoProfesorParams = {
  supabase: SupabaseClient;
  evaluacionId: string;
  tipo: TipoEvaluacionAlumnoProfe;
};

async function eliminarEvaluacionRm(
  supabase: SupabaseClient,
  evaluacionId: string,
) {
  // 1. Get alumno_id for evaluacionId
  const { data: evaluacionData, error: evaluacionFetchError } = await supabase
    .from("evaluaciones_rm")
    .select("alumno_id")
    .eq("id", evaluacionId)
    .maybeSingle();
  if (evaluacionFetchError) throw evaluacionFetchError;
  const alumnoId = evaluacionData?.alumno_id;

  // 2. Get ejercicio_id(s) for evaluacion_rm_id
  const { data: resultadosData, error: resultadosFetchError } = await supabase
    .from("evaluaciones_rm_resultados")
    .select("ejercicio_id")
    .eq("evaluacion_rm_id", evaluacionId);
  if (resultadosFetchError) throw resultadosFetchError;

  // 3. Store distinct ejercicio_id values
  const ejercicioIds = [
    ...new Set(
      (resultadosData ?? []).map((row: { ejercicio_id: string }) => row.ejercicio_id)
    ),
  ];

  // 4. Delete in original order
  const { error: historialError } = await supabase
    .from("rms_historial")
    .delete()
    .eq("evaluacion_rm_id", evaluacionId);
  if (historialError) throw historialError;

  const { error: actualesError } = await supabase
    .from("rms_actuales")
    .delete()
    .eq("evaluacion_rm_id", evaluacionId);
  if (actualesError) throw actualesError;

  const { error: resultadosError } = await supabase
    .from("evaluaciones_rm_resultados")
    .delete()
    .eq("evaluacion_rm_id", evaluacionId);
  if (resultadosError) throw resultadosError;

  const { error: evaluacionError } = await supabase
    .from("evaluaciones_rm")
    .delete()
    .eq("id", evaluacionId);
  if (evaluacionError) throw evaluacionError;

  // 5. After all deletes, recalculate RM for each ejercicio_id if alumnoId exists
  if (alumnoId) {
    for (const ejercicioId of ejercicioIds) {
      await recalcularRMActual({
        alumnoId,
        ejercicioId,
      });
    }
  }
}

async function eliminarEvaluacionFms(
  supabase: SupabaseClient,
  evaluacionId: string,
) {
  const { error: testsError } = await supabase
    .from("evaluaciones_fms_tests")
    .delete()
    .eq("evaluacion_fms_id", evaluacionId);

  if (testsError) throw testsError;

  const { error: evaluacionError } = await supabase
    .from("evaluaciones_fms")
    .delete()
    .eq("id", evaluacionId);

  if (evaluacionError) throw evaluacionError;
}

export async function eliminarEvaluacionAlumnoProfesor({
  supabase,
  evaluacionId,
  tipo,
}: EliminarEvaluacionAlumnoProfesorParams) {
  if (tipo === "rm") {
    await eliminarEvaluacionRm(supabase, evaluacionId);
    return;
  }

  if (tipo === "fms") {
    await eliminarEvaluacionFms(supabase, evaluacionId);
    return;
  }

  throw new Error(`No existe lógica de eliminación para evaluaciones de tipo ${tipo}.`);
}
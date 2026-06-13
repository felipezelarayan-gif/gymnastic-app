

import { supabase } from "@/lib/supabase";

type RecalcularRMActualParams = {
  alumnoId: string;
  ejercicioId: string;
};

export async function recalcularRMActual({
  alumnoId,
  ejercicioId,
}: RecalcularRMActualParams): Promise<void> {
  const { data: historial, error: historialError } = await supabase
    .from("rms_historial")
    .select("ejercicio_id,peso_kg,repeticiones,rm_calculado")
    .eq("alumno_id", alumnoId)
    .eq("ejercicio_id", ejercicioId)
    .order("rm_calculado", { ascending: false })
    .limit(1);

  if (historialError) {
    throw historialError;
  }

  const mejorRM = historial?.[0];

  if (!mejorRM) {
    const { error: deleteError } = await supabase
      .from("rms_actuales")
      .delete()
      .eq("alumno_id", alumnoId)
      .eq("ejercicio_id", ejercicioId);

    if (deleteError) {
      throw deleteError;
    }

    return;
  }

  const { data: existente, error: existenteError } = await supabase
    .from("rms_actuales")
    .select("id")
    .eq("alumno_id", alumnoId)
    .eq("ejercicio_id", ejercicioId)
    .maybeSingle();

  if (existenteError) {
    throw existenteError;
  }

  const payload = {
    alumno_id: alumnoId,
    ejercicio_id: ejercicioId,
    peso_kg: mejorRM.peso_kg,
    repeticiones: mejorRM.repeticiones,
    rm_calculado: mejorRM.rm_calculado,
    actualizado_en: new Date().toISOString(),
  };

  if (existente) {
    const { error: updateError } = await supabase
      .from("rms_actuales")
      .update(payload)
      .eq("id", existente.id);

    if (updateError) {
      throw updateError;
    }

    return;
  }

  const { error: insertError } = await supabase
    .from("rms_actuales")
    .insert(payload);

  if (insertError) {
    throw insertError;
  }
}
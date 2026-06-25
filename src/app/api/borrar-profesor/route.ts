

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profesorId } = body;
    if (!profesorId) {
      return NextResponse.json({ error: "Missing profesorId" }, { status: 400 });
    }

    // --- RM Evaluaciones ---
    const { data: rmEvaluaciones, error: rmEvalError } = await supabaseAdmin
      .from("evaluaciones_rm")
      .select("id")
      .eq("profesor_id", profesorId);
    if (rmEvalError) throw new Error(rmEvalError.message);
    const rmEvalIds = rmEvaluaciones?.map((e: any) => e.id) ?? [];
    if (rmEvalIds.length > 0) {
      // Delete from evaluaciones_rm_resultados
      const { error: rmResultadosError } = await supabaseAdmin
        .from("evaluaciones_rm_resultados")
        .delete()
        .in("evaluacion_rm_id", rmEvalIds);
      if (rmResultadosError) throw new Error(rmResultadosError.message);

      // Set evaluacion_rm_id to null in rms_actuales
      const { error: rmsActualesNullError } = await supabaseAdmin
        .from("rms_actuales")
        .update({ evaluacion_rm_id: null })
        .in("evaluacion_rm_id", rmEvalIds);
      if (rmsActualesNullError) throw new Error(rmsActualesNullError.message);

      // Set evaluacion_rm_id to null in rms_historial
      const { error: rmsHistorialNullError } = await supabaseAdmin
        .from("rms_historial")
        .update({ evaluacion_rm_id: null })
        .in("evaluacion_rm_id", rmEvalIds);
      if (rmsHistorialNullError) throw new Error(rmsHistorialNullError.message);

      // Delete from evaluaciones_rm
      const { error: rmDeleteError } = await supabaseAdmin
        .from("evaluaciones_rm")
        .delete()
        .in("id", rmEvalIds);
      if (rmDeleteError) throw new Error(rmDeleteError.message);
    }

    // --- FMS Evaluaciones ---
    const { data: fmsEvaluaciones, error: fmsEvalError } = await supabaseAdmin
      .from("evaluaciones_fms")
      .select("id")
      .eq("profesor_id", profesorId);
    if (fmsEvalError) throw new Error(fmsEvalError.message);
    const fmsEvalIds = fmsEvaluaciones?.map((e: any) => e.id) ?? [];
    if (fmsEvalIds.length > 0) {
      // Delete from evaluaciones_fms_tests
      const { error: fmsTestsError } = await supabaseAdmin
        .from("evaluaciones_fms_tests")
        .delete()
        .in("evaluacion_fms_id", fmsEvalIds);
      if (fmsTestsError) throw new Error(fmsTestsError.message);

      // Delete from evaluaciones_fms
      const { error: fmsDeleteError } = await supabaseAdmin
        .from("evaluaciones_fms")
        .delete()
        .in("id", fmsEvalIds);
      if (fmsDeleteError) throw new Error(fmsDeleteError.message);
    }

    // --- Plantillas Evaluaciones ---
    const { data: plantillaEvaluaciones, error: plantillaEvalError } = await supabaseAdmin
      .from("evaluacion_plantillas")
      .select("id")
      .eq("profesor_id", profesorId);
    if (plantillaEvalError) throw new Error(plantillaEvalError.message);
    const plantillaEvalIds = plantillaEvaluaciones?.map((e: any) => e.id) ?? [];
    if (plantillaEvalIds.length > 0) {
      // Delete from evaluacion_plantilla_ejercicios
      const { error: plantillaEjerciciosError } = await supabaseAdmin
        .from("evaluacion_plantilla_ejercicios")
        .delete()
        .in("plantilla_id", plantillaEvalIds);
      if (plantillaEjerciciosError) throw new Error(plantillaEjerciciosError.message);

      // Delete from evaluacion_plantillas
      const { error: plantillaDeleteError } = await supabaseAdmin
        .from("evaluacion_plantillas")
        .delete()
        .in("id", plantillaEvalIds);
      if (plantillaDeleteError) throw new Error(plantillaDeleteError.message);
    }

    // Set registrado_por = null in rms_historial
    const { error: registradoPorNullError } = await supabaseAdmin
      .from("rms_historial")
      .update({ registrado_por: null })
      .eq("registrado_por", profesorId);
    if (registradoPorNullError) throw new Error(registradoPorNullError.message);

    // Set actualizado_por = null in rms_actuales
    const { error: actualizadoPorNullError } = await supabaseAdmin
      .from("rms_actuales")
      .update({ actualizado_por: null })
      .eq("actualizado_por", profesorId);
    if (actualizadoPorNullError) throw new Error(actualizadoPorNullError.message);

    // --- Rutinas del profesor ---
    const { data: rutinasProfesor, error: rutinasProfesorError } = await supabaseAdmin
      .from("rutinas")
      .select("id")
      .or(`profesor_id.eq.${profesorId},creada_por.eq.${profesorId}`);
    if (rutinasProfesorError) throw new Error(rutinasProfesorError.message);

    const rutinaIds = rutinasProfesor?.map((rutina: any) => rutina.id) ?? [];

    if (rutinaIds.length > 0) {
      const { error: rutinaAsignacionesDeleteError } = await supabaseAdmin
        .from("rutina_asignaciones")
        .delete()
        .in("rutina_id", rutinaIds);
      if (rutinaAsignacionesDeleteError) throw new Error(rutinaAsignacionesDeleteError.message);

      const { data: rutinaEjercicios, error: rutinaEjerciciosSelectError } = await supabaseAdmin
        .from("rutina_ejercicios")
        .select("id")
        .in("rutina_id", rutinaIds);
      if (rutinaEjerciciosSelectError) throw new Error(rutinaEjerciciosSelectError.message);

      const rutinaEjercicioIds = rutinaEjercicios?.map((ejercicio: any) => ejercicio.id) ?? [];

      if (rutinaEjercicioIds.length > 0) {
        const { error: rutinaSeriesDeleteError } = await supabaseAdmin
          .from("rutina_ejercicio_series")
          .delete()
          .in("rutina_ejercicio_id", rutinaEjercicioIds);
        if (rutinaSeriesDeleteError) throw new Error(rutinaSeriesDeleteError.message);
      }

      const { error: rutinaEjerciciosDeleteError } = await supabaseAdmin
        .from("rutina_ejercicios")
        .delete()
        .in("rutina_id", rutinaIds);
      if (rutinaEjerciciosDeleteError) throw new Error(rutinaEjerciciosDeleteError.message);

      const { error: rutinaEntradaCalorDeleteError } = await supabaseAdmin
        .from("rutina_entrada_calor")
        .delete()
        .in("rutina_id", rutinaIds);
      if (rutinaEntradaCalorDeleteError) throw new Error(rutinaEntradaCalorDeleteError.message);

      const { error: rutinasDeleteError } = await supabaseAdmin
        .from("rutinas")
        .delete()
        .in("id", rutinaIds);
      if (rutinasDeleteError) throw new Error(rutinasDeleteError.message);
    }

    // Delete from profiles
    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", profesorId);
    if (profileDeleteError) throw new Error(profileDeleteError.message);

    // Delete Auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(profesorId);
    if (authDeleteError) throw new Error(authDeleteError.message);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
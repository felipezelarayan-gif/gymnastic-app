import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { alumnoId } = await request.json();

    if (!alumnoId) {
      return NextResponse.json(
        { error: "alumnoId es obligatorio." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── 1. Obtener datos del alumno (user_id, profesor_id) ──
    const { data: alumno, error: alumnoError } = await supabaseAdmin
      .from("alumnos")
      .select("id, user_id, profesor_id")
      .eq("id", alumnoId)
      .single();

    if (alumnoError || !alumno) {
      return NextResponse.json(
        { error: alumnoError?.message || "Alumno no encontrado." },
        { status: 400 }
      );
    }

    const userId = alumno.user_id;

    // ── 2. Obtener IDs de evaluaciones_rm del alumno ──
    const { data: evaluacionesRm, error: evalRmFetchError } = await supabaseAdmin
      .from("evaluaciones_rm")
      .select("id")
      .eq("alumno_id", alumnoId);

    if (evalRmFetchError) {
      return NextResponse.json(
        { error: `Error al obtener evaluaciones RM: ${evalRmFetchError.message}` },
        { status: 500 }
      );
    }

    const evaluacionesRmIds = (evaluacionesRm ?? []).map((r) => r.id);

    // ── 3. Borrar evaluaciones_rm_resultados asociados ──
    if (evaluacionesRmIds.length > 0) {
      const { error: rmResultadosError } = await supabaseAdmin
        .from("evaluaciones_rm_resultados")
        .delete()
        .in("evaluacion_rm_id", evaluacionesRmIds);

      if (rmResultadosError) {
        return NextResponse.json(
          { error: `Error al borrar resultados RM: ${rmResultadosError.message}` },
          { status: 500 }
        );
      }

      // ── 4. Borrar rms_historial asociado a esas evaluaciones ──
      const { error: rmsHistorialRmError } = await supabaseAdmin
        .from("rms_historial")
        .delete()
        .in("evaluacion_rm_id", evaluacionesRmIds);

      if (rmsHistorialRmError) {
        return NextResponse.json(
          { error: `Error al borrar historial RM (por evaluación): ${rmsHistorialRmError.message}` },
          { status: 500 }
        );
      }

      // ── 5. Borrar rms_actuales asociado a esas evaluaciones ──
      const { error: rmsActualesRmError } = await supabaseAdmin
        .from("rms_actuales")
        .delete()
        .in("evaluacion_rm_id", evaluacionesRmIds);

      if (rmsActualesRmError) {
        return NextResponse.json(
          { error: `Error al borrar RM actuales (por evaluación): ${rmsActualesRmError.message}` },
          { status: 500 }
        );
      }

      // ── 6. Borrar evaluaciones_rm del alumno ──
      const { error: rmError } = await supabaseAdmin
        .from("evaluaciones_rm")
        .delete()
        .in("id", evaluacionesRmIds);

      if (rmError) {
        return NextResponse.json(
          { error: `Error al borrar evaluaciones RM: ${rmError.message}` },
          { status: 500 }
        );
      }
    }

    // ── 7. Obtener IDs de evaluaciones_fms del alumno ──
    const { data: evaluacionesFms, error: evalFmsFetchError } = await supabaseAdmin
      .from("evaluaciones_fms")
      .select("id")
      .eq("alumno_id", alumnoId);

    if (evalFmsFetchError) {
      return NextResponse.json(
        { error: `Error al obtener evaluaciones FMS: ${evalFmsFetchError.message}` },
        { status: 500 }
      );
    }

    const evaluacionesFmsIds = (evaluacionesFms ?? []).map((r) => r.id);

    // ── 8. Borrar evaluaciones_fms_tests asociados ──
    if (evaluacionesFmsIds.length > 0) {
      const { error: fmsTestsError } = await supabaseAdmin
        .from("evaluaciones_fms_tests")
        .delete()
        .in("evaluacion_fms_id", evaluacionesFmsIds);

      if (fmsTestsError) {
        return NextResponse.json(
          { error: `Error al borrar tests FMS: ${fmsTestsError.message}` },
          { status: 500 }
        );
      }

      // ── 9. Borrar evaluaciones_fms del alumno ──
      const { error: fmsError } = await supabaseAdmin
        .from("evaluaciones_fms")
        .delete()
        .in("id", evaluacionesFmsIds);

      if (fmsError) {
        return NextResponse.json(
          { error: `Error al borrar evaluaciones FMS: ${fmsError.message}` },
          { status: 500 }
        );
      }
    }

    // ── 10. Borrar registros_entrenamiento del alumno ──
    const { error: registrosError } = await supabaseAdmin
      .from("registros_entrenamiento")
      .delete()
      .eq("alumno_id", alumnoId);

    if (registrosError) {
      return NextResponse.json(
        { error: `Error al borrar registros de entrenamiento: ${registrosError.message}` },
        { status: 500 }
      );
    }

    // ── 11. Borrar rutina_asignaciones del alumno ──
    const { error: asignacionesError } = await supabaseAdmin
      .from("rutina_asignaciones")
      .delete()
      .eq("alumno_id", alumnoId);

    if (asignacionesError) {
      return NextResponse.json(
        { error: `Error al borrar asignaciones de rutina: ${asignacionesError.message}` },
        { status: 500 }
      );
    }

    // ── 12. Borrar rms_actuales restantes del alumno ──
    const { error: rmsActualesError } = await supabaseAdmin
      .from("rms_actuales")
      .delete()
      .eq("alumno_id", alumnoId);

    if (rmsActualesError) {
      return NextResponse.json(
        { error: `Error al borrar RM actuales: ${rmsActualesError.message}` },
        { status: 500 }
      );
    }

    // ── 13. Borrar rms_historial restante del alumno ──
    const { error: rmsHistorialError } = await supabaseAdmin
      .from("rms_historial")
      .delete()
      .eq("alumno_id", alumnoId);

    if (rmsHistorialError) {
      return NextResponse.json(
        { error: `Error al borrar historial RM: ${rmsHistorialError.message}` },
        { status: 500 }
      );
    }

    // ── 13.5. Desvincular rutinas creadas para el alumno ──
    // Las rutinas pertenecen al profesor, pero pueden tener creada_para_alumno_id
    // apuntando a este alumno. Lo seteamos en NULL para no romper la FK.
    const { error: rutinasCreadasError } = await supabaseAdmin
      .from("rutinas")
      .update({ creada_para_alumno_id: null })
      .eq("creada_para_alumno_id", alumnoId);

    if (rutinasCreadasError) {
      return NextResponse.json(
        { error: `Error al desvincular rutinas del alumno: ${rutinasCreadasError.message}` },
        { status: 500 }
      );
    }

    // ── 14. Borrar alumno de la tabla alumnos ──
    const { error: deleteAlumnoError } = await supabaseAdmin
      .from("alumnos")
      .delete()
      .eq("id", alumnoId);

    if (deleteAlumnoError) {
      return NextResponse.json(
        { error: `Error al borrar alumno: ${deleteAlumnoError.message}` },
        { status: 500 }
      );
    }

    // ── 15. Borrar profile vinculado al user_id ──
    // profiles.id es igual a auth.users.id, y alumno.user_id referencia profiles.id
    if (userId) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) {
        return NextResponse.json(
          { error: `Error al borrar profile: ${profileError.message}` },
          { status: 500 }
        );
      }

      // ── 16. Borrar usuario de auth ──
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (authError) {
        return NextResponse.json(
          { error: `Error al borrar usuario de auth: ${authError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
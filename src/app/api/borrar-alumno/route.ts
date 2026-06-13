import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

  // Obtener user_id del alumno
  const { data: alumno, error: alumnoError } = await supabaseAdmin
    .from("alumnos")
    .select("user_id")
    .eq("id", alumnoId)
    .single();

  if (alumnoError) {
    return NextResponse.json({ error: alumnoError.message }, { status: 400 });
  }

  if (!alumno?.user_id) {
    return NextResponse.json(
      { error: "El alumno no tiene user_id." },
      { status: 400 }
    );
  }

  // Borrar registros relacionados antes de borrar el alumno
  const { error: registrosError } = await supabaseAdmin
    .from("registros_entrenamiento")
    .delete()
    .eq("alumno_id", alumnoId);

  if (registrosError) {
    return NextResponse.json({ error: registrosError.message }, { status: 400 });
  }

  const { error: asignacionesError } = await supabaseAdmin
    .from("rutina_asignaciones")
    .delete()
    .eq("alumno_id", alumnoId);

  if (asignacionesError) {
    return NextResponse.json({ error: asignacionesError.message }, { status: 400 });
  }

  const { error: rmsActualesError } = await supabaseAdmin
    .from("rms_actuales")
    .delete()
    .eq("alumno_id", alumnoId);

  if (rmsActualesError) {
    return NextResponse.json({ error: rmsActualesError.message }, { status: 400 });
  }

  const { error: rmsHistorialError } = await supabaseAdmin
    .from("rms_historial")
    .delete()
    .eq("alumno_id", alumnoId);

  if (rmsHistorialError) {
    return NextResponse.json({ error: rmsHistorialError.message }, { status: 400 });
  }

  // Borrar alumno de la tabla alumnos
  const { error: deleteAlumnoError } = await supabaseAdmin
    .from("alumnos")
    .delete()
    .eq("id", alumnoId);

  if (deleteAlumnoError) {
    return NextResponse.json({ error: deleteAlumnoError.message }, { status: 400 });
  }

  // Borrar profile
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", alumno.user_id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Borrar usuario de auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
    alumno.user_id
  );

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
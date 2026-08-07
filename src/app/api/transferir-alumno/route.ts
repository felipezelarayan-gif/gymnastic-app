import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { alumnoId, nuevoProfesorId } = await request.json();

    if (!alumnoId || !nuevoProfesorId) {
      return NextResponse.json(
        { error: "alumnoId y nuevoProfesorId son obligatorios." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── 1. Obtener el alumno y el caller ──
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser(
      request.headers.get("authorization")?.replace("Bearer ", "") || ""
    );

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    // ── 2. Verificar que el caller es admin o el profesor actual del alumno ──
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();

    const { data: alumno } = await supabaseAdmin
      .from("alumnos")
      .select("id, profesor_id")
      .eq("id", alumnoId)
      .single();

    if (!alumno) {
      return NextResponse.json(
        { error: "Alumno no encontrado." },
        { status: 404 }
      );
    }

    const isAdmin = callerProfile?.rol === "admin";
    const isProfesorActual = alumno.profesor_id === user.id;

    if (!isAdmin && !isProfesorActual) {
      return NextResponse.json(
        { error: "No tenés permisos para transferir este alumno." },
        { status: 403 }
      );
    }

    // ── 3. Verificar que el nuevo profesor existe ──
    const { data: nuevoProfesor } = await supabaseAdmin
      .from("profiles")
      .select("id, rol")
      .eq("id", nuevoProfesorId)
      .maybeSingle();

    if (!nuevoProfesor) {
      return NextResponse.json(
        { error: "El profesor destino no existe." },
        { status: 400 }
      );
    }

    // ── 4. Transferir: actualizar profesor_id ──
    const { error: updateError } = await supabaseAdmin
      .from("alumnos")
      .update({ profesor_id: nuevoProfesorId })
      .eq("id", alumnoId);

    if (updateError) {
      return NextResponse.json(
        { error: `Error al transferir: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.getUser(token);

  if (authUserError || !authUserData.user) {
    return NextResponse.json(
      { error: authUserError?.message || "No se pudo validar el usuario." },
      { status: 401 }
    );
  }

  const profesorId = authUserData.user.id;

  // Obtener todos los alumnos con solo las columnas necesarias
  const { data: alumnos, error: alumnosError } = await supabaseAdmin
    .from("alumnos")
    .select("id,user_id,nombre,apellido,email,telefono,foto_url,fecha_nacimiento,sexo,observaciones,created_at,profesor_id")
    .eq("profesor_id", profesorId)
    .order("nombre", { ascending: true });

  if (alumnosError) {
    return NextResponse.json({ error: alumnosError.message }, { status: 400 });
  }

  // Obtener profiles solo para los user_ids de los alumnos
  const userIds = (alumnos || []).map((a) => a.user_id).filter(Boolean);

  if (userIds.length === 0) {
    return NextResponse.json(
      (alumnos || []).map((alumno) => ({
        ...alumno,
        invitacion_pendiente: false,
      }))
    );
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, invitacion_pendiente")
    .in("id", userIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 400 });
  }

  // Unir por alumnos.user_id = profiles.id
  const alumnosConInvitacion = (alumnos || []).map((alumno) => {
    const profile = (profiles || []).find(
      (p) => alumno.user_id && p.id === alumno.user_id
    );

    return {
      ...alumno,
      invitacion_pendiente: profile?.invitacion_pendiente ?? false,
    };
  });

  return NextResponse.json(alumnosConInvitacion);
}
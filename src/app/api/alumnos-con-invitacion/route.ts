import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Obtener todos los alumnos
  const { data: alumnos, error: alumnosError } = await supabaseAdmin
    .from("alumnos")
    .select("*")
    .order("nombre", { ascending: true });

  if (alumnosError) {
    return NextResponse.json({ error: alumnosError.message }, { status: 400 });
  }

  // Obtener todos los profiles con invitacion_pendiente
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, invitacion_pendiente");

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 400 });
  }

  // Obtener usuarios de auth para saber quiénes ya iniciaron sesión
  // (y por lo tanto ya crearon su contraseña)
  const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  });

  const signedInUserIds = new Set(
    (authUsersData?.users || [])
      .filter((u) => u.last_sign_in_at)
      .map((u) => u.id)
  );

  // Unir por alumnos.user_id = profiles.id
  const alumnosConInvitacion = (alumnos || []).map((alumno) => {
    const profile = (profiles || []).find(
      (p) => alumno.user_id && p.id === alumno.user_id
    );

    // Si el usuario ya inició sesión (tiene last_sign_in_at),
    // ya creó su contraseña sin importar el valor en profiles
    const yaCreoContrasena =
      alumno.user_id && signedInUserIds.has(alumno.user_id);

    return {
      ...alumno,
      invitacion_pendiente: yaCreoContrasena
        ? false
        : (profile?.invitacion_pendiente ?? false),
    };
  });

  return NextResponse.json(alumnosConInvitacion);
}
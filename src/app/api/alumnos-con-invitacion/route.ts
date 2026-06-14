import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Obtener todos los alumnos con solo las columnas necesarias
  const { data: alumnos, error: alumnosError } = await supabaseAdmin
    .from("alumnos")
    .select("id,user_id,nombre,apellido,email,telefono,foto_url,fecha_nacimiento,sexo,observaciones,created_at")
    .order("nombre", { ascending: true });

  if (alumnosError) {
    return NextResponse.json({ error: alumnosError.message }, { status: 400 });
  }

  // Obtener profiles solo para los user_ids de los alumnos
  const userIds = (alumnos || []).map((a) => a.user_id).filter(Boolean);

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
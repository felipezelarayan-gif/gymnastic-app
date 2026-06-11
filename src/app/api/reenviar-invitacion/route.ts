import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId, email } = await request.json();

  if (!userId && !email) {
    return NextResponse.json(
      { error: "Se requiere userId o email." },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://gymnastic-app-u64l.vercel.app";

  let query = supabaseAdmin
    .from("profiles")
    .select("id,email,invitacion_pendiente");

  if (userId) {
    query = query.eq("id", userId);
  } else {
    query = query.eq("email", email);
  }

  const { data: profile, error: profileError } = await query.maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (!profile) {
    return NextResponse.json(
      { error: "No se encontró un usuario con ese userId o email." },
      { status: 404 }
    );
  }

  if (profile.invitacion_pendiente === false) {
    return NextResponse.json(
      { error: "Este usuario ya creó su contraseña." },
      { status: 400 }
    );
  }

  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    profile.email,
    {
      redirectTo: `${siteUrl}/bienvenida`,
    }
  );

  if (inviteError) {
    return NextResponse.json(
      { error: inviteError.message || "No se pudo reenviar la invitación." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
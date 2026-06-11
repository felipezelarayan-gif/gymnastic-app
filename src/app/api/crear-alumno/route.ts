import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { nombre, apellido, email, telefono, rol } = await request.json();

  if (!nombre || !email) {
    return NextResponse.json(
      { error: "Nombre y email son obligatorios." },
      { status: 400 }
    );
  }

  const rolFinal = rol || "alumno";

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        nombre,
        apellido,
        rol: rolFinal,
      },
      redirectTo: siteUrl ? `${siteUrl}/reset-password` : undefined,
    });

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: userError?.message || "No se pudo invitar al usuario." },
      { status: 400 }
    );
  }

  const userId = userData.user.id;

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    email,
    nombre,
    rol: rolFinal,
    es_admin: false,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (rolFinal === "alumno") {
    const { error: alumnoError } = await supabaseAdmin.from("alumnos").insert({
      nombre,
      apellido: apellido || null,
      email,
      telefono: telefono || null,
      user_id: userId,
    });

    if (alumnoError) {
      return NextResponse.json({ error: alumnoError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
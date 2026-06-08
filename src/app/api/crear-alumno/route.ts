import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { nombre, apellido, email, telefono, password, rol } =
    await request.json();

  if (!nombre || !email || !password) {
    return NextResponse.json(
      { error: "Nombre, email y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  const rolFinal = rol || "alumno";

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellido,
        rol: rolFinal,
      },
    });

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: userError?.message || "No se pudo crear el usuario." },
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
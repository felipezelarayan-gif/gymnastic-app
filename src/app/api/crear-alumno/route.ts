import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { nombre, apellido, email } = await request.json();

  if (!nombre || !email) {
    return NextResponse.json(
      { error: "Nombre y email son obligatorios." },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const passwordTemporal = "12345678";

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: passwordTemporal,
      email_confirm: true,
      user_metadata: {
        nombre,
        apellido,
        rol: "alumno",
      },
    });

  if (userError) {
    return NextResponse.json(
      { error: userError.message },
      { status: 400 }
    );
  }

  const userId = userData.user.id;

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: userId,
      email,
      nombre,
      rol: "alumno",
    });

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 400 }
    );
  }

  const { error: alumnoError } = await supabaseAdmin
    .from("alumnos")
    .insert({
      nombre,
      apellido,
      email,
      user_id: userId,
    });

  if (alumnoError) {
    return NextResponse.json(
      { error: alumnoError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    passwordTemporal,
  });
}
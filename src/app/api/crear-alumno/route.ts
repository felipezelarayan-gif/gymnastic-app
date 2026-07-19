import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { nombre, apellido, email, telefono, rol, profesorId, siteUrl: clientSiteUrl } = await request.json();

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

  const siteUrl = clientSiteUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://gymnastic-app-u64l.vercel.app";

  let profesorCreadorId = profesorId || null;

  if (!profesorCreadorId) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
      const { data: authUserData } = await supabaseAdmin.auth.getUser(token);
      profesorCreadorId = authUserData.user?.id || null;
    }
  }

  // Validar permisos: solo admins pueden crear profesores
  if (rolFinal === "profe") {
    if (!profesorCreadorId) {
      return NextResponse.json(
        { error: "No autorizado. Necesitás iniciar sesión." },
        { status: 401 }
      );
    }

    const { data: perfilCreador, error: perfilError } = await supabaseAdmin
      .from("profiles")
      .select("es_admin, puede_crear_profesores")
      .eq("id", profesorCreadorId)
      .single();

    if (perfilError || !perfilCreador || (!perfilCreador.es_admin && !perfilCreador.puede_crear_profesores)) {
      return NextResponse.json(
        { error: "No autorizado. Solo los administradores pueden crear profesores." },
        { status: 403 }
      );
    }
  }

  console.log("Invite redirect URL:", `${siteUrl}/bienvenida`);

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        nombre,
        apellido,
        rol: rolFinal,
      },
      redirectTo: siteUrl ? `${siteUrl}/bienvenida` : undefined,
    });

  let userId = userData.user?.id;

  if (userError || !userId) {
    const esErrorTriggerAuth = userError?.message
      ?.toLowerCase()
      .includes("database error saving new user");

    if (!esErrorTriggerAuth) {
      return NextResponse.json(
        { error: userError?.message || "No se pudo invitar al usuario." },
        { status: 400 }
      );
    }

    const { data: usuariosData, error: usuariosError } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (usuariosError) {
      return NextResponse.json({ error: usuariosError.message }, { status: 400 });
    }

    const usuarioExistente = usuariosData.users.find(
      (usuario) => usuario.email?.toLowerCase() === email.toLowerCase()
    );

    if (!usuarioExistente) {
      return NextResponse.json(
        { error: userError?.message || "No se pudo invitar al usuario." },
        { status: 400 }
      );
    }

    userId = usuarioExistente.id;
  }

  const profileData: any = {
    id: userId,
    email,
    nombre,
    rol: rolFinal,
    es_admin: false,
    invitacion_pendiente: true,
  };

  // Si es un profesor, guardar quién lo creó
  if (rolFinal === "profe" && profesorCreadorId) {
    profileData.creado_por = profesorCreadorId;
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    profileData,
    { onConflict: "id" }
  );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (rolFinal === "alumno") {
    const { error: alumnoError } = await supabaseAdmin.from("alumnos").upsert(
      {
        nombre,
        apellido: apellido || null,
        email,
        telefono: telefono || null,
        user_id: userId,
        profesor_id: profesorCreadorId,
      },
      { onConflict: "user_id" }
    );

    if (alumnoError) {
      return NextResponse.json({ error: alumnoError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
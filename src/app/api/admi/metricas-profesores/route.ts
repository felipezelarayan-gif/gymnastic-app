

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Profesor = {
  id: string;
  nombre: string | null;
  email: string | null;
};

type Alumno = {
  id: string;
  profesor_id: string | null;
};

type RutinaAsignacion = {
  alumno_id: string | null;
  fecha_asignacion: string | null;
  created_at: string | null;
};

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.getUser(token);

    if (authUserError || !authUserData.user) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, es_admin")
      .eq("id", authUserData.user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profileData?.es_admin) {
      return NextResponse.json({ error: "No tenés permiso para ver estas métricas." }, { status: 403 });
    }

    const fechaActivosDesde = new Date();
    fechaActivosDesde.setDate(fechaActivosDesde.getDate() - 30);
    const fechaActivosISO = fechaActivosDesde.toISOString();

    const [
      { data: profesoresData, error: profesoresError },
      { data: alumnosData, error: alumnosError },
      { data: asignacionesData, error: asignacionesError },
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, nombre, email")
        .eq("rol", "profe")
        .order("nombre", { ascending: true }),
      supabaseAdmin.from("alumnos").select("id, profesor_id"),
      supabaseAdmin
        .from("rutina_asignaciones")
        .select("alumno_id, fecha_asignacion, created_at")
        .or(`fecha_asignacion.gte.${fechaActivosISO},created_at.gte.${fechaActivosISO}`),
    ]);

    if (profesoresError) {
      return NextResponse.json({ error: profesoresError.message }, { status: 500 });
    }

    if (alumnosError) {
      return NextResponse.json({ error: alumnosError.message }, { status: 500 });
    }

    if (asignacionesError) {
      return NextResponse.json({ error: asignacionesError.message }, { status: 500 });
    }

    const alumnosPorProfesor = new Map<string, number>();
    const profesorPorAlumno = new Map<string, string>();

    ((alumnosData || []) as Alumno[]).forEach((alumno) => {
      if (!alumno.profesor_id) return;

      profesorPorAlumno.set(alumno.id, alumno.profesor_id);
      alumnosPorProfesor.set(
        alumno.profesor_id,
        (alumnosPorProfesor.get(alumno.profesor_id) || 0) + 1
      );
    });

    const alumnosActivosPorProfesor = new Map<string, Set<string>>();

    ((asignacionesData || []) as RutinaAsignacion[]).forEach((asignacion) => {
      if (!asignacion.alumno_id) return;

      const profesorAlumno = profesorPorAlumno.get(asignacion.alumno_id);
      if (!profesorAlumno) return;

      const alumnosActivos = alumnosActivosPorProfesor.get(profesorAlumno) || new Set<string>();
      alumnosActivos.add(asignacion.alumno_id);
      alumnosActivosPorProfesor.set(profesorAlumno, alumnosActivos);
    });

    const metricas = ((profesoresData || []) as Profesor[]).map((profesor) => ({
      profesorId: profesor.id,
      nombre: profesor.nombre || "Profesor sin nombre",
      email: profesor.email || "Sin email",
      totalAlumnos: alumnosPorProfesor.get(profesor.id) || 0,
      alumnosActivos: alumnosActivosPorProfesor.get(profesor.id)?.size || 0,
    }));

    return NextResponse.json({ metricas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
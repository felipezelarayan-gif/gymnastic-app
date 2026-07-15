"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { normalizarRelacion } from "@/lib/utils/normalizarRelacion";
import EstadoAlumnoCard from "@/components/alumno/EstadoAlumnoCard";
import { obtenerEstadoAlumno } from "@/lib/alumno/obtenerEstadoAlumno";
import {
  obtenerPendientesAlumno,
  type ResumenPendientesAlumno,
} from "@/lib/alumno/obtenerPendientesAlumnos";
import { obtenerRMsActualesAlumno } from "@/lib/rmActual";
import { obtenerMetricasResumen } from "@/lib/alumno/obtenerMetricasResumen";

type Profile = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
};

type Alumno = {
  id: string;
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
  user_id?: string | null;
  foto_url?: string | null;
};

type RutinaAsignada = {
  id: string;
  rutina_id: string;
  completada?: boolean | null;
  activa?: boolean | null;
  fecha_asignacion?: string | null;
  rutinas?: {
    id: string;
    nombre?: string | null;
    objetivo?: string | null;
    estructura?: string | null;
  } | null;
};

type RutinaRelacion =
  | RutinaAsignada["rutinas"]
  | NonNullable<RutinaAsignada["rutinas"]>[];

type RutinaAsignadaResponse = Omit<RutinaAsignada, "rutinas"> & {
  rutinas?: RutinaRelacion;
};

type EvaluacionPendiente = {
  id: string;
  tipo: "rm";
  nombre: string;
  fecha_realizacion?: string | null;
  puede_cargar_alumno?: boolean | null;
};

const resumenPendientesInicial: ResumenPendientesAlumno = {
  tienePendientes: false,
  pendientes: [],
  rutinasPendientes: [],
  evaluacionesPendientes: [],
};

function iniciales(nombre?: string | null, apellido?: string | null) {
  const primera = nombre?.trim()?.[0] || "";
  const segunda = apellido?.trim()?.[0] || "";

  return `${primera}${segunda}`.toUpperCase() || "A";
}

export default function AlumnoHomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [loading, setLoading] = useState(true);

  const [rutinasAsignadas, setRutinasAsignadas] = useState<RutinaAsignada[]>(
    []
  );
  const [evaluacionesPendientes, setEvaluacionesPendientes] = useState<
    EvaluacionPendiente[]
  >([]);
  const [resumenPendientes, setResumenPendientes] =
    useState<ResumenPendientesAlumno>(resumenPendientesInicial);

  // Estados livianos para el resumen rápido (solo números + mejor RM)
  const [ejerciciosCompletados, setEjerciciosCompletados] = useState(0);
  const [entrenamientosSemana, setEntrenamientosSemana] = useState(0);
  const [mejorRM, setMejorRM] = useState<{ nombre: string; rm: number } | null>(null);
  const [rutinasCompletadas, setRutinasCompletadas] = useState(0);
  const [evaluacionesCompletadas, setEvaluacionesCompletadas] = useState(0);

  async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

    // ── ETAPA 1: Profile + Alumno en paralelo ──
    const [perfilResult, alumnoResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,nombre,email,rol")
        .eq("id", user.id)
        .single(),
      supabase
        .from("alumnos")
        .select("id,nombre,apellido,email,user_id,foto_url")
        .eq("user_id", user.id)
        .single(),
    ]);

    const perfil = perfilResult.data;
    const perfilError = perfilResult.error;
    const alumnoData = alumnoResult.data;
    const alumnoError = alumnoResult.error;

    if (perfilError || !perfil || perfil.rol !== "alumno") {
      window.location.href = "/";
      return;
    }

    if (alumnoError || !alumnoData) {
      setLoading(false);
      return;
    }

    // ── ETAPA 2: Pendientes + Asignaciones + Evaluaciones + Métricas + RMS en paralelo ──
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    hace7Dias.setHours(0, 0, 0, 0);

    const [
      pendientesAlumno,
      asignacionesResult,
      evaluacionesResult,
      metricasResumen,
      entrenamientosCountResult,
      rmsResult,
    ] = await Promise.all([
      obtenerPendientesAlumno(supabase, alumnoData.id),
      supabase
        .from("rutina_asignaciones")
        .select(`
          id,
          rutina_id,
          completada,
          activa,
          fecha_asignacion,
          rutinas (
            id,
            nombre,
            objetivo,
            estructura
          )
        `)
        .eq("alumno_id", alumnoData.id)
        .order("fecha_asignacion", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("evaluaciones_rm")
        .select("id,nombre,fecha_realizacion,puede_cargar_alumno,permitir_carga_alumno,asignada_al_alumno")
        .eq("alumno_id", alumnoData.id)
        .eq("estado", "pendiente")
        .is("deleted_at", null)
        .order("fecha_asignacion", { ascending: true }),
      // Métricas compartidas con /progreso (ejercicios + rutinas completadas)
      obtenerMetricasResumen(supabase, alumnoData.id),
      // Entrenamientos en los últimos 7 días (mismo origen que rutinas completadas)
      supabase
        .from("rutina_asignaciones")
        .select("id", { count: "exact", head: true })
        .eq("alumno_id", alumnoData.id)
        .eq("completada", true)
        .gte("fecha_completada", hace7Dias.toISOString()),
      // Mejor RM usando la lib existente (busca en rms_historial)
      obtenerRMsActualesAlumno(alumnoData.id),
    ]);

    const asignacionesData = asignacionesResult.data;
    const evaluacionesRMData = evaluacionesResult.data;

    const asignaciones = ((asignacionesData || []) as RutinaAsignadaResponse[]).map(
      (asignacion) => ({
        ...asignacion,
        rutinas: normalizarRelacion(asignacion.rutinas as RutinaRelacion),
      })
    );

    const evaluacionesPendientesMapeadas: EvaluacionPendiente[] = (
      evaluacionesRMData || []
    ).map((evaluacion) => ({
      id: evaluacion.id,
      tipo: "rm" as const,
      nombre: evaluacion.nombre || "Evaluación de RM",
      fecha_realizacion: evaluacion.fecha_realizacion,
      puede_cargar_alumno:
        evaluacion.puede_cargar_alumno ||
        evaluacion.permitir_carga_alumno ||
        evaluacion.asignada_al_alumno,
    }));

    // Calcular mejor RM con nombre del ejercicio
    const rmsCalculados = rmsResult.data || [];
    const mejorRMCalculado = rmsCalculados[0] || null;
    let mejorRMNombre = null;
    if (mejorRMCalculado) {
      const { data: ejercicioData } = await supabase
        .from("ejercicios")
        .select("nombre")
        .eq("id", mejorRMCalculado.ejercicio_id)
        .single();
      mejorRMNombre = ejercicioData?.nombre || "Ejercicio";
    }

    // Agrupar todos los setState para reducir re-renders
    setProfile(perfil);
    setAlumno(alumnoData);
    setResumenPendientes(pendientesAlumno);
    setRutinasAsignadas(asignaciones);
    setEvaluacionesPendientes(evaluacionesPendientesMapeadas);
    setEjerciciosCompletados(metricasResumen.ejerciciosCompletados);
    setRutinasCompletadas(metricasResumen.rutinasCompletadas);
    setEvaluacionesCompletadas(metricasResumen.evaluacionesCompletadas);
    setEntrenamientosSemana(entrenamientosCountResult.count ?? 0);
    setMejorRM(
      mejorRMCalculado
        ? { nombre: mejorRMNombre || "Ejercicio", rm: mejorRMCalculado.rm_calculado || 0 }
        : null
    );

    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      cargarDatos();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const rutinaPendiente = useMemo(() => {
    return (
      rutinasAsignadas.find((rutina) => {
        if (rutina.completada) return false;
        if (rutina.activa === false) return false;

        return true;
      }) || null
    );
  }, [rutinasAsignadas]);

  const evaluacionPendiente = useMemo(() => {
    return evaluacionesPendientes[0] || null;
  }, [evaluacionesPendientes]);

  // Calcular rutinas vencidas
  const overdueCount = useMemo(() => {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, "0");
    const d = String(hoy.getDate()).padStart(2, "0");
    const hoyKey = `${y}-${m}-${d}`;
    return resumenPendientes.pendientes.filter((p) => {
      if (!p.fecha) return false;
      const fecha = p.fecha.split("T")[0];
      return fecha < hoyKey;
    }).length;
  }, [resumenPendientes]);

  const tieneHistorial =
    rutinasAsignadas.length > 0 || ejerciciosCompletados > 0;
  const estadoAlumno = obtenerEstadoAlumno({
    pendientes: resumenPendientes,
    tieneHistorial,
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
        <div className="max-w-4xl mx-auto animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-zinc-800 shrink-0" />
            <div className="space-y-3">
              <div className="h-8 w-64 rounded bg-zinc-800" />
              <div className="h-4 w-48 rounded bg-zinc-800" />
            </div>
          </div>

          {/* Card de estado skeleton */}
          <div className="h-32 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 mb-5" />

          {/* Cards de navegación skeleton */}
          <div className="grid gap-4">
            <div className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800" />
          </div>

          {/* Resumen rápido skeleton */}
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="h-6 w-48 rounded bg-zinc-800 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="h-24 rounded-xl bg-zinc-950/40 border border-zinc-800" />
              <div className="h-24 rounded-xl bg-zinc-950/40 border border-zinc-800" />
              <div className="h-24 rounded-xl bg-zinc-950/40 border border-zinc-800" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center text-2xl font-bold text-emerald-400 shrink-0 overflow-hidden">
            {alumno?.foto_url ? (
              <img
                src={alumno.foto_url}
                alt="Foto de perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              iniciales(alumno?.nombre || profile?.nombre, alumno?.apellido)
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold">
              Hola, {alumno?.nombre || profile?.nombre} 👋
            </h1>

            <p className="text-zinc-400 mt-1">
              {entrenamientosSemana > 0
                ? `🔥 ${entrenamientosSemana} entrenamiento${
                    entrenamientosSemana === 1 ? "" : "s"
                  } los \u00faltimos 7 d\u00edas`
                : "Listo para entrenar"}
            </p>
          </div>
        </header>

        <EstadoAlumnoCard
          icono={estadoAlumno.icono}
          titulo={estadoAlumno.titulo}
          descripcion={estadoAlumno.descripcion}
          detalles={estadoAlumno.detalles}
          variante={estadoAlumno.variante}
          href={estadoAlumno.estado !== "sin-pendientes" && estadoAlumno.estado !== "bienvenido" ? "/alumno/rutina" : undefined}
        />

        <section className="grid gap-4 md:grid-cols-3">
          <Link
            href="/alumno/rutina"
            className="text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500 hover:bg-zinc-800 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">🏋️ Mi rutina</h2>
              {overdueCount > 0 && (
                <span className="text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full">
                  ❗ {overdueCount} vencida{overdueCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-zinc-400 mt-2">
              Ver rutina actual, evaluaciones y completar pendientes.
            </p>
          </Link>

          <Link
            href="/alumno/progreso"
            className="text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500 hover:bg-zinc-800 transition cursor-pointer"
          >
            <h2 className="text-xl font-semibold">📈 Mis progresos</h2>
            <p className="text-zinc-400 mt-2">
              RM, historial y estadísticas.
            </p>
          </Link>

          <Link
            href="/alumno/perfil"
            className="text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-emerald-500 hover:bg-zinc-800 transition cursor-pointer"
          >
            <h2 className="text-xl font-semibold">👤 Mi perfil</h2>
            <p className="text-zinc-400 mt-2">
              Datos personales y observaciones.
            </p>
          </Link>
        </section>

        <section className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 mt-4">
          <h2 className="text-xl font-semibold mb-4">📊 Resumen rápido</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-4">
              <p className="text-zinc-400 text-sm">Rutinas completadas</p>
              <p className="text-3xl font-bold mt-1">
                {rutinasCompletadas}
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-4">
              <p className="text-zinc-400 text-sm">Evaluaciones</p>
              <p className="text-3xl font-bold mt-1">
                {evaluacionesCompletadas}
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-4">
              <p className="text-zinc-400 text-sm">
                Ejercicios completados
              </p>
              <p className="text-3xl font-bold mt-1">
                {ejerciciosCompletados}
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950/40 border border-zinc-800 p-4">
              <p className="text-zinc-400 text-sm">Mejor RM</p>
              {mejorRM ? (
                <>
                  <p className="text-2xl font-bold mt-1 text-emerald-400">
                    {mejorRM.rm} kg
                  </p>
                  <p className="text-zinc-500 text-sm">{mejorRM.nombre}</p>
                </>
              ) : (
                <p className="text-zinc-500 mt-2">Sin registros</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
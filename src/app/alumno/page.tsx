"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { normalizarRelacion } from "@/lib/utils/normalizarRelacion";
import EstadoAlumnoCard from "@/components/alumno/EstadoAlumnoCard";
import { obtenerEstadoAlumno, type EstadoAlumnoCardData } from "@/lib/alumno/obtenerEstadoAlumno";
import { obtenerPendientesAlumno, type ResumenPendientesAlumno } from "@/lib/alumno/obtenerPendientesAlumnos";
import { obtenerRMsActualesAlumno } from "@/lib/rmActual";
import { obtenerMetricasResumen } from "@/lib/alumno/obtenerMetricasResumen";
import { useIdioma } from "@/lib/i18n-context";

type Profile = { id: string; nombre: string; email: string; rol: string; };
type Alumno = { id: string; nombre?: string | null; apellido?: string | null; email?: string | null; user_id?: string | null; foto_url?: string | null; };
type RutinaAsignada = { id: string; rutina_id: string; completada?: boolean | null; activa?: boolean | null; fecha_asignacion?: string | null; rutinas?: { id: string; nombre?: string | null; objetivo?: string | null; estructura?: string | null; } | null; };
type RutinaRelacion = RutinaAsignada["rutinas"] | NonNullable<RutinaAsignada["rutinas"]>[];
function obtenerRelacionUnica<T>(relacion: T | T[] | undefined | null): T | undefined { if (!relacion) return undefined; return Array.isArray(relacion) ? relacion[0] : relacion; }

export default function AlumnoHome() {
  const { t } = useIdioma();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [resumen, setResumen] = useState<ResumenPendientesAlumno | null>(null);
  const [rutinasCompletadas, setRutinasCompletadas] = useState(0);
  const [ejerciciosCompletados, setEjerciciosCompletados] = useState(0);
  const [evaluacionesCompletadas, setEvaluacionesCompletadas] = useState(0);
  const [mejorRM, setMejorRM] = useState<{ peso: number | null; reps: number | null; nombre: string | null; } | null>(null);
  const [estadoCard, setEstadoCard] = useState<EstadoAlumnoCardData | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => cargarDatos(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function cargarDatos() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { window.location.href = "/login"; return; }
    const user = sessionData.session.user;
    const { data: perfil } = await supabase.from("profiles").select("id, nombre, email, rol").eq("id", user.id).maybeSingle();
    if (!perfil || perfil.rol !== "alumno") { window.location.href = "/"; return; }
    setProfile(perfil);
    const { data: alumnoData } = await supabase.from("alumnos").select("id, nombre, apellido, email, user_id, foto_url").eq("user_id", user.id).maybeSingle();
    if (alumnoData) setAlumno(alumnoData);
    const resumenData = await obtenerPendientesAlumno(supabase, alumnoData!.id);
    setResumen(resumenData);

    const metricas = await obtenerMetricasResumen(supabase, alumnoData!.id);
    setRutinasCompletadas(metricas.rutinasCompletadas);
    setEjerciciosCompletados(metricas.ejerciciosCompletados);
    setEvaluacionesCompletadas(metricas.evaluacionesCompletadas);

    const tieneHistorial = metricas.rutinasCompletadas > 0 || metricas.evaluacionesCompletadas > 0;
    const estadoData = obtenerEstadoAlumno({ pendientes: resumenData, tieneHistorial, t });
    setEstadoCard(estadoData);
    const rmsResult = await obtenerRMsActualesAlumno(alumnoData!.id);
    const rms = rmsResult.data || [];
    if (rms.length > 0) {
      const mejor = rms.reduce((max, rm) => (rm.rm_calculado || 0) > (max.rm_calculado || 0) ? rm : max);
      const ids = Array.from(new Set(rms.map((rm) => rm.ejercicio_id).filter(Boolean)));
      let nombreEj = "";
      if (ids.length > 0) {
        const { data: ejData } = await supabase.from("ejercicios").select("id,nombre").in("id", ids);
        const ej = ejData?.find((e) => e.id === mejor.ejercicio_id);
        nombreEj = ej?.nombre || "";
      }
      setMejorRM({ peso: mejor.rm_calculado, reps: mejor.repeticiones, nombre: nombreEj });
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-5xl mx-auto animate-pulse">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-full bg-zinc-800 shrink-0" />
            <div className="space-y-3"><div className="h-8 w-48 rounded bg-zinc-800" /><div className="h-4 w-32 rounded bg-zinc-800" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800" />)}</div>
          <div className="h-40 rounded-2xl bg-zinc-900 border border-zinc-800 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />)}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <img src={alumno?.foto_url || "https://placehold.co/120x120/png?text=👤"} alt={t("perfil.fotoPerfil")} className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700" />
          <div>
            <h1 className="text-3xl font-bold">{t("alumno.hola", { nombre: alumno?.nombre || profile?.nombre || "" })}</h1>
            <p className="text-zinc-400 mt-1">{t("alumno.listoEntrenar")}</p>
          </div>
        </header>

        {estadoCard && <EstadoAlumnoCard {...estadoCard} />}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <Link href="/alumno/rutina" className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 hover:bg-zinc-800/70 transition">
            <h2 className="text-xl font-semibold">{t("alumno.miRutina")}</h2>
            <p className="text-zinc-400 mt-2 text-sm">{t("alumno.miRutinaDesc")}</p>
          </Link>
          <Link href="/alumno/progreso" className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 hover:bg-zinc-800/70 transition">
            <h2 className="text-xl font-semibold">{t("alumno.misProgresos")}</h2>
            <p className="text-zinc-400 mt-2 text-sm">{t("alumno.misProgresosDesc")}</p>
          </Link>
          <Link href="/alumno/perfil" className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 hover:bg-zinc-800/70 transition">
            <h2 className="text-xl font-semibold">{t("alumno.miPerfil")}</h2>
            <p className="text-zinc-400 mt-2 text-sm">{t("alumno.miPerfilDesc")}</p>
          </Link>
          <Link href="/alumno/configuracion" className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 hover:bg-zinc-800/70 transition">
            <h2 className="text-xl font-semibold">⚙️ {t("navbar.configuracion")}</h2>
            <p className="text-zinc-400 mt-2 text-sm">{t("configuracion.descripcion")}</p>
          </Link>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-zinc-400 text-sm">{t("alumno.rutinasCompletadas")}</p>
            <p className="text-2xl font-bold mt-1">{rutinasCompletadas}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-zinc-400 text-sm">{t("alumno.ejerciciosCompletados")}</p>
            <p className="text-2xl font-bold mt-1">{ejerciciosCompletados}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-zinc-400 text-sm">{t("alumno.evaluaciones")}</p>
            <p className="text-2xl font-bold mt-1">{evaluacionesCompletadas}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-zinc-400 text-sm">{t("alumno.mejorRM")}</p>
            <p className="text-2xl font-bold mt-1">{mejorRM?.peso ? `${mejorRM.peso} kg` : t("alumno.sinRegistros")}</p>
            {mejorRM?.nombre && <p className="text-xs text-zinc-500 truncate">{mejorRM.nombre}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
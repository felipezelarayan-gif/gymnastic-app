"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Metricas = {
  totalProfesores: number;
  totalAlumnos: number;
  totalAdmins: number;
  totalRutinas: number;
  totalEvaluacionesRM: number;
  totalEvaluacionesFMS: number;
};

export default function SoportePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ nombre: string; email: string; rol: string; es_admin: boolean } | null>(null);
  const [metricas, setMetricas] = useState<Metricas>({
    totalProfesores: 0,
    totalAlumnos: 0,
    totalAdmins: 0,
    totalRutinas: 0,
    totalEvaluacionesRM: 0,
    totalEvaluacionesFMS: 0,
  });
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);

  useEffect(() => {
    cargarDatos();
    cargarMensajes();
  }, []);

  async function cargarMensajes() {
    const { count } = await supabase.from("mensajes_soporte").select("id", { count: "exact", head: true }).eq("leido", false);
    setMensajesNoLeidos(count || 0);
  }

  async function cargarDatos() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/login");
      return;
    }

    const user = sessionData.session.user;

    const { data: perfil } = await supabase
      .from("profiles")
      .select("nombre, email, es_admin, rol")
      .eq("id", user.id)
      .maybeSingle();

    if (!perfil?.es_admin && perfil?.rol !== "admin") {
      // Redirigir al home correspondiente según el perfil
      if (perfil?.rol === "alumno") {
        router.push("/alumno");
      } else {
        router.push("/");
      }
      return;
    }

    setProfile(perfil);

    const [
      { count: profesores },
      { count: alumnos },
      { count: admins },
      { count: rutinas },
      { count: evalRM },
      { count: evalFMS },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("rol", "profe"),
      supabase.from("alumnos").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("rol", "admin"),
      supabase.from("rutinas").select("id", { count: "exact", head: true }),
      supabase.from("evaluaciones_rm").select("id", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("evaluaciones_fms").select("id", { count: "exact", head: true }).is("deleted_at", null),
    ]);

    setMetricas({
      totalProfesores: profesores || 0,
      totalAlumnos: alumnos || 0,
      totalAdmins: admins || 0,
      totalRutinas: rutinas || 0,
      totalEvaluacionesRM: evalRM || 0,
      totalEvaluacionesFMS: evalFMS || 0,
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-5xl mx-auto animate-pulse">
          <div className="h-9 w-56 rounded bg-zinc-800 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-zinc-900 border border-zinc-800" />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">🛠️ Panel de Soporte</h1>
          <p className="text-zinc-400 mt-2">
            Hola, {profile?.nombre || "Admin"} — Administración general del sistema.
          </p>
        </header>

        {/* Métricas globales */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">👨‍🏫 Profesores</p>
            <p className="text-3xl font-bold mt-1">{metricas.totalProfesores}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">👥 Alumnos</p>
            <p className="text-3xl font-bold mt-1">{metricas.totalAlumnos}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">🔐 Administradores</p>
            <p className="text-3xl font-bold mt-1">{metricas.totalAdmins}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">📋 Rutinas</p>
            <p className="text-3xl font-bold mt-1">{metricas.totalRutinas}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 md:col-span-2">
            <p className="text-sm text-zinc-400">📏 Evaluaciones</p>
            <p className="text-3xl font-bold mt-1">{metricas.totalEvaluacionesRM + metricas.totalEvaluacionesFMS}</p>
            <p className="text-xs text-zinc-500 mt-1">RM: {metricas.totalEvaluacionesRM} · FMS: {metricas.totalEvaluacionesFMS}</p>
          </div>
        </section>

        {/* Card de mensajes - siempre visible */}
        <Link href="/soporte/mensajes" className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 hover:bg-zinc-800/70 transition block mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">💬 Mensajes de soporte</h2>
              <p className="text-zinc-400 mt-2">
                {mensajesNoLeidos > 0
                  ? <>Tenés <strong className="text-emerald-400">{mensajesNoLeidos}</strong> mensaje{mensajesNoLeidos !== 1 ? "s" : ""} sin leer.</>
                  : "No hay mensajes nuevos."}
              </p>
            </div>
            {mensajesNoLeidos > 0 && (
              <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-lg">
                {mensajesNoLeidos}
              </span>
            )}
          </div>
        </Link>

        {/* Cards de navegación */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/soporte/profesores"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 hover:bg-zinc-800/70 transition"
          >
            <h2 className="text-xl font-semibold">👨‍🏫 Profesores</h2>
            <p className="text-zinc-400 mt-2">
              Ver todos los profesores, sus métricas y gestionarlos.
            </p>
          </a>

          <a
            href="/soporte/alumnos"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 hover:bg-zinc-800/70 transition"
          >
            <h2 className="text-xl font-semibold">👥 Alumnos</h2>
            <p className="text-zinc-400 mt-2">
              Ver todos los alumnos del sistema y sus profesores asignados.
            </p>
          </a>

          <a
            href="/soporte/administradores"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:border-zinc-700 hover:bg-zinc-800/70 transition"
          >
            <h2 className="text-xl font-semibold">🔐 Administradores</h2>
            <p className="text-zinc-400 mt-2">
              Gestionar usuarios administradores del sistema.
            </p>
          </a>
        </section>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  nombre: string;
  rol: string;
  foto_url?: string | null;
};

const CREAR = [
  {
    href: "/evaluaciones/crear/rm",
    emoji: "🏋️",
    titulo: "Test RM",
    desc: "Crear una nueva evaluación de repetición máxima para un alumno.",
  },
  {
    href: "/evaluaciones/crear/fms",
    emoji: "🧩",
    titulo: "Test FMS",
    desc: "Crear una evaluación de movimiento funcional (Functional Movement Screen).",
  },
  {
    href: "/evaluaciones/crear/otras",
    emoji: "📐",
    titulo: "Otras evaluaciones",
    desc: "Crear evaluaciones personalizadas: tests físicos, morfológicos, posturales, etc.",
  },
];

const REALIZAR = [
  {
    href: "/evaluaciones/realizar/rm",
    emoji: "⚡",
    titulo: "Test RM",
    desc: "Registrar resultados de RM. Actualiza el historial y el RM actual del alumno.",
    badge: "Actualiza rm_actual",
  },
  {
    href: "/evaluaciones/realizar/fms",
    emoji: "🎯",
    titulo: "Test FMS",
    desc: "Completar y registrar los 7 patrones de movimiento del FMS.",
  },
  {
    href: "/evaluaciones/realizar/otras",
    emoji: "📊",
    titulo: "Otras evaluaciones",
    desc: "Registrar resultados de evaluaciones personalizadas.",
  },
];

export default function EvaluacionesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarPerfil() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const user = sessionData.session.user;

      const { data, error } = await supabase
        .from("profiles")
        .select("nombre, rol, foto_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return;
      }

      if (data.rol === "alumno") {
        window.location.href = "/alumno";
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    cargarPerfil();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-8">
        Cargando...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">No estás logueado.</p>
          <a href="/login" className="mt-4 inline-block underline">
            Ir al login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
          <a href="/" className="hover:text-zinc-300 transition">
            Panel del profe
          </a>
          <span>/</span>
          <span className="text-zinc-200">Evaluaciones</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold">📏 Evaluaciones</h1>
          <p className="text-zinc-400 mt-2">
            Creá y realizá evaluaciones físicas para tus alumnos. Los resultados
            de RM actualizan automáticamente el historial y el RM actual.
          </p>
        </header>

        {/* Sección: Crear */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Crear evaluaciones
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CREAR.map((card) => (
              <a
                key={card.href}
                href={card.href}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 hover:border-zinc-700 transition group"
              >
                <h2 className="text-xl font-semibold group-hover:text-white">
                  {card.emoji} {card.titulo}
                </h2>
                <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
                  {card.desc}
                </p>
              </a>
            ))}
          </div>
        </section>

        {/* Sección: Realizar */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Realizar evaluaciones
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REALIZAR.map((card) => (
              <a
                key={card.href}
                href={card.href}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 hover:border-zinc-700 transition group relative"
              >
                <h2 className="text-xl font-semibold group-hover:text-white">
                  {card.emoji} {card.titulo}
                </h2>
                <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
                  {card.desc}
                </p>
                {card.badge && (
                  <span className="mt-4 inline-block text-xs font-medium bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                    ↻ {card.badge}
                  </span>
                )}
              </a>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}

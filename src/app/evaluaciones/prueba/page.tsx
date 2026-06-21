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
    desc: "Programar una evaluación de repetición máxima para un alumno.",
  },
  {
    href: "/evaluaciones/crear/fms",
    emoji: "🧩",
    titulo: "Test FMS",
    desc: "Programar una evaluación de movimiento funcional (Functional Movement Screen).",
  },
];

const REALIZAR = [
  {
    href: "/evaluaciones/realizar/rm",
    emoji: "⚡",
    titulo: "Test RM",
    desc: "Protocolo de aproximación progresiva. Método directo o indirecto al final.",
    badge: "Actualiza rm_actual",
  },
  {
    href: "/evaluaciones/realizar/fms",
    emoji: "🎯",
    titulo: "Test FMS",
    desc: "Puntuar los 7 patrones de movimiento y registrar el resultado.",
  },
];

export default function EvaluacionesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarPerfil() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { setLoading(false); return; }

      const user = sessionData.session.user;
      const { data } = await supabase
        .from("profiles")
        .select("nombre, rol, foto_url")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.rol === "alumno") { window.location.href = "/alumno"; return; }
      if (data) setProfile(data);
      setLoading(false);
    }
    cargarPerfil();
  }, []);

  if (loading)
    return <main className="min-h-screen bg-zinc-950 text-white p-8">Cargando...</main>;

  if (!profile)
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">No estás logueado.</p>
          <a href="/login" className="mt-4 inline-block underline">Ir al login</a>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">

        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
          <a href="/" className="hover:text-zinc-300 transition">Panel del profe</a>
          <span>/</span>
          <span className="text-zinc-200">Evaluaciones</span>
        </nav>

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
                <h2 className="text-xl font-semibold">{card.emoji} {card.titulo}</h2>
                <p className="text-zinc-400 mt-2 text-sm leading-relaxed">{card.desc}</p>
              </a>
            ))}

            {/* Otras — aviso, no link */}
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold text-zinc-500">📐 Otras evaluaciones</h2>
                <span className="text-[10px] font-semibold uppercase tracking-widest bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                  Próximamente
                </span>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Tests físicos, morfológicos, posturales y evaluaciones personalizadas.
              </p>
            </div>
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
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 hover:border-zinc-700 transition group"
              >
                <h2 className="text-xl font-semibold">{card.emoji} {card.titulo}</h2>
                <p className="text-zinc-400 mt-2 text-sm leading-relaxed">{card.desc}</p>
                {card.badge && (
                  <span className="mt-4 inline-block text-xs font-medium bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                    ↻ {card.badge}
                  </span>
                )}
              </a>
            ))}

            {/* Otras — aviso, no link */}
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold text-zinc-500">📐 Otras evaluaciones</h2>
                <span className="text-[10px] font-semibold uppercase tracking-widest bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                  Próximamente
                </span>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Tests físicos, morfológicos, posturales y evaluaciones personalizadas.
              </p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pausado, setPausado] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificarPausado();
  }, []);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session) {
            window.location.replace("/login");
          }
        });
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function verificarPausado() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      setLoading(false);
      return;
    }

    const user = sessionData.session.user;

    // Obtener perfil
    const { data: perfil } = await supabase
      .from("profiles")
      .select("rol, activo")
      .eq("id", user.id)
      .maybeSingle();

    // Si es alumno, el layout de alumno ya maneja el pausado
    if (perfil?.rol === "alumno") {
      setLoading(false);
      return;
    }

    // Si es admin/profe y está pausado
    if (perfil?.activo === false) {
      setPausado(true);
    }

    setLoading(false);
  }

  // No mostrar nada mientras carga
  if (loading) return null;

  // Pantalla de suspendido para admins/profes
  if (pausado) {
    // Permitir acceso a configuración
    if (pathname.startsWith("/configuracion")) {
      return <>{children}</>;
    }

    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-3xl font-bold mb-3">Acceso suspendido</h1>
          <p className="text-zinc-400 leading-relaxed mb-8">
            Tu cuenta ha sido pausada por el equipo de soporte.
            <br />
            Comunicate con <strong>entrenamiento-app@hotmail.com</strong> para más detalles.
          </p>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="rounded-xl border border-red-800 px-6 py-3 text-red-400 hover:bg-red-950 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
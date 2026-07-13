"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

export default function BienvenidaPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // createBrowserClient de @supabase/ssr consume automáticamente
    // el PKCE code de la URL al inicializarse.
    // Escuchamos SIGNED_IN o verificamos si ya hay sesión.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        verificarInvitacion(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        verificarInvitacion(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function verificarInvitacion(userId: string) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("invitacion_pendiente")
      .eq("id", userId)
      .single();

    if (profile?.invitacion_pendiente === false) {
      router.push("/login");
      return;
    }

    setLoading(false);
  }

  async function crearPassword() {
    if (guardando) return;

    if (password.length < 8) {
      mostrarToast("La contraseña debe tener al menos 8 caracteres.", "error");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      mostrarToast(error.message, "error");
      setGuardando(false);
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      mostrarToast(userError?.message || "No se pudo obtener el usuario actual.", "error");
      setGuardando(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ invitacion_pendiente: false })
      .eq("id", userData.user.id);

    if (profileError) {
      mostrarToast(profileError.message, "error");
      setGuardando(false);
      return;
    }

    router.push("/alumno/perfil");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-3xl font-bold mb-3">
          ¡Bienvenido!
        </h1>

        <p className="text-zinc-400 mb-6">
          Antes de comenzar, creá tu contraseña para acceder a la aplicación.
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 mb-4"
        />

        <button
          onClick={crearPassword}
          disabled={loading || guardando}
          className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? "Verificando invitación..." : guardando ? "Guardando..." : "Crear contraseña"}
        </button>
      </div>
    </main>
  );
}

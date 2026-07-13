"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    async function verificarSesion() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setLoading(false);
      } else {
        mostrarToast("Sesión inválida o expirada. Solicitá un nuevo link de recuperación.", "error");
        setLoading(false);
      }
    }

    // Esperar a que el endpoint /auth/confirm establezca la sesión en las cookies
    // y createBrowserClient las lea
    const timer = setTimeout(verificarSesion, 500);

    return () => clearTimeout(timer);
  }, [mostrarToast]);

  async function cambiarPassword() {
    if (cambiando) return;

    if (password.length < 8) {
      mostrarToast("La contraseña debe tener al menos 8 caracteres.", "error");
      return;
    }

    if (password !== confirmPassword) {
      mostrarToast("Las contraseñas no coinciden.", "error");
      return;
    }

    setCambiando(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      mostrarToast(error.message, "error");
      setCambiando(false);
      return;
    }

    mostrarToast("Contraseña actualizada correctamente.", "exito");
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <p className="text-zinc-400">Validando sesión...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-2xl font-bold mb-2">Nueva contraseña</h1>

        <p className="text-sm text-zinc-400 mb-6">
          Escribí tu nueva contraseña.
        </p>

        <input
          className="w-full mb-3 rounded bg-zinc-800 p-3 outline-none"
          placeholder="Nueva contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          className="w-full mb-4 rounded bg-zinc-800 p-3 outline-none"
          placeholder="Confirmar contraseña"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          onClick={cambiarPassword}
          disabled={cambiando}
          className="w-full rounded bg-white text-black p-3 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cambiando ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </div>
    </main>
  );
}

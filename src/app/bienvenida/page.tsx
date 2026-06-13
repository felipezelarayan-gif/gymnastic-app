"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BienvenidaPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    verificarInvitacion();
  }, []);

  async function verificarInvitacion() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("invitacion_pendiente")
      .eq("id", userData.user.id)
      .single();

    if (profile?.invitacion_pendiente === false) {
      window.location.href = "/login";
    }
  }

  async function crearPassword() {
    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      alert(userError?.message || "No se pudo obtener el usuario actual.");
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ invitacion_pendiente: false })
      .eq("id", userData.user.id);

    if (profileError) {
      alert(profileError.message);
      return;
    }

    window.location.href = "/alumno/perfil";
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
          disabled={loading}
          className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Crear contraseña"}
        </button>
      </div>
    </main>
  );
}

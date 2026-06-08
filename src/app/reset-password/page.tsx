"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function cambiarPassword() {
    if (password.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Contraseña actualizada correctamente.");
    window.location.href = "/login";
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
          className="w-full rounded bg-white text-black p-3 font-semibold"
        >
          Cambiar contraseña
        </button>
      </div>
    </main>
  );
}
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/";
  }

  async function recuperarPassword() {
    if (!email) {
      alert("Primero escribí tu correo electrónico.");
      return;
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://gymnastic-app-u64l.vercel.app";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Te enviamos un correo para recuperar tu contraseña.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-2xl font-bold mb-2">Ingresar</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Accedé a tus rutinas.
        </p>

        <input
          className="w-full mb-3 rounded bg-zinc-800 p-3 outline-none"
          placeholder="Correo electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full mb-3 rounded bg-zinc-800 p-3 outline-none"
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full rounded bg-white text-black p-3 font-semibold mb-4"
        >
          Ingresar
        </button>

        <button
          onClick={recuperarPassword}
          className="w-full text-sm text-zinc-400 underline"
        >
          Olvidé mi contraseña
        </button>
      </div>
    </main>
  );
}
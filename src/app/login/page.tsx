"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

export default function LoginPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  async function login() {
    if (cargando) return;
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      mostrarToast(error.message, "error");
      setCargando(false);
      return;
    }

    router.push("/");
  }

  async function recuperarPassword() {
    if (!email) {
      mostrarToast("Primero escribí tu correo electrónico.", "error");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      mostrarToast(error.message, "error");
      return;
    }

    mostrarToast("Te enviamos un correo para recuperar tu contraseña. Revisá tu bandeja de entrada.", "exito");
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
          disabled={cargando}
          className="w-full rounded bg-white text-black p-3 font-semibold mb-4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cargando ? "Ingresando..." : "Ingresar"}
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
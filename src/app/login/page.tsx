"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";

export default function LoginPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const { t } = useIdioma();
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
      mostrarToast(t("login.emailRequerido"), "error");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      mostrarToast(error.message, "error");
      return;
    }

    mostrarToast(t("login.emailEnviado"), "exito");
  }

  return (
    <main className="min-h-screen bg-[#0E0E0E] text-[#F0F0F0] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <a
          href="/info"
          className="flex items-center justify-center gap-2.5 no-underline mb-8"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g transform="skewX(-12)">
              <rect
                x="4"
                y="3"
                width="4.5"
                height="18"
                rx="1"
                fill="#08A66C"
              />
              <rect
                x="8.5"
                y="3"
                width="11.5"
                height="3.5"
                rx="1"
                fill="#08A66C"
              />
              <rect
                x="8.5"
                y="9.5"
                width="8.5"
                height="3.5"
                rx="1"
                fill="#08A66C"
              />
            </g>
          </svg>
          <span className="text-xl tracking-tight">
            <span className="font-extrabold">FORZA</span>{" "}
            <span className="font-light text-[#7a7a7a]">ZONE</span>
          </span>
        </a>

        {/* Card */}
        <div className="rounded-xl border border-white/[0.07] bg-[#161616] p-6">
          <h1 className="text-lg font-bold mb-1">{t("login.titulo")}</h1>
          <p className="text-sm text-[#7a7a7a] mb-6 font-light">
            {t("login.subtitulo")}
          </p>

          <input
            className="w-full mb-3 rounded-xl bg-[#1E1E1E] border border-white/[0.07] p-3 text-sm outline-none text-[#F0F0F0] placeholder:text-[#4a4a4a] focus:border-[#08A66C]/50 focus:shadow-[0_0_0_3px_rgba(8,166,108,0.1)] transition-all"
            placeholder={t("login.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full mb-3 rounded-xl bg-[#1E1E1E] border border-white/[0.07] p-3 text-sm outline-none text-[#F0F0F0] placeholder:text-[#4a4a4a] focus:border-[#08A66C]/50 focus:shadow-[0_0_0_3px_rgba(8,166,108,0.1)] transition-all"
            placeholder={t("login.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={login}
            disabled={cargando}
            className="w-full rounded-xl bg-[#08A66C] text-[#0E0E0E] p-3 text-sm font-bold tracking-wide mb-4 hover:brightness-110 hover:scale-[1.01] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {cargando ? t("login.ingresando") : t("login.ingresar")}
          </button>

          <button
            onClick={recuperarPassword}
            className="w-full text-sm text-[#7a7a7a] hover:text-[#08A66C] transition-colors font-light"
          >
            {t("login.olvidePassword")}
          </button>
        </div>

        {/* Link a landing */}
        <p className="text-center mt-6 text-xs text-[#4a4a4a] font-light">
          <a href="/info" className="text-[#7a7a7a] hover:text-[#08A66C] transition-colors no-underline">
            Forza Zone
          </a>{" "}
          — Plataforma para entrenadores y atletas
        </p>
      </div>
    </main>
  );
}
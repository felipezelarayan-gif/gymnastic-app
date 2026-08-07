"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mostrarToast } = useToast();
  const { t } = useIdioma();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  // Detectar si venimos de un link de invitación expirado
  const errorParam = searchParams.get("error");
  const nextParam = searchParams.get("next");
  const typeParam = searchParams.get("type");
  const esInvitacionExpirada =
    (typeParam === "invite" || nextParam === "/bienvenida") && !!errorParam;

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

    router.push("/home");
  }

  function iniciarCooldown() {
    setResetCooldown(60);
    const interval = setInterval(() => {
      setResetCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function recuperarPassword() {
    if (resetCooldown > 0) return;

    if (!email) {
      mostrarToast(t("login.emailRequerido"), "error");
      return;
    }

    iniciarCooldown();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      mostrarToast(error.message, "error");
      setResetCooldown(0);
      return;
    }

    mostrarToast(t("login.emailEnviado"), "exito");
  }

  // Pantalla de invitación expirada (muy clara, imposible de no ver)
  if (esInvitacionExpirada) {
    return (
      <main className="min-h-screen bg-[#0E0E0E] text-[#F0F0F0] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-900/60 bg-[#161616] p-8 text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-3xl font-bold text-red-400 mb-3">
            {t("bienvenida.invitacionExpiradaTitulo")}
          </h1>
          <p className="text-[#F0F0F0] mb-2">
            {t("bienvenida.invitacionExpiradaDesc")}
          </p>
          <p className="text-[#7a7a7a] mb-6">
            {t("bienvenida.invitacionExpiradaAccion")}
          </p>
          <button
            type="button"
            onClick={() => { window.location.href = "/login"; }}
            className="w-full rounded-xl bg-[#08A66C] py-3 font-semibold text-[#0E0E0E] hover:brightness-110 transition"
          >
            {t("bienvenida.irAlLogin")}
          </button>
          <p className="text-xs text-[#4a4a4a] mt-4">
            {t("bienvenida.ayudaContactar")}{" "}
            <a
              href="/#contacto"
              className="text-[#08A66C] hover:underline font-semibold"
            >
              {t("bienvenida.contactanos")}
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0E0E0E] text-[#F0F0F0] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <a
          href="/"
          className="flex items-center justify-center gap-2.5 no-underline mb-8"
        >
          <img src="/logo.jpg" alt="Forza Zone" className="w-8 h-8 rounded-lg" />
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
            disabled={resetCooldown > 0}
            className={`w-full text-sm transition-colors font-light ${
              resetCooldown > 0
                ? "text-[#4a4a4a] cursor-not-allowed"
                : "text-[#7a7a7a] hover:text-[#08A66C]"
            }`}
          >
            {resetCooldown > 0
              ? `Reenviar en ${resetCooldown}s`
              : t("login.olvidePassword")}
          </button>
        </div>

        {/* Link a landing */}
        <p className="text-center mt-6 text-xs text-[#4a4a4a] font-light">
          <a href="/" className="text-[#7a7a7a] hover:text-[#08A66C] transition-colors no-underline">
            Forza Zone
          </a>{" "}
          — Plataforma para entrenadores y atletas
        </p>
      </div>
    </main>
  );
}
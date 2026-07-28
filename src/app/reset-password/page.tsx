"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const { t } = useIdioma();
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
        mostrarToast(t("resetPassword.sesionInvalida"), "error");
        setLoading(false);
      }
    }

    const timer = setTimeout(verificarSesion, 500);

    return () => clearTimeout(timer);
  }, [mostrarToast, t]);

  async function cambiarPassword() {
    if (cambiando) return;

    if (password.length < 8) {
      mostrarToast(t("resetPassword.minLength"), "error");
      return;
    }

    if (password !== confirmPassword) {
      mostrarToast(t("resetPassword.noCoinciden"), "error");
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

    mostrarToast(t("resetPassword.exito"), "exito");
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <p className="text-zinc-400">{t("resetPassword.validando")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h1 className="text-2xl font-bold mb-2">{t("resetPassword.titulo")}</h1>

        <p className="text-sm text-zinc-400 mb-6">
          {t("resetPassword.subtitulo")}
        </p>

        <input
          className="w-full mb-3 rounded bg-zinc-800 p-3 outline-none"
          placeholder={t("resetPassword.nuevaPassword")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          className="w-full mb-4 rounded bg-zinc-800 p-3 outline-none"
          placeholder={t("resetPassword.confirmarPassword")}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          onClick={cambiarPassword}
          disabled={cambiando}
          className="w-full rounded bg-white text-black p-3 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cambiando ? t("resetPassword.guardando") : t("resetPassword.cambiar")}
        </button>
      </div>
    </main>
  );
}
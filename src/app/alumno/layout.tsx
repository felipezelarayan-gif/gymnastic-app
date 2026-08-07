"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useIdioma } from "@/lib/i18n-context";
import { getAlumnoCached } from "@/lib/alumno/alumno-cache";

export default function AlumnoLayout({ children }: { children: React.ReactNode }) {
  const { t } = useIdioma();
  const pathname = usePathname();
  const router = useRouter();
  const [pausado, setPausado] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificarPausado();
  }, []);

  async function verificarPausado() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoading(false);
      return;
    }

    const alumno = await getAlumnoCached(sessionData.session.user.id);

    setPausado(alumno?.activo === false);
    setLoading(false);
  }

  // Si está cargando, mostrar skeleton
  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-zinc-800 shrink-0" />
            <div className="space-y-3">
              <div className="h-8 w-64 rounded bg-zinc-800" />
              <div className="h-4 w-48 rounded bg-zinc-800" />
            </div>
          </div>
          <div className="h-32 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 mb-5" />
          <div className="grid gap-4">
            <div className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800" />
          </div>
        </div>
      </main>
    );
  }

  // Si está pausado y NO está en configuración, mostrar pantalla de suspendido
  if (pausado && !pathname.startsWith("/alumno/configuracion")) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-3xl font-bold mb-3">{t("sessionGuard.accesoSuspendido")}</h1>
          <p className="text-zinc-400 leading-relaxed mb-8">
            {t("sessionGuard.cuentaPausada")}
            <br />
            <span dangerouslySetInnerHTML={{ __html: t("sessionGuard.contactar") }} />
          </p>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="rounded-xl border border-red-800 px-6 py-3 text-red-400 hover:bg-red-950 transition"
          >
            {t("sessionGuard.cerrarSesion")}
          </button>
        </div>
      </main>
    );
  }

  // Mostrar contenido normal
  return <>{children}</>;
}
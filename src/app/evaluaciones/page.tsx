"use client";

import BackButton from "@/components/BackButton";
import SkeletonEvaluaciones from "@/components/SkeletonEvaluaciones";
import { useProfileCheck } from "@/lib/useProfileCheck";
import { useIdioma } from "@/lib/i18n-context";

type EvaluacionCard = {
  href: string;
  emoji: string;
  titulo: string;
  desc: string;
  disabled?: boolean;
  badge?: string;
};


export default function EvaluacionesPage() {
  const { profile, loading } = useProfileCheck();
  const { t } = useIdioma();

  if (loading)
    return <SkeletonEvaluaciones />;

  if (!profile)
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">{t("home.noLogueado")}</p>
          <a href="/login" className="mt-4 inline-block underline">{t("home.irAlLogin")}</a>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <BackButton />
        </div>

        <header className="mb-10">
          <h1 className="text-3xl font-bold">{t("evaluaciones.titulo")}</h1>
          <p className="text-zinc-400 mt-2">
            {t("evaluaciones.descripcion")}
          </p>
        </header>

        {/* Sección: Crear */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {t("evaluaciones.crearSection")}
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/evaluaciones/crear/rm"
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 hover:border-zinc-700 transition group"
            >
              <h2 className="text-xl font-semibold">🏋️ {t("evaluaciones.testRM")}</h2>
              <p className="text-zinc-400 mt-2 text-sm leading-relaxed">{t("evaluaciones.testRMDesc")}</p>
            </a>
            <a
              href="/evaluaciones/crear/fms"
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 hover:border-zinc-700 transition group"
            >
              <h2 className="text-xl font-semibold">🧩 {t("evaluaciones.testFMS")}</h2>
              <p className="text-zinc-400 mt-2 text-sm leading-relaxed">{t("evaluaciones.testFMSDesc")}</p>
            </a>
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold text-zinc-500">📐 {t("evaluaciones.otras")}</h2>
                <span className="text-[10px] font-semibold uppercase tracking-widest bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                  {t("evaluaciones.proximamente")}
                </span>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed">
                {t("evaluaciones.otrasDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Sección: Realizar */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {t("evaluaciones.realizarSection")}
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/evaluaciones/realizar?tipo=rm"
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 hover:border-zinc-700 transition group"
            >
              <h2 className="text-xl font-semibold">⚡ {t("evaluaciones.testRM")}</h2>
              <p className="text-zinc-400 mt-2 text-sm leading-relaxed">{t("evaluaciones.testRMRealizarDesc")}</p>
              <span className="mt-4 inline-block text-xs font-medium bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                ↻ {t("evaluaciones.actualizaRM")}
              </span>
            </a>
            <a
              href="/evaluaciones/realizar?tipo=fms"
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 hover:border-zinc-700 transition group"
            >
              <h2 className="text-xl font-semibold">🎯 {t("evaluaciones.testFMS")}</h2>
              <p className="text-zinc-400 mt-2 text-sm leading-relaxed">{t("evaluaciones.testFMSRealizarDesc")}</p>
            </a>
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold text-zinc-500">📐 {t("evaluaciones.otras")}</h2>
                <span className="text-[10px] font-semibold uppercase tracking-widest bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                  {t("evaluaciones.proximamente")}
                </span>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed">
                {t("evaluaciones.otrasDesc")}
              </p>
            </div>
          </div>
        </section>

        {/* Sección: Evaluaciones por alumno */}
        {/* Sección: Gestionar */}
        <section className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {t("evaluaciones.gestionarSection")}
            </span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/evaluaciones/alumnos"
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 hover:border-zinc-700 transition group"
            >
              <h2 className="text-xl font-semibold">📋 {t("evaluaciones.porAlumno")}</h2>
              <p className="text-zinc-400 mt-2 text-sm leading-relaxed">{t("evaluaciones.porAlumnoDesc")}</p>
            </a>
          </div>
        </section>

      </div>
    </main>
  );
}

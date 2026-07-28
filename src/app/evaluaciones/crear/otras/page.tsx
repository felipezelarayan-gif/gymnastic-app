"use client";

import BackButton from "@/components/BackButton";
import { useIdioma } from "@/lib/i18n-context";

export default function OtrasEvaluacionesProximamente() {
  const { t } = useIdioma();
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">

        <div className="text-6xl mb-6">🚧</div>

        <h1 className="text-3xl font-bold mb-3">{t("evaluaciones.proximamente")}</h1>

        <p className="text-zinc-400 leading-relaxed mb-8">
          {t("evaluaciones.otrasProximamente")}
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">{t("evaluaciones.loQueViene")}</p>
          <ul className="space-y-2 text-sm text-zinc-400">
            {[
              t("evaluaciones.itemResistencia"),
              t("evaluaciones.itemMorfologicas"),
              t("evaluaciones.itemFlexibilidad"),
              t("evaluaciones.itemPosturales"),
              t("evaluaciones.itemProtocolos"),
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-zinc-700 mt-0.5">○</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <BackButton fallback="/evaluaciones" />
      </div>
    </main>
  );
}

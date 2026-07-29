"use client";

import { useIdioma } from "@/lib/i18n-context";

export const APP_VERSION = "4.0.2";
export const LAST_UPDATE = "29/07/2026";

export default function InformacionCard() {
  const { t } = useIdioma();

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
      <h2 className="text-xl font-semibold mb-3">ℹ️ {t("informacion.titulo")}</h2>
      <p className="text-zinc-400 text-sm">
        {t("informacion.version")}: <span className="text-zinc-300">{APP_VERSION}</span>
      </p>
      <p className="text-zinc-400 text-sm mt-1">
        {t("informacion.ultimaActualizacion")}: <span className="text-zinc-300">{LAST_UPDATE}</span>
      </p>
    </section>
  );
}
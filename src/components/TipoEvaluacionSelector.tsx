"use client";

import { useIdioma } from "@/lib/i18n-context";

type Props = {
  value: "individual" | "grupal" | null;
  onChange: (tipo: "individual" | "grupal") => void;
};

export default function TipoEvaluacionSelector({ value, onChange }: Props) {
  const { t } = useIdioma();

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-400 mb-2">
        {t("evaluaciones.tipoEvaluacion")}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange("individual")}
          className={`text-left px-4 py-4 rounded-xl border transition ${
            value === "individual"
              ? "bg-white text-zinc-950 border-white"
              : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
          }`}
        >
          <span className="block text-lg font-bold">{t("evaluaciones.individual")}</span>
          <span className="block text-sm opacity-70 mt-1">
            {t("evaluaciones.individualDesc")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange("grupal")}
          className={`text-left px-4 py-4 rounded-xl border transition ${
            value === "grupal"
              ? "bg-white text-zinc-950 border-white"
              : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
          }`}
        >
          <span className="block text-lg font-bold">{t("evaluaciones.grupal")}</span>
          <span className="block text-sm opacity-70 mt-1">
            {t("evaluaciones.grupalDesc")}
          </span>
        </button>
      </div>
    </div>
  );
}

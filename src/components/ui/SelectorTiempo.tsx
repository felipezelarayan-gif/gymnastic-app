"use client";

import { useEffect, useState } from "react";
import { useIdioma } from "@/lib/i18n-context";

type SelectorTiempoProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  maxMinutos?: number;
  compacto?: boolean;
  ultraCompacto?: boolean;
};

function parseTiempo(value: string) {
  if (!value) return { minutos: 0, segundos: 0 };
  const match = value.match(/^(?:(\d+)'\s*)?(?:(\d+)'')?$/);
  if (!match) return { minutos: 0, segundos: 0 };
  return { minutos: Number(match[1] ?? 0), segundos: Number(match[2] ?? 0) };
}

function formatearTiempo(minutos: number, segundos: number) {
  if (minutos === 0) return `${segundos}''`;
  if (segundos === 0) return `${minutos}'`;
  return `${minutos}'${String(segundos).padStart(2, "0")}''`;
}

export default function SelectorTiempo({
  value,
  onChange,
  label = "Duración",
  maxMinutos = 10,
  compacto = false,
  ultraCompacto = false,
}: SelectorTiempoProps) {
  const { t } = useIdioma();
  const inicial = parseTiempo(value);
  const [minutos, setMinutos] = useState(inicial.minutos);
  const [segundos, setSegundos] = useState(inicial.segundos);

  useEffect(() => {
    const tiempo = parseTiempo(value);
    setMinutos(tiempo.minutos);
    setSegundos(tiempo.segundos);
  }, [value]);

  useEffect(() => {
    onChange(formatearTiempo(minutos, segundos));
  }, [minutos, segundos, onChange]);

  if (ultraCompacto) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[0.825rem] font-medium text-zinc-300 whitespace-nowrap">
          {label}
        </span>
        <select
          value={minutos}
          onChange={(e) => setMinutos(Number(e.target.value))}
          className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-2 text-[0.825rem]"
          aria-label={t("selectorTiempo.min")}
        >
          {Array.from({ length: maxMinutos + 1 }, (_, i) => (
            <option key={i} value={i}>
              {i}{"'"}
            </option>
          ))}
        </select>
        <select
          value={segundos}
          onChange={(e) => setSegundos(Number(e.target.value))}
          className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-2 text-[0.825rem]"
          aria-label={t("selectorTiempo.seg")}
        >
          {Array.from({ length: 60 }, (_, i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, "0")}{"''"}
            </option>
          ))}
        </select>
        <span className="text-[0.625rem] text-zinc-500 whitespace-nowrap">
          = {formatearTiempo(minutos, segundos)}
        </span>
      </div>
    );
  }

  return (
    <div className={compacto ? "space-y-2" : "space-y-3"}>
      <label className="block text-[0.825rem] font-medium text-zinc-300">
        {label}
      </label>

      <div className={compacto ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-3"}>
        <div>
          <label className="mb-1 block text-[0.625rem] text-zinc-500">{t("selectorTiempo.min")}</label>
          <select value={minutos} onChange={(e) => setMinutos(Number(e.target.value))}
            className={compacto ? "h-10 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-[0.825rem]" : "h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-[0.825rem]"}>
            {Array.from({ length: maxMinutos + 1 }, (_, i) => (<option key={i} value={i}>{i}</option>))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[0.625rem] text-zinc-500">{t("selectorTiempo.seg")}</label>
          <select value={segundos} onChange={(e) => setSegundos(Number(e.target.value))}
            className={compacto ? "h-10 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-[0.825rem]" : "h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-[0.825rem]"}>
            {Array.from({ length: 60 }, (_, i) => (<option key={i} value={i}>{String(i).padStart(2, "0")}</option>))}
          </select>
        </div>
      </div>

      <p className="text-[0.625rem] text-zinc-500">
        {compacto ? t("selectorTiempo.total") : t("selectorTiempo.duracionTotal")}: <span className="font-semibold">{formatearTiempo(minutos, segundos)}</span>
      </p>
    </div>
  );
}

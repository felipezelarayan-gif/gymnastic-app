"use client";

import { useEffect, useRef, useState } from "react";
import { useIdioma } from "@/lib/i18n-context";

type Props = {
  onVer: () => void;
  onEditar: () => void;
  onQuitar: () => void;
  quitando: boolean;
};

export default function MenuAccionesRutinaAsignada({
  onVer,
  onEditar,
  onQuitar,
  quitando,
}: Props) {
  const { t } = useIdioma();
  const [abierto, setAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [abierto]);

  const acciones = [
    {
      id: "ver",
      icono: "👁️",
      label: t("alumnos.ver"),
      onClick: () => {
        setAbierto(false);
        onVer();
      },
    },
    {
      id: "editar",
      icono: "✏️",
      label: t("rutinas.editar"),
      onClick: () => {
        setAbierto(false);
        onEditar();
      },
    },
    {
      id: "quitar",
      icono: "🗑️",
      label: t("alumnos.quitar"),
      onClick: () => {
        setAbierto(false);
        onQuitar();
      },
      peligro: true,
    },
  ];

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`rounded-lg border px-3 py-2 text-sm text-zinc-300 transition ${
          abierto
            ? "border-emerald-600 bg-zinc-700 text-white"
            : "border-zinc-700 hover:bg-zinc-700"
        }`}
        title={t("alumnos.acciones")}
        aria-label={t("alumnos.acciones")}
        aria-expanded={abierto}
      >
        ⋮
      </button>

      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          {acciones.map((accion) => (
            <button
              key={accion.id}
              type="button"
              onClick={accion.onClick}
              disabled={accion.id === "quitar" && quitando}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition disabled:opacity-50 ${
                accion.peligro
                  ? "text-red-400 hover:bg-red-950/30"
                  : "text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <span className="text-base w-5 text-center">{accion.icono}</span>
              {accion.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
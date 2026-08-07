"use client";

import { useEffect, useRef, useState } from "react";
import { useIdioma } from "@/lib/i18n-context";

type Rutina = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  objetivo?: string | null;
  estructura?: string | null;
  created_at?: string | null;
  creada_para_alumno_id?: string | null;
  creada_desde_perfil_alumno?: boolean | null;
  es_duplicado_limpio?: boolean | null;
  profesor_id?: string | null;
};

type MenuAccionesRutinaProps = {
  rutina: Rutina;
  onVerAsignar: () => void;
  onBorrar: () => void;
  borrando?: boolean;
};

export default function MenuAccionesRutina({
  rutina,
  onVerAsignar,
  onBorrar,
  borrando,
}: MenuAccionesRutinaProps) {
  const { t } = useIdioma();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    if (!menuAbierto) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuAbierto]);

  // Cerrar menú con tecla Escape
  useEffect(() => {
    if (!menuAbierto) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuAbierto(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuAbierto]);

  const acciones = [
    {
      id: "verAsignar",
      icono: "👁️",
      label: t("rutinas.verAsignar"),
      onClick: () => {
        setMenuAbierto(false);
        onVerAsignar();
      },
    },
    {
      id: "editar",
      icono: "✏️",
      label: t("rutinas.editar"),
      href: `/rutinas/${rutina.id}`,
    },
    {
      id: "borrar",
      icono: "🗑️",
      label: t("rutinas.borrar"),
      onClick: () => {
        setMenuAbierto(false);
        setConfirmarBorrar(true);
      },
    },
  ];

  return (
    <div className="relative shrink-0" ref={menuRef}>
      {/* Botón ⋮ */}
      <button
        type="button"
        onClick={() => setMenuAbierto((v) => !v)}
        className={`rounded-lg border px-3 py-2 text-sm text-zinc-300 transition ${
          menuAbierto
            ? "border-emerald-600 bg-zinc-700 text-white"
            : "border-zinc-700 hover:bg-zinc-700"
        }`}
        title={t("rutinas.acciones")}
        aria-label={t("rutinas.acciones")}
        aria-expanded={menuAbierto}
      >
        ⋮
      </button>

      {/* Dropdown */}
      {menuAbierto && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          <div className="py-1">
            {acciones.map((accion) => {
              if (accion.href) {
                return (
                  <a
                    key={accion.id}
                    href={accion.href}
                    onClick={() => setMenuAbierto(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition"
                  >
                    <span className="text-base w-5 text-center">{accion.icono}</span>
                    {accion.label}
                  </a>
                );
              }
              return (
                <button
                  key={accion.id}
                  type="button"
                  onClick={accion.onClick}
                  disabled={borrando}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition disabled:opacity-50 ${
                    accion.id === "borrar"
                      ? "text-red-400 hover:bg-red-950/30"
                      : "text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  <span className="text-base w-5 text-center">{accion.icono}</span>
                  {accion.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Confirmar borrar */}
      {confirmarBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-red-400 mb-3">{t("rutinas.borrarTitulo")}</h3>
            <p
              className="text-zinc-300 text-sm leading-relaxed mb-2"
              dangerouslySetInnerHTML={{
                __html: t("rutinas.borrarConfirmacion", { nombre: rutina.nombre }),
              }}
            />
            <p className="text-zinc-400 text-sm mb-5">{t("rutinas.borrarNoDeshacer")}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmarBorrar(false)}
                disabled={borrando}
                className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50"
              >
                {t("rutinas.cancelar")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmarBorrar(false);
                  onBorrar();
                }}
                disabled={borrando}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {borrando ? t("rutinas.borrando") : t("rutinas.siBorrar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
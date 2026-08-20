"use client";

import { useEffect, useRef, useState } from "react";
import { useIdioma } from "@/lib/i18n-context";

type Evaluacion = {
  id: string;
  nombre: string;
  tipo: string;
  estado: string | null;
  profesor_id: string | null;
};

type MenuEvaluacionAlumnoProps = {
  evaluacion: Evaluacion;
  completada: boolean;
  onVer: () => void;
  onEditarFecha: () => void;
  onCompletar: () => void;
  onEliminar: () => void;
};

export default function MenuEvaluacionAlumno({
  evaluacion,
  completada,
  onVer,
  onEditarFecha,
  onCompletar,
  onEliminar,
}: MenuEvaluacionAlumnoProps) {
  const { t } = useIdioma();
  const [menuAbierto, setMenuAbierto] = useState(false);
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
    ...(completada
      ? [
          {
            id: "ver",
            icono: "👁️",
            label: t("evaluaciones.verEvaluacion"),
            onClick: () => {
              setMenuAbierto(false);
              onVer();
            },
            color: "text-zinc-200 hover:bg-zinc-800",
          },
        ]
      : [
          {
            id: "editar",
            icono: "✏️",
            label: t("evaluaciones.editarFecha"),
            onClick: () => {
              setMenuAbierto(false);
              onEditarFecha();
            },
            color: "text-zinc-200 hover:bg-zinc-800",
          },
          {
            id: "completar",
            icono: "✅",
            label: t("evaluaciones.completar"),
            onClick: () => {
              setMenuAbierto(false);
              onCompletar();
            },
            color: "text-emerald-400 hover:bg-emerald-950/30",
          },
        ]),
    {
      id: "eliminar",
      icono: "🗑️",
      label: t("evaluaciones.eliminarEvaluacion"),
      onClick: () => {
        setMenuAbierto(false);
        onEliminar();
      },
      color: "text-red-400 hover:bg-red-950/30",
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
        title={t("alumnos.acciones")}
        aria-label={t("alumnos.acciones")}
        aria-expanded={menuAbierto}
      >
        ⋮
      </button>

      {/* Dropdown */}
      {menuAbierto && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          <div className="py-1">
            {acciones.map((accion, index) => (
              <div key={accion.id}>
                {index > 0 && accion.id === "eliminar" && (
                  <div className="border-t border-zinc-800" />
                )}
                <button
                  type="button"
                  onClick={accion.onClick}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition ${accion.color}`}
                >
                  <span className="text-base w-5 text-center">{accion.icono}</span>
                  {accion.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { useAccionesAlumno } from "@/lib/alumno/useAccionesAlumno";
import { useIdioma } from "@/lib/i18n-context";

type Alumno = {
  id: string;
  nombre: string;
  apellido?: string | null;
  activo?: boolean | null;
};

type MenuAccionesAlumnoProps = {
  alumno: Alumno;
  onCambio?: () => void;
};

export default function MenuAccionesAlumno({ alumno, onCambio }: MenuAccionesAlumnoProps) {
  const { t } = useIdioma();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    mostrarTransferir,
    setMostrarTransferir,
    mostrarConfirmarBorrar,
    setMostrarConfirmarBorrar,
    profesoresDisponibles,
    profeSeleccionado,
    setProfeSeleccionado,
    procesando,
    errorAccion,
    setErrorAccion,
    abrirModalAcciones,
    transferirAlumno,
    pausarAlumno,
    borrarAlumno,
  } = useAccionesAlumno(alumno.id, alumno, onCambio);

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

  function nombreCompleto() {
    return `${alumno.nombre || ""} ${alumno.apellido || ""}`.trim();
  }

  async function handlePausar() {
    const ok = await pausarAlumno();
    if (ok) {
      setMenuAbierto(false);
    }
  }

  async function handleTransferir() {
    const ok = await transferirAlumno();
    if (ok) {
      setMenuAbierto(false);
    }
  }

  const accionesNavegacion = [
    {
      id: "perfil",
      icono: "👤",
      label: t("alumnos.perfil"),
      href: `/alumnos/${alumno.id}`,
    },
    {
      id: "rutina",
      icono: "🏋️",
      label: t("alumnos.rutina"),
      href: `/alumnos/${alumno.id}/rutinas`,
    },
    {
      id: "historial",
      icono: "📋",
      label: t("alumnos.historial"),
      href: `/alumnos/${alumno.id}/historial`,
    },
  ];

  const accionesGestion = [
    {
      id: "transferir",
      icono: "🔄",
      label: t("alumnos.transferir"),
      onClick: () => {
        setMenuAbierto(false);
        abrirModalAcciones();
        setMostrarTransferir(true);
      },
    },
    {
      id: "pausar",
      icono: alumno.activo === false ? "▶️" : "⏸️",
      label: alumno.activo === false ? t("alumnos.reanudar") : t("alumnos.pausar"),
      onClick: handlePausar,
    },
    {
      id: "borrar",
      icono: "🗑️",
      label: t("alumnos.borrarAlumno"),
      onClick: () => {
        setMenuAbierto(false);
        setMostrarConfirmarBorrar(true);
        setErrorAccion(null);
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
        title={t("alumnos.acciones")}
        aria-label={t("alumnos.acciones")}
        aria-expanded={menuAbierto}
      >
        ⋮
      </button>

      {/* Dropdown */}
      {menuAbierto && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          {/* Navegación */}
          <div className="py-1">
            {accionesNavegacion.map((accion) => (
              <a
                key={accion.id}
                href={accion.href}
                onClick={() => setMenuAbierto(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition"
              >
                <span className="text-base w-5 text-center">{accion.icono}</span>
                {accion.label}
              </a>
            ))}
          </div>

          <div className="border-t border-zinc-800" />

          {/* Gestión */}
          <div className="py-1">
            {accionesGestion.map((accion) => (
              <button
                key={accion.id}
                type="button"
                onClick={accion.onClick}
                disabled={procesando}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition disabled:opacity-50 ${
                  accion.id === "borrar"
                    ? "text-red-400 hover:bg-red-950/30"
                    : accion.id === "pausar"
                    ? "text-yellow-400 hover:bg-yellow-950/30"
                    : "text-blue-400 hover:bg-blue-950/30"
                }`}
              >
                <span className="text-base w-5 text-center">{accion.icono}</span>
                {accion.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Transferir */}
      {mostrarTransferir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">{t("alumnos.transferirTitulo")}</h3>
              <button
                type="button"
                onClick={() => { setMostrarTransferir(false); setErrorAccion(null); }}
                className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <p className="text-zinc-400 text-sm mb-4" dangerouslySetInnerHTML={{
              __html: t("alumnos.transferirDescripcion", { nombre: nombreCompleto() }) + ":"
            }} />

            {errorAccion && (
              <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {profesoresDisponibles.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-4">{t("alumnos.cargandoProfesores")}</p>
              ) : (
                profesoresDisponibles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfeSeleccionado(p.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      profeSeleccionado === p.id
                        ? "border-emerald-600 bg-emerald-500/10"
                        : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.nombre || t("configuracion.sinNombre")}</p>
                      <p className="text-xs text-zinc-500 truncate">{p.tipo} {p.email ? `· ${p.email}` : ""}</p>
                    </div>
                    {profeSeleccionado === p.id && (
                      <span className="text-emerald-400 text-lg">✓</span>
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setMostrarTransferir(false); setErrorAccion(null); }}
                className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                {t("alumnos.cancelar")}
              </button>
              <button
                type="button"
                onClick={handleTransferir}
                disabled={procesando || !profeSeleccionado}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {procesando ? t("alumnos.transfiriendo") : t("alumnos.transferirBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar borrar */}
      {mostrarConfirmarBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-red-400 mb-3">{t("alumnos.borrarTitulo")}</h3>
            <p className="text-zinc-300 text-sm leading-relaxed mb-2">
              {t("alumnos.borrarConfirmacion", { nombre: nombreCompleto() })}
            </p>
            <ul className="text-zinc-400 text-sm list-disc list-inside mb-4 space-y-1">
              <li>{t("alumnos.borrarItem1")}</li>
              <li>{t("alumnos.borrarItem2")}</li>
              <li>{t("alumnos.borrarItem3")}</li>
              <li>{t("alumnos.borrarItem4")}</li>
              <li>{t("alumnos.borrarItem5")}</li>
            </ul>
            <p className="text-red-400 text-sm font-semibold mb-5">{t("alumnos.borrarNoDeshacer")}</p>
            {errorAccion && (
              <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setMostrarConfirmarBorrar(false); setErrorAccion(null); }}
                disabled={procesando}
                className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50"
              >
                {t("alumnos.cancelar")}
              </button>
              <button
                type="button"
                onClick={borrarAlumno}
                disabled={procesando}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {procesando ? t("alumnos.guardando") : t("alumnos.siBorrarAlumno")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
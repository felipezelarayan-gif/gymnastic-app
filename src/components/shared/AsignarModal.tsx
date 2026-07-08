"use client";

import { useState } from "react";

type ItemConFecha = {
  id: string;
  nombre: string;
  fechaAsignacion?: string;
};

type AsignarModalProps = {
  tipo: "rutinas" | "alumnos";
  items: ItemConFecha[];
  onClose: () => void;
  onConfirm: (seleccionados: ItemConFecha[]) => Promise<void>;
};

export default function AsignarModal({ tipo, items, onClose, onConfirm }: AsignarModalProps) {
  const [itemSeleccionado, setItemSeleccionado] = useState<string>("");
  const [seleccionados, setSeleccionados] = useState<ItemConFecha[]>([]);
  const [cargando, setCargando] = useState(false);

  const titulo = tipo === "rutinas" ? "Asignar rutinas" : "Asignar alumnos";
  const itemNombre = tipo === "rutinas" ? "rutina" : "alumno";
  const itemNombrePlural = tipo === "rutinas" ? "rutinas" : "alumnos";

  const itemsDisponibles = items.filter(
    (item) => !seleccionados.some((s) => s.id === item.id)
  );

  const handleAgregar = () => {
    if (!itemSeleccionado) {
      alert(`Seleccioná un${itemNombre} del dropdown.`);
      return;
    }

    const item = items.find((i) => i.id === itemSeleccionado);
    if (!item) return;

    const hoy = new Date().toISOString().slice(0, 10);
    setSeleccionados((prev) => [
      ...prev,
      { ...item, fechaAsignacion: hoy },
    ]);
    setItemSeleccionado("");
  };

  const handleQuitar = (id: string) => {
    setSeleccionados((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCambiarFecha = (id: string, fecha: string) => {
    setSeleccionados((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, fechaAsignacion: fecha } : item
      )
    );
  };

  const handleConfirmar = async () => {
    if (seleccionados.length === 0) {
      alert(`Agregá al menos un${itemNombre} a la lista.`);
      return;
    }

    const confirmar = confirm(
      `¿Confirmás asignar ${seleccionados.length} ${itemNombre}${seleccionados.length > 1 ? "s" : ""}?`
    );

    if (!confirmar) return;

    setCargando(true);

    try {
      await onConfirm(seleccionados);
      onClose();
    } catch (error) {
      console.error("Error en asignación:", error);
      alert(`Error al asignar: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setCargando(false);
    }
  };

  const handleClose = () => {
    if (cargando) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg max-h-[85vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-6 pb-4">
          <div>
            <h2 className="text-2xl font-bold">{titulo}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {items.length} {itemNombrePlural} disponibles
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={cargando}
            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cerrar
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Selector con botón agregar */}
          <div className="flex gap-2">
            <select
              value={itemSeleccionado}
              onChange={(e) => setItemSeleccionado(e.target.value)}
              disabled={cargando || itemsDisponibles.length === 0}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-white disabled:opacity-50"
            >
              <option value="">
                {itemsDisponibles.length === 0
                  ? "Todos los items ya fueron agregados"
                  : `Elegir ${itemNombre}`}
              </option>
              {itemsDisponibles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAgregar}
              disabled={cargando || !itemSeleccionado}
              className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Agregar ${itemNombre}`}
            >
              +
            </button>
          </div>

          {/* Items seleccionados */}
          {seleccionados.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-zinc-400 mb-3">
                {seleccionados.length} {itemNombre}{seleccionados.length > 1 ? "s" : ""} seleccionado{seleccionados.length > 1 ? "s" : ""}:
              </p>

              <div className="space-y-3">
                {seleccionados.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-emerald-500 bg-emerald-500/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <label className="block font-semibold text-emerald-400 mb-2">
                          ✓ {item.nombre}
                        </label>

                        <label className="block text-sm text-zinc-400 mb-1">
                          Fecha de asignación:
                        </label>
                        <input
                          type="date"
                          value={item.fechaAsignacion || ""}
                          onChange={(e) => handleCambiarFecha(item.id, e.target.value)}
                          disabled={cargando}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuitar(item.id)}
                        disabled={cargando}
                        className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {seleccionados.length === 0 && (
            <div className="mt-8 rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-500">
              <p className="text-lg mb-1">📋 Lista vacía</p>
              <p className="text-sm">
                Usá el selector de arriba para agregar {itemNombrePlural} a la lista.
              </p>
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="border-t border-zinc-800 p-6 pt-4">
          {cargando && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <span>Asignando...</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={cargando}
              className="flex-1 rounded-xl border border-zinc-700 py-3 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmar}
              disabled={cargando || seleccionados.length === 0}
              className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Asignando...
                </span>
              ) : (
                `Asignar (${seleccionados.length})`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
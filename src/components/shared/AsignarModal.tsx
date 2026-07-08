"use client";

import { useState, useEffect } from "react";

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
  const [fechaAsignacion, setFechaAsignacion] = useState<string>("");
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });

  const titulo = tipo === "rutinas" ? "Asignar rutina" : "Asignar alumno";
  const itemNombre = tipo === "rutinas" ? "rutina" : "alumno";

  // Resetear selección cuando se abre el modal
  useEffect(() => {
    setItemSeleccionado("");
    setFechaAsignacion(new Date().toISOString().slice(0, 10));
  }, []);

  const itemSeleccionadoData = items.find((item) => item.id === itemSeleccionado);

  const handleConfirmar = async () => {
    if (!itemSeleccionado) {
      alert(`Seleccioná al menos un${itemNombre}.`);
      return;
    }

    const confirmar = confirm(
      `¿Confirmás asignar ${itemNombre}: ${itemSeleccionadoData?.nombre}?`
    );

    if (!confirmar) return;

    setCargando(true);
    setProgreso({ actual: 0, total: 1 });

    try {
      const itemConFecha = {
        id: itemSeleccionado,
        nombre: itemSeleccionadoData?.nombre || "",
        fechaAsignacion: fechaAsignacion || new Date().toISOString().slice(0, 10),
      };

      await onConfirm([itemConFecha]);
      setProgreso({ actual: 1, total: 1 });
      
      // Pequeño delay para mostrar el progreso completo
      setTimeout(() => {
        onClose();
      }, 300);
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

  const handleChangeItem = (nuevoItemId: string) => {
    setItemSeleccionado(nuevoItemId);
    // Resetear fecha al cambiar de item
    setFechaAsignacion(new Date().toISOString().slice(0, 10));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">{titulo}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {items.length} {itemNombre}{items.length > 1 ? "s" : ""} disponible{itemNombre.length > 1 ? "s" : ""}
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

        {/* Selector de item */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Seleccionar {itemNombre}
            </label>
            <select
              value={itemSeleccionado}
              onChange={(e) => handleChangeItem(e.target.value)}
              disabled={cargando}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-white disabled:opacity-50"
            >
              <option value="">Elegir {itemNombre}</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Mostrar item seleccionado con fecha */}
          {itemSeleccionadoData && (
            <div className="rounded-xl border border-emerald-500 bg-emerald-500/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-emerald-400 mb-2">
                    ✓ {itemSeleccionadoData.nombre}
                  </label>
                  
                  <label className="block text-sm text-zinc-400 mb-1">
                    Fecha de asignación:
                  </label>
                  <input
                    type="date"
                    value={fechaAsignacion}
                    onChange={(e) => setFechaAsignacion(e.target.value)}
                    disabled={cargando}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Podés elegir una fecha diferente para esta asignación.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 mt-6">
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
            disabled={cargando || !itemSeleccionado}
            className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cargando ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Asignando...
              </span>
            ) : (
              `Asignar`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
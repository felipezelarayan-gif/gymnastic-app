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
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({});
  const [fechas, setFechas] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });

  const titulo = tipo === "rutinas" ? "Asignar rutinas" : "Asignar alumnos";
  const itemNombre = tipo === "rutinas" ? "rutina" : "alumno";

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const nuevo = { ...prev, [id]: !prev[id] };
      
      // Si se selecciona y no tiene fecha, asignar fecha de hoy
      if (nuevo[id] && !fechas[id]) {
        const hoy = new Date().toISOString().slice(0, 10);
        setFechas((prevFechas) => ({ ...prevFechas, [id]: hoy }));
      }
      
      return nuevo;
    });
  };

  const cambiarFecha = (id: string, fecha: string) => {
    setFechas((prev) => ({ ...prev, [id]: fecha }));
  };

  const itemsSeleccionados = items.filter((item) => seleccionados[item.id]);
  const todosSeleccionados = items.length > 0 && itemsSeleccionados.length === items.length;

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setSeleccionados({});
    } else {
      const nuevo: Record<string, boolean> = {};
      const hoy = new Date().toISOString().slice(0, 10);
      const nuevasFechas: Record<string, string> = { ...fechas };
      
      items.forEach((item) => {
        nuevo[item.id] = true;
        if (!nuevasFechas[item.id]) {
          nuevasFechas[item.id] = hoy;
        }
      });
      
      setSeleccionados(nuevo);
      setFechas(nuevasFechas);
    }
  };

  const handleConfirmar = async () => {
    if (itemsSeleccionados.length === 0) {
      alert(`Seleccioná al menos un${itemNombre}.`);
      return;
    }

    const confirmar = confirm(
      `¿Confirmás asignar ${itemsSeleccionados.length} ${itemNombre}${itemsSeleccionados.length > 1 ? "s" : ""}?`
    );

    if (!confirmar) return;

    setCargando(true);
    setProgreso({ actual: 0, total: itemsSeleccionados.length });

    try {
      const itemsConFecha = itemsSeleccionados.map((item) => ({
        ...item,
        fechaAsignacion: fechas[item.id] || new Date().toISOString().slice(0, 10),
      }));

      // Procesar en lotes para mostrar progreso
      const loteSize = 5;
      for (let i = 0; i < itemsConFecha.length; i += loteSize) {
        const lote = itemsConFecha.slice(i, i + loteSize);
        await onConfirm(lote);
        setProgreso({ 
          actual: Math.min(i + loteSize, itemsConFecha.length), 
          total: itemsConFecha.length 
        });
      }

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
      <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-6 pb-4">
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

        {/* Lista de items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <p className="text-zinc-400 text-center py-8">
              No hay {itemNombre}s disponibles para asignar.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Checkbox "Seleccionar todos" */}
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                <input
                  type="checkbox"
                  id="seleccionar-todos"
                  checked={todosSeleccionados}
                  onChange={toggleTodos}
                  disabled={cargando}
                  className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 disabled:opacity-50"
                />
                <label htmlFor="seleccionar-todos" className="text-sm font-semibold cursor-pointer">
                  Seleccionar todos
                </label>
              </div>

              {/* Lista de items con checkboxes y fechas */}
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition ${
                    seleccionados[item.id]
                      ? "border-emerald-500 bg-emerald-500/5"
                      : "border-zinc-800 bg-zinc-950/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id={`item-${item.id}`}
                      checked={seleccionados[item.id] || false}
                      onChange={() => toggleSeleccion(item.id)}
                      disabled={cargando}
                      className="mt-1 w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 disabled:opacity-50"
                    />
                    
                    <div className="flex-1">
                      <label
                        htmlFor={`item-${item.id}`}
                        className="block font-semibold cursor-pointer"
                      >
                        {item.nombre}
                      </label>

                      {seleccionados[item.id] && (
                        <div className="mt-3">
                          <label className="block text-sm text-zinc-400 mb-1">
                            Fecha de asignación:
                          </label>
                          <input
                            type="date"
                            value={fechas[item.id] || ""}
                            onChange={(e) => cambiarFecha(item.id, e.target.value)}
                            disabled={cargando}
                            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="border-t border-zinc-800 p-6 pt-4">
          {cargando && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
                <span>Asignando...</span>
                <span>
                  {progreso.actual} de {progreso.total}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
                />
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
              disabled={cargando || itemsSeleccionados.length === 0}
              className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Asignando {progreso.actual}/{progreso.total}...
                </span>
              ) : (
                `Asignar (${itemsSeleccionados.length})`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
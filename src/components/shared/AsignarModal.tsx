"use client";

import { useState } from "react";
import { useIdioma } from "@/lib/i18n-context";

type ItemConFecha = {
  id: string;
  nombre: string;
  fechaAsignacion?: string;
};

type ItemSeleccionado = {
  _uid: string;
  id: string;
  nombre: string;
  fechaAsignacion: string;
};

type AsignarModalProps = {
  tipo: "rutinas" | "alumnos";
  items: ItemConFecha[];
  onClose: () => void;
  onConfirm: (seleccionados: ItemConFecha[]) => Promise<void>;
};

export default function AsignarModal({ tipo, items, onClose, onConfirm }: AsignarModalProps) {
  const { t } = useIdioma();
  const [itemSeleccionado, setItemSeleccionado] = useState<string>("");
  const [seleccionados, setSeleccionados] = useState<ItemSeleccionado[]>([]);
  const [cargando, setCargando] = useState(false);

  const titulo = tipo === "rutinas" ? t("asignarModal.tituloRutinas") : t("asignarModal.tituloAlumnos");
  const itemNombre = tipo === "rutinas" ? t("asignarModal.rutina") : t("asignarModal.alumno");
  const itemNombrePlural = tipo === "rutinas" ? t("asignarModal.rutinas") : t("asignarModal.alumnos");

  const handleAgregar = () => {
    if (!itemSeleccionado) {
      alert(t("asignarModal.seleccionarItem", { item: itemNombre }));
      return;
    }
    const item = items.find((i) => i.id === itemSeleccionado);
    if (!item) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const nuevoItem: ItemSeleccionado = { _uid: crypto.randomUUID(), id: item.id, nombre: item.nombre, fechaAsignacion: hoy };
    setSeleccionados((prev) => [...prev, nuevoItem]);
  };

  const handleQuitar = (uid: string) => setSeleccionados((prev) => prev.filter((item) => item._uid !== uid));
  const handleCambiarFecha = (uid: string, fecha: string) => setSeleccionados((prev) => prev.map((item) => item._uid === uid ? { ...item, fechaAsignacion: fecha } : item));

  const handleConfirmar = async () => {
    if (seleccionados.length === 0) { alert(t("asignarModal.agregarItem", { item: itemNombre })); return; }
    if (!confirm(t("asignarModal.confirmar", { count: seleccionados.length, item: itemNombre, plural: seleccionados.length > 1 ? "s" : "" }))) return;
    setCargando(true);
    try { await onConfirm(seleccionados); onClose(); }
    catch (error) { console.error("Error:", error); alert(t("asignarModal.error")); }
    finally { setCargando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg max-h-[85vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-6 pb-4">
          <div>
            <h2 className="text-2xl font-bold">{titulo}</h2>
            <p className="mt-1 text-sm text-zinc-500">{items.length} {itemNombrePlural} {t("asignarModal.disponibles")}</p>
          </div>
          <button type="button" onClick={onClose} disabled={cargando} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-60">{t("common.cerrar")}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-2">
            <select value={itemSeleccionado} onChange={(e) => setItemSeleccionado(e.target.value)} disabled={cargando} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-white disabled:opacity-50">
              <option value="">{t("asignarModal.elegir", { item: itemNombre })}</option>
              {items.map((item) => (<option key={item.id} value={item.id}>{item.nombre}</option>))}
            </select>
            <button type="button" onClick={handleAgregar} disabled={cargando || !itemSeleccionado} className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-lg hover:bg-emerald-600 disabled:opacity-50" title={t("asignarModal.agregar", { item: itemNombre })}>+</button>
          </div>

          {seleccionados.length > 0 ? (
            <div className="mt-6">
              <p className="text-sm text-zinc-400 mb-3">{seleccionados.length} {itemNombre}{seleccionados.length > 1 ? "s" : ""} {t("asignarModal.seleccionados")}:</p>
              <div className="space-y-3">
                {seleccionados.map((item) => (
                  <div key={item._uid} className="rounded-xl border border-emerald-500 bg-emerald-500/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <label className="block font-semibold text-emerald-400 mb-2">✓ {item.nombre}</label>
                        <label className="block text-sm text-zinc-400 mb-1">{t("asignarModal.fechaAsignacion")}:</label>
                        <input type="date" value={item.fechaAsignacion || ""} onChange={(e) => handleCambiarFecha(item._uid, e.target.value)} disabled={cargando} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white disabled:opacity-50" />
                      </div>
                      <button type="button" onClick={() => handleQuitar(item._uid)} disabled={cargando} className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50">{t("asignarModal.quitar")}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-500">
              <p className="text-lg mb-1">📋 {t("asignarModal.listaVacia")}</p>
              <p className="text-sm">{t("asignarModal.listaVaciaDesc", { item: itemNombrePlural })}</p>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 p-6 pt-4">
          {cargando && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <span>{t("asignarModal.asignando")}</span>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={cargando} className="flex-1 rounded-xl border border-zinc-700 py-3 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">{t("common.cancelar")}</button>
            <button type="button" onClick={handleConfirmar} disabled={cargando || seleccionados.length === 0} className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50">
              {cargando ? (
                <span className="inline-flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{t("asignarModal.asignando")}</span>
              ) : `${t("asignarModal.asignar")} (${seleccionados.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
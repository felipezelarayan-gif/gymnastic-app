"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { OPCIONES_TIPO } from "@/lib/rutinas/opciones-tipo";
import { useIdioma } from "@/lib/i18n-context";

type CrearRutinaModalProps = {
  open: boolean;
  onClose: () => void;
  onCreada: (rutinaId: string) => void;
};

export default function CrearRutinaModal({ open, onClose, onCreada }: CrearRutinaModalProps) {
  const { t } = useIdioma();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [tipoPersonalizado, setTipoPersonalizado] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [creando, setCreando] = useState(false);

  if (!open) return null;

  const opcionSeleccionada = OPCIONES_TIPO.find((o) => o.label === tipo);
  const esPersonalizado = opcionSeleccionada?.esPersonalizado;

  async function crearRutina() {
    if (creando) return;
    if (!nombre.trim()) {
      alert(t("rutinas.nombreRequerido"));
      return;
    }

    setCreando(true);
    let objetivoFinal: string | null = null;
    let estructuraFinal: string | null = null;

    if (esPersonalizado) {
      objetivoFinal = tipoPersonalizado.trim() || null;
    } else if (opcionSeleccionada) {
      objetivoFinal = opcionSeleccionada.objetivo;
      estructuraFinal = opcionSeleccionada.estructura;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const profesorId = sessionData.session?.user.id;
    if (!profesorId) { window.location.href = "/login"; return; }

    const { data: rutinaCreada, error } = await supabase.from("rutinas").insert({
      nombre: nombre.trim(), descripcion: descripcion.trim() || null, objetivo: objetivoFinal, estructura: estructuraFinal, creada_por: profesorId, profesor_id: profesorId,
    }).select("id").single();

    if (error) { alert(error.message); setCreando(false); return; }
    if (!rutinaCreada?.id) { alert(t("rutinas.errorAbrirEditor")); setCreando(false); return; }
    try { localStorage.removeItem(`rutinas_page_cache_v1_${profesorId}`); } catch {}
    onCreada(rutinaCreada.id);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-1">{t("rutinas.crearRutina")}</h2>
        <p className="mb-4 text-sm text-zinc-400">{t("rutinas.crearRutinaDesc")}</p>
        <div className="space-y-3">
          <input type="text" placeholder={t("rutinas.nombreRutina")} value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3" />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3">
            <option value="">{t("rutinas.seleccionarTipo")}</option>
            {OPCIONES_TIPO.map((opcion) => (
              <option key={opcion.label} value={opcion.label}>{opcion.label}</option>
            ))}
          </select>
          {esPersonalizado && (
            <input type="text" placeholder={t("rutinas.tipoPersonalizado")} value={tipoPersonalizado} onChange={(e) => setTipoPersonalizado(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3" />
          )}
          <textarea placeholder={t("rutinas.descripcion")} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 min-h-28" />
        </div>
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose} className="flex-1 border border-zinc-700 rounded-xl py-3">{t("common.cancelar")}</button>
          <button type="button" onClick={crearRutina} disabled={creando} className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">{creando ? t("common.cargando") : t("rutinas.crearYEditar")}</button>
        </div>
      </div>
    </div>
  );
}
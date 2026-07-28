"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useIdioma } from "@/lib/i18n-context";

type EjercicioCreado = {
  id: string;
  nombre: string;
  grupo_muscular?: string | null;
  youtube_url?: string | null;
  peso_corporal?: boolean | null;
};

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: (ejercicio: EjercicioCreado) => void;
};

export default function CrearEjercicioModal({ abierto, onCerrar, onCreado }: Props) {
  const { t, idioma } = useIdioma();
  const [nombre, setNombre] = useState("");
  const [grupoMuscular, setGrupoMuscular] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pesoCorporal, setPesoCorporal] = useState(false);
  const [creando, setCreando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function crearEjercicio() {
    if (!nombre.trim()) {
      alert(t("ejercicios.nombreRequerido"));
      return;
    }
    setCreando(true);
    const insertData: Record<string, any> = {
      nombre: nombre.trim(),
      grupo_muscular: grupoMuscular.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
      peso_corporal: pesoCorporal,
    };
    // Guardar también en la columna del idioma del profesor
    if (idioma === "es") {
      insertData.nombre_es = nombre.trim();
      if (grupoMuscular.trim()) insertData.grupo_muscular_es = grupoMuscular.trim();
    } else {
      insertData.nombre_en = nombre.trim();
      if (grupoMuscular.trim()) insertData.grupo_muscular_en = grupoMuscular.trim();
    }
    const { data, error } = await supabase.from("ejercicios").insert(insertData).select("id, nombre, grupo_muscular, youtube_url, peso_corporal").single();
    if (error) { alert(error.message); setCreando(false); return; }
    onCreado(data);
    setCreando(false);
    setNombre(""); setGrupoMuscular(""); setYoutubeUrl(""); setPesoCorporal(false);
    onCerrar();
  }

  async function handleCrear() {
    if (!nombre.trim()) { alert(t("ejercicios.nombreRequerido")); return; }
    const { data: similares } = await supabase.from("ejercicios").select("nombre").ilike("nombre", `%${nombre.trim()}%`).limit(3);
    if (similares && similares.length > 0) {
      const mensaje = `${t("ejercicios.ejerciciosSimilares")}:\n\n${similares.map((s) => `• ${s.nombre}`).join("\n")}\n\n${t("ejercicios.confirmarCrear", { nombre: nombre.trim() })}`;
      if (!confirm(mensaje)) return;
    }
    if (!youtubeUrl.trim()) {
      if (!confirm(t("ejercicios.youtubeWarning"))) return;
    }
    setShowConfirm(true);
    await crearEjercicio();
  }

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold">{t("ejercicios.crearEjercicio")}</h2>
          <button type="button" onClick={onCerrar} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
        </div>
        <div className="space-y-3">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3" placeholder={t("ejercicios.nombreEjercicio")} />
          <input value={grupoMuscular} onChange={(e) => setGrupoMuscular(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3" placeholder={t("ejercicios.grupoMuscular")} />
          <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3" placeholder={t("ejercicios.youtubeLink")} />
          <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={pesoCorporal} onChange={(e) => setPesoCorporal(e.target.checked)} /> {t("ejercicios.pesoCorporal")}</label>
        </div>
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onCerrar} className="flex-1 rounded-xl border border-zinc-700 py-3">{t("common.cancelar")}</button>
          <button type="button" onClick={handleCrear} disabled={creando} className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold disabled:opacity-50">{creando ? t("common.cargando") : t("common.crear")}</button>
        </div>
      </div>
    </div>
  );
}
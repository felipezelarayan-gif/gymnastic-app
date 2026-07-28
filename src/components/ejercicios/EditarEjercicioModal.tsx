"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useIdioma } from "@/lib/i18n-context";

type Ejercicio = {
  id: string;
  nombre: string;
  nombre_es?: string | null;
  nombre_en?: string | null;
  grupo_muscular?: string | null;
  grupo_muscular_es?: string | null;
  grupo_muscular_en?: string | null;
  youtube_url?: string | null;
  peso_corporal?: boolean | null;
};

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  onActualizado: (ejercicio: Ejercicio) => void;
  ejercicio: Ejercicio | null;
};

function normalizarNombre(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s\-_]+/g, "").trim();
}

function calcularSimilitud(nombre1: string, nombre2: string): number {
  const n1 = normalizarNombre(nombre1);
  const n2 = normalizarNombre(nombre2);
  if (n1 === n2) return 100;
  const len1 = n1.length, len2 = n2.length;
  const matriz = Array.from({ length: len1 + 1 }, () => Array.from({ length: len2 + 1 }, () => 0));
  for (let i = 0; i <= len1; i++) matriz[i][0] = i;
  for (let j = 0; j <= len2; j++) matriz[0][j] = j;
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const costo = n1[i - 1] === n2[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(matriz[i - 1][j] + 1, matriz[i][j - 1] + 1, matriz[i - 1][j - 1] + costo);
    }
  }
  const distancia = matriz[len1][len2];
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 100;
  return ((1 - distancia / maxLen) * 100);
}

export default function EditarEjercicioModal({ abierto, onCerrar, onActualizado, ejercicio }: Props) {
  const { t, idioma } = useIdioma();
  const [nombre, setNombre] = useState("");
  const [nombreEs, setNombreEs] = useState("");
  const [nombreEn, setNombreEn] = useState("");
  const [grupoMuscular, setGrupoMuscular] = useState("");
  const [grupoMuscularEs, setGrupoMuscularEs] = useState("");
  const [grupoMuscularEn, setGrupoMuscularEn] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pesoCorporal, setPesoCorporal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [ejerciciosExistentes, setEjerciciosExistentes] = useState<string[]>([]);

  useEffect(() => {
    if (abierto && ejercicio) {
      setNombre(ejercicio.nombre || "");
      setNombreEs(ejercicio.nombre_es || "");
      setNombreEn(ejercicio.nombre_en || "");
      setGrupoMuscular(ejercicio.grupo_muscular || "");
      setGrupoMuscularEs(ejercicio.grupo_muscular_es || "");
      setGrupoMuscularEn(ejercicio.grupo_muscular_en || "");
      setYoutubeUrl(ejercicio.youtube_url || "");
      setPesoCorporal(ejercicio.peso_corporal || false);
      cargarEjercicios();
    }
  }, [abierto, ejercicio]);

  async function cargarEjercicios() {
    const { data } = await supabase.from("ejercicios").select("nombre").order("nombre");
    setEjerciciosExistentes((data || []).map((e) => e.nombre).filter(Boolean));
  }

  function buscarCoincidencias(nombreIngresado: string, idActual: string): { exacta: string[]; similares: string[] } {
    const exacta: string[] = []; const similares: string[] = [];
    for (const nombreExistente of ejerciciosExistentes) {
      const similitud = calcularSimilitud(nombreIngresado, nombreExistente);
      if (similitud >= 95 && normalizarNombre(nombreExistente) !== normalizarNombre(ejercicio?.nombre || "")) {
        exacta.push(nombreExistente);
      } else if (similitud >= 80 && normalizarNombre(nombreExistente) !== normalizarNombre(ejercicio?.nombre || "")) {
        similares.push(nombreExistente);
      }
    }
    return { exacta, similares };
  }

  async function guardarEjercicio() {
    if (!nombre.trim()) { alert(t("ejercicios.nombreRequerido")); return; }
    if (!ejercicio) return;
    const { exacta, similares } = buscarCoincidencias(nombre.trim(), ejercicio.id);
    if (exacta.length > 0) { alert(`Ya existe un ejercicio con un nombre muy similar: "${exacta[0]}". Usá un nombre diferente.`); return; }
    if (similares.length > 0) {
      const mensaje = `${t("ejercicios.ejerciciosSimilares")}:\n\n${similares.map((s) => `• ${s}`).join("\n")}\n\n${t("ejercicios.confirmarActualizar", { nombre: nombre.trim() })}`;
      if (!confirm(mensaje)) return;
    }
    if (!youtubeUrl.trim()) {
      if (!confirm(t("ejercicios.youtubeWarning"))) return;
    }
    setGuardando(true);
    const updateData: Record<string, any> = {
      nombre: nombre.trim(),
      nombre_es: nombreEs.trim() || null,
      nombre_en: nombreEn.trim() || null,
      grupo_muscular: grupoMuscular.trim() || null,
      grupo_muscular_es: grupoMuscularEs.trim() || null,
      grupo_muscular_en: grupoMuscularEn.trim() || null,
      youtube_url: youtubeUrl.trim() || null,
      peso_corporal: pesoCorporal,
    };
    const { data, error } = await supabase.from("ejercicios").update(updateData).eq("id", ejercicio.id).select("id,nombre,grupo_muscular,youtube_url,peso_corporal").single();
    setGuardando(false);
    if (error) { alert(error.message); return; }
    if (!data) { alert("No se pudo actualizar el ejercicio."); return; }
    onActualizado(data);
    onCerrar();
  }

  if (!abierto || !ejercicio) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4">{t("ejercicios.editarEjercicio")}</h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-zinc-500 mb-1 font-semibold uppercase tracking-wider">Español</p>
            <input value={nombreEs} onChange={(e) => setNombreEs(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3" placeholder={t("ejercicios.nombreEjercicio") + " (ES)"} />
            <input value={grupoMuscularEs} onChange={(e) => setGrupoMuscularEs(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 mt-2" placeholder={t("ejercicios.grupoMuscular") + " (ES)"} />
          </div>
          <div className="border-t border-zinc-800 pt-3">
            <p className="text-xs text-zinc-500 mb-1 font-semibold uppercase tracking-wider">English</p>
            <input value={nombreEn} onChange={(e) => setNombreEn(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3" placeholder={t("ejercicios.nombreEjercicio") + " (EN)"} />
            <input value={grupoMuscularEn} onChange={(e) => setGrupoMuscularEn(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 mt-2" placeholder={t("ejercicios.grupoMuscular") + " (EN)"} />
          </div>
          <div className="border-t border-zinc-800 pt-3">
            <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3" placeholder={t("ejercicios.youtubeLink")} />
            <label className="flex items-center gap-2 cursor-pointer mt-3">
              <input type="checkbox" checked={pesoCorporal} onChange={(e) => setPesoCorporal(e.target.checked)} className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900" />
              <span className="text-sm text-zinc-300">{t("ejercicios.pesoCorporal")}</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onCerrar} className="flex-1 border border-zinc-700 rounded-xl py-3">{t("common.cancelar")}</button>
          <button type="button" onClick={guardarEjercicio} disabled={guardando} className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold disabled:opacity-60">{guardando ? t("common.cargando") : t("common.guardar")}</button>
        </div>
      </div>
    </div>
  );
}
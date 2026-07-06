"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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

function normalizarNombre(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\-_]+/g, "")
    .trim();
}

function calcularSimilitud(nombre1: string, nombre2: string): number {
  const n1 = normalizarNombre(nombre1);
  const n2 = normalizarNombre(nombre2);

  if (n1 === n2) return 100;

  const len1 = n1.length;
  const len2 = n2.length;

  const matriz = Array.from({ length: len1 + 1 }, () =>
    Array.from({ length: len2 + 1 }, () => 0)
  );

  for (let i = 0; i <= len1; i++) matriz[i][0] = i;
  for (let j = 0; j <= len2; j++) matriz[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const costo = n1[i - 1] === n2[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + costo
      );
    }
  }

  const distancia = matriz[len1][len2];
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 100;

  return ((1 - distancia / maxLen) * 100);
}

export default function CrearEjercicioModal({
  abierto,
  onCerrar,
  onCreado,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [grupoMuscular, setGrupoMuscular] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pesoCorporal, setPesoCorporal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [ejerciciosExistentes, setEjerciciosExistentes] = useState<string[]>([]);

  useEffect(() => {
    if (abierto) {
      cargarEjercicios();
    }
  }, [abierto]);

  async function cargarEjercicios() {
    const { data } = await supabase
      .from("ejercicios")
      .select("nombre")
      .order("nombre");

    setEjerciciosExistentes((data || []).map((e) => e.nombre).filter(Boolean));
  }

  function buscarCoincidencias(nombreIngresado: string): { exacta: string[]; similares: string[] } {
    const nombreNorm = normalizarNombre(nombreIngresado);
    const exacta: string[] = [];
    const similares: string[] = [];

    for (const nombreExistente of ejerciciosExistentes) {
      const similitud = calcularSimilitud(nombreIngresado, nombreExistente);

      if (similitud >= 95) {
        exacta.push(nombreExistente);
      } else if (similitud >= 80) {
        similares.push(nombreExistente);
      }
    }

    return { exacta, similares };
  }

  async function guardarEjercicio() {
    if (!nombre.trim()) {
      alert("Ingresá el nombre del ejercicio.");
      return;
    }

    const { exacta, similares } = buscarCoincidencias(nombre.trim());

    if (exacta.length > 0) {
      alert(`Ya existe un ejercicio con un nombre muy similar: "${exacta[0]}". Usá un nombre diferente.`);
      return;
    }

    if (similares.length > 0) {
      const mensaje = `Tenemos ejercicios similares:\n\n${similares.map((s) => `• ${s}`).join("\n")}\n\n¿Estás seguro que querés crear "${nombre.trim()}"?`;
      const confirmar = confirm(mensaje);
      if (!confirmar) return;
    }

    if (!youtubeUrl.trim()) {
      const confirmar = confirm(
        "No cargaste el link de YouTube. El alumno puede no saber cómo realizar el ejercicio. ¿Querés continuar de todas formas?"
      );
      if (!confirmar) return;
    }

    setGuardando(true);

    const { data, error } = await supabase
      .from("ejercicios")
      .insert({
        nombre: nombre.trim(),
        grupo_muscular: grupoMuscular.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        peso_corporal: pesoCorporal,
      })
      .select("id,nombre,grupo_muscular,youtube_url,peso_corporal")
      .single();

    setGuardando(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (!data) {
      alert("No se pudo crear el ejercicio.");
      return;
    }

    setNombre("");
    setGrupoMuscular("");
    setYoutubeUrl("");
    setPesoCorporal(false);

    onCreado(data);
    onCerrar();
  }

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-4">Crear ejercicio</h2>

        <div className="space-y-3">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl p-3"
            placeholder="Nombre del ejercicio"
          />

          <input
            value={grupoMuscular}
            onChange={(e) => setGrupoMuscular(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl p-3"
            placeholder="Músculos o patrón de movimiento"
          />

          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl p-3"
            placeholder="Link de YouTube (opcional)"
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pesoCorporal}
              onChange={(e) => setPesoCorporal(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
            />
            <span className="text-sm text-zinc-300">
              Marca esta opción si el ejercicio se realiza con peso corporal
            </span>
          </label>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 border border-zinc-700 rounded-xl py-3"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={guardarEjercicio}
            disabled={guardando}
            className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

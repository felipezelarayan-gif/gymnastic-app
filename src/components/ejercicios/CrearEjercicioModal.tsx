"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type EjercicioCreado = {
  id: string;
  nombre: string;
  grupo_muscular?: string | null;
  youtube_url?: string | null;
};

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: (ejercicio: EjercicioCreado) => void;
};

export default function CrearEjercicioModal({
  abierto,
  onCerrar,
  onCreado,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [grupoMuscular, setGrupoMuscular] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardarEjercicio() {
    if (!nombre.trim()) {
      alert("Ingresá el nombre del ejercicio.");
      return;
    }

    setGuardando(true);

    const { data, error } = await supabase
      .from("ejercicios")
      .insert({
        nombre: nombre.trim(),
        grupo_muscular: grupoMuscular.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
      })
      .select("id,nombre,grupo_muscular,youtube_url")
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
            placeholder="Grupo muscular"
          />

          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl p-3"
            placeholder="Link de YouTube opcional"
          />
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
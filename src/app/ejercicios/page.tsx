"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Ejercicio = {
  id: string;
  nombre: string;
  patron_movimiento?: string;
  youtube_url?: string;
};

const patrones = [
  "Empuje",
  "Tracción",
  "Dominante de cadera",
  "Dominante de rodilla",
  "Full body",
  "Mixto",
];

export default function EjerciciosPage() {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [patronMovimiento, setPatronMovimiento] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  useEffect(() => {
    cargarEjercicios();
  }, []);

  async function cargarEjercicios() {
    const { data, error } = await supabase
      .from("ejercicios")
      .select("id,nombre,patron_movimiento,youtube_url")
      .order("nombre");

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setEjercicios(data || []);
    setLoading(false);
  }

  function abrirNuevo() {
    setEditandoId(null);
    setNombre("");
    setPatronMovimiento("");
    setYoutubeUrl("");
    setMostrarModal(true);
  }

  function abrirEditar(ejercicio: Ejercicio) {
    setEditandoId(ejercicio.id);
    setNombre(ejercicio.nombre || "");
    setPatronMovimiento(ejercicio.patron_movimiento || "");
    setYoutubeUrl(ejercicio.youtube_url || "");
    setMostrarModal(true);
  }

  async function guardarEjercicio() {
    if (!nombre.trim()) {
      alert("Ingresá el nombre del ejercicio.");
      return;
    }

    if (!patronMovimiento) {
      alert("Seleccioná el patrón de movimiento.");
      return;
    }

    if (editandoId) {
      const { error } = await supabase
        .from("ejercicios")
        .update({
          nombre,
          patron_movimiento: patronMovimiento,
          youtube_url: youtubeUrl,
        })
        .eq("id", editandoId);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("ejercicios").insert({
        nombre,
        patron_movimiento: patronMovimiento,
        youtube_url: youtubeUrl,
        activo: true,
      });

      if (error) {
        alert(error.message);
        return;
      }
    }

    setMostrarModal(false);
    setEditandoId(null);
    setNombre("");
    setPatronMovimiento("");
    setYoutubeUrl("");
    cargarEjercicios();
  }

  async function borrarEjercicio(id: string) {
    const confirmar = confirm("¿Seguro que querés borrar este ejercicio?");
    if (!confirmar) return;

    const { error } = await supabase.from("ejercicios").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    cargarEjercicios();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando ejercicios...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Ejercicios</h1>
          <p className="text-zinc-400 mt-1">
            Banco de ejercicios y videos explicativos.
          </p>
        </div>

        <div className="grid gap-3">
          {ejercicios.map((ejercicio) => (
            <div
              key={ejercicio.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    {ejercicio.nombre}
                  </h2>

                  <p className="text-zinc-400 text-sm mt-1">
                    Patrón de movimiento:{" "}
                    {ejercicio.patron_movimiento || "Sin definir"}
                  </p>

                  {ejercicio.youtube_url && (
                    <a
                      href={ejercicio.youtube_url}
                      target="_blank"
                      className="text-emerald-400 text-sm mt-2 inline-block"
                    >
                      ▶ Ver video
                    </a>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEditar(ejercicio)}
                    className="rounded-lg border border-zinc-700 px-3 py-2 hover:bg-zinc-800"
                    title="Editar"
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    onClick={() => borrarEjercicio(ejercicio.id)}
                    className="rounded-lg border border-red-800 px-3 py-2 hover:bg-red-950"
                    title="Borrar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={abrirNuevo}
          className="fixed right-6 bottom-24 md:bottom-6 w-14 h-14 rounded-full bg-emerald-500 text-white text-3xl font-bold shadow-lg hover:bg-emerald-600"
        >
          +
        </button>

        {mostrarModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editandoId ? "Editar ejercicio" : "Nuevo ejercicio"}
              </h2>

              <div className="space-y-3">
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre"
                  className="w-full bg-zinc-800 rounded-xl p-3"
                />

                <select
                  value={patronMovimiento}
                  onChange={(e) => setPatronMovimiento(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                >
                  <option value="">Seleccionar patrón de movimiento</option>

                  {patrones.map((patron) => (
                    <option key={patron} value={patron}>
                      {patron}
                    </option>
                  ))}
                </select>

                <input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Link de YouTube"
                  className="w-full bg-zinc-800 rounded-xl p-3"
                />
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="flex-1 border border-zinc-700 rounded-xl py-3"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarEjercicio}
                  className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
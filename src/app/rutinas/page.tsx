"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Rutina = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  objetivo?: string | null;
  estructura?: string | null;
  created_at?: string | null;
  creada_para_alumno_id?: string | null;
};

export default function RutinasPage() {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [objetivoPersonalizado, setObjetivoPersonalizado] = useState("");
  const [estructura, setEstructura] = useState("");
  const [estructuraPersonalizada, setEstructuraPersonalizada] = useState("");

  useEffect(() => {
    verificarPermiso();
  }, []);

  async function verificarPermiso() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", sessionData.session.user.id)
      .single();

    if (!profile || profile.rol !== "profe") {
      window.location.href = "/alumno";
      return;
    }

    await cargarRutinas();
  }

  async function cargarRutinas() {
    const { data, error } = await supabase
      .from("rutinas")
      .select("id,nombre,descripcion,objetivo,estructura,created_at,creada_para_alumno_id")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setRutinas((data || []) as Rutina[]);
    setLoading(false);
  }

  async function crearRutina() {
    if (!nombre.trim()) {
      alert("Ingresá un nombre para la rutina.");
      return;
    }

    const objetivoFinal =
      objetivo === "otro" ? objetivoPersonalizado : objetivo;

    const estructuraFinal =
      estructura === "otro" ? estructuraPersonalizada : estructura;

    const { data: sessionData } = await supabase.auth.getSession();

    const { error } = await supabase.from("rutinas").insert({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      objetivo: objetivoFinal || null,
      estructura: estructuraFinal || null,
      creada_por: sessionData.session?.user.id,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNombre("");
    setDescripcion("");
    setObjetivo("");
    setObjetivoPersonalizado("");
    setEstructura("");
    setEstructuraPersonalizada("");
    setMostrarModal(false);

    await cargarRutinas();
  }

  async function borrarRutina(rutinaId: string) {
    const confirmar = confirm(
      "¿Querés borrar esta rutina? También se quitará de todos los alumnos que la tengan asignada."
    );

    if (!confirmar) return;

    const { error: asignacionesError } = await supabase
      .from("rutina_asignaciones")
      .delete()
      .eq("rutina_id", rutinaId);

    if (asignacionesError) {
      alert(asignacionesError.message);
      return;
    }

    const { error: rutinaError } = await supabase
      .from("rutinas")
      .delete()
      .eq("id", rutinaId);

    if (rutinaError) {
      alert(rutinaError.message);
      return;
    }

    await cargarRutinas();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando rutinas...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Rutinas</h1>
            <p className="text-zinc-400">
              Creá rutinas y asignalas a tus alumnos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMostrarModal(true)}
            className="rounded-full w-12 h-12 bg-emerald-500 flex items-center justify-center text-2xl font-bold hover:bg-emerald-600"
          >
            +
          </button>
        </div>

        {rutinas.length === 0 ? (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold">No hay rutinas todavía</h2>
            <p className="text-zinc-400 mt-2">
              Tocá el botón + para crear tu primera rutina.
            </p>
          </section>
        ) : (
          <div className="grid gap-4">
            {rutinas.map((rutina) => (
              <div
                key={rutina.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:bg-zinc-800"
              >
                <a href={`/rutinas/${rutina.id}`} className="block">
                  <h2 className="text-xl font-semibold">{rutina.nombre}</h2>

                  {rutina.creada_para_alumno_id && (
                    <span className="mt-2 inline-flex rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-semibold text-yellow-400">
                      ⚠ Personalizada
                    </span>
                  )}

                  <div className="flex flex-wrap gap-2 mt-2">
                    {rutina.objetivo && (
                      <span className="text-sm rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1">
                        {rutina.objetivo}
                      </span>
                    )}

                    {rutina.estructura && (
                      <span className="text-sm rounded-full bg-zinc-800 text-zinc-300 px-3 py-1">
                        {rutina.estructura}
                      </span>
                    )}
                  </div>

                  {rutina.descripcion && (
                    <p className="text-zinc-400 mt-3">
                      {rutina.descripcion}
                    </p>
                  )}
                </a>

                <div className="flex gap-2 mt-4">
                  <a
                    href={`/rutinas/${rutina.id}`}
                    className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                  >
                    Editar
                  </a>

                  <button
                    type="button"
                    onClick={() => borrarRutina(rutina.id)}
                    className="rounded-xl border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-950"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {mostrarModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">Nueva rutina</h2>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre de la rutina"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                />

                <select
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                >
                  <option value="">Seleccionar objetivo</option>
                  <option value="Fuerza">Fuerza</option>
                  <option value="Hipertrofia">Hipertrofia</option>
                  <option value="HIIT">HIIT</option>
                  <option value="otro">Crear nuevo objetivo</option>
                </select>

                {objetivo === "otro" && (
                  <input
                    type="text"
                    placeholder="Nuevo objetivo"
                    value={objetivoPersonalizado}
                    onChange={(e) => setObjetivoPersonalizado(e.target.value)}
                    className="w-full bg-zinc-800 rounded-xl p-3"
                  />
                )}

                <select
                  value={estructura}
                  onChange={(e) => setEstructura(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                >
                  <option value="">Seleccionar estructura</option>
                  <option value="Miembros superiores">
                    Miembros superiores
                  </option>
                  <option value="Miembros inferiores">
                    Miembros inferiores
                  </option>
                  <option value="Full body">Full body</option>
                  <option value="Push">Push</option>
                  <option value="Pull">Pull</option>
                  <option value="Piernas">Piernas</option>
                  <option value="Core">Core</option>
                  <option value="Cardio / HIIT">Cardio / HIIT</option>
                  <option value="otro">Crear nueva estructura</option>
                </select>

                {estructura === "otro" && (
                  <input
                    type="text"
                    placeholder="Nueva estructura"
                    value={estructuraPersonalizada}
                    onChange={(e) =>
                      setEstructuraPersonalizada(e.target.value)
                    }
                    className="w-full bg-zinc-800 rounded-xl p-3"
                  />
                )}

                <textarea
                  placeholder="Descripción"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 min-h-28"
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
                  onClick={crearRutina}
                  className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold"
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
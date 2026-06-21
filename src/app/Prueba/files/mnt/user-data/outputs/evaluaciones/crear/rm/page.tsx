"use client";

// Tablas asumidas:
// - profiles (id, nombre, rol) → alumnos tienen rol='alumno'
// - ejercicios (id, nombre)
// - evaluaciones_rm (id, alumno_id, ejercicio_ids[], fecha, notas, estado='pendiente'|'completada', creado_por)

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Alumno = { id: string; nombre: string };
type Ejercicio = { id: string; nombre: string };

export default function CrearEvaluacionRM() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [alumnoId, setAlumnoId] = useState("");
  const [ejerciciosSeleccionados, setEjerciciosSeleccionados] = useState<string[]>([]);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    async function cargarDatos() {
      const [{ data: perfiles }, { data: ejercs }] = await Promise.all([
        supabase.from("profiles").select("id, nombre").eq("rol", "alumno").order("nombre"),
        supabase.from("ejercicios").select("id, nombre").order("nombre"),
      ]);
      if (perfiles) setAlumnos(perfiles);
      if (ejercs) setEjercicios(ejercs);
      setLoading(false);
    }
    cargarDatos();
  }, []);

  function toggleEjercicio(id: string) {
    setEjerciciosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  async function guardar() {
    if (!alumnoId || ejerciciosSeleccionados.length === 0) return;
    setGuardando(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    const { error } = await supabase.from("evaluaciones_rm").insert({
      alumno_id: alumnoId,
      ejercicio_ids: ejerciciosSeleccionados,
      fecha,
      notas,
      estado: "pendiente",
      creado_por: userId,
    });

    setGuardando(false);
    if (!error) setExito(true);
    else alert(error.message);
  }

  if (loading) {
    return <main className="min-h-screen bg-zinc-950 text-white p-8">Cargando...</main>;
  }

  if (exito) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">✅</p>
          <h2 className="text-2xl font-bold">Evaluación creada</h2>
          <p className="text-zinc-400 mt-2">La evaluación RM quedó programada como pendiente.</p>
          <div className="flex gap-3 justify-center mt-6">
            <a href="/evaluaciones/realizar/rm" className="bg-white text-zinc-950 font-semibold px-5 py-2 rounded-lg hover:bg-zinc-200 transition">
              Realizarla ahora
            </a>
            <a href="/evaluaciones" className="border border-zinc-700 text-zinc-300 px-5 py-2 rounded-lg hover:bg-zinc-800 transition">
              Volver
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-2xl mx-auto">

        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
          <a href="/" className="hover:text-zinc-300 transition">Panel del profe</a>
          <span>/</span>
          <a href="/evaluaciones" className="hover:text-zinc-300 transition">Evaluaciones</a>
          <span>/</span>
          <span className="text-zinc-200">Crear Test RM</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-bold">🏋️ Crear Test RM</h1>
          <p className="text-zinc-400 mt-2">
            Programá una evaluación de repetición máxima para un alumno.
          </p>
        </header>

        <div className="space-y-6">

          {/* Alumno */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Alumno *</label>
            <select
              value={alumnoId}
              onChange={(e) => setAlumnoId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
            >
              <option value="">Seleccioná un alumno</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Ejercicios */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Ejercicios a evaluar *{" "}
              <span className="text-zinc-600 font-normal">({ejerciciosSeleccionados.length} seleccionados)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {ejercicios.map((ej) => {
                const activo = ejerciciosSeleccionados.includes(ej.id);
                return (
                  <button
                    key={ej.id}
                    type="button"
                    onClick={() => toggleEjercicio(ej.id)}
                    className={`text-left px-4 py-3 rounded-lg border text-sm transition ${
                      activo
                        ? "bg-white text-zinc-950 border-white font-medium"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {activo ? "✓ " : ""}{ej.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Condiciones especiales, contexto, observaciones..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={guardar}
              disabled={!alumnoId || ejerciciosSeleccionados.length === 0 || guardando}
              className="bg-white text-zinc-950 font-semibold px-6 py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {guardando ? "Guardando..." : "Crear evaluación"}
            </button>
            <a
              href="/evaluaciones"
              className="border border-zinc-700 text-zinc-300 px-6 py-3 rounded-lg hover:bg-zinc-800 transition"
            >
              Cancelar
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

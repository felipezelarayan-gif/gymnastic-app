"use client";

// Tablas asumidas:
// - profiles (id, nombre, rol)
// - evaluaciones_fms (id, alumno_id, fecha, notas, estado='pendiente'|'completada', creado_por)

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Alumno = { id: string; nombre: string };

export default function CrearEvaluacionFMS() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnoId, setAlumnoId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    async function cargarAlumnos() {
      const { data } = await supabase
        .from("profiles")
        .select("id, nombre")
        .eq("rol", "alumno")
        .order("nombre");
      if (data) setAlumnos(data);
      setLoading(false);
    }
    cargarAlumnos();
  }, []);

  async function guardar() {
    if (!alumnoId) return;
    setGuardando(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    const { error } = await supabase.from("evaluaciones_fms").insert({
      alumno_id: alumnoId,
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
          <h2 className="text-2xl font-bold">Evaluación FMS creada</h2>
          <p className="text-zinc-400 mt-2">Quedó programada como pendiente.</p>
          <div className="flex gap-3 justify-center mt-6">
            <a href="/evaluaciones/realizar/fms" className="bg-white text-zinc-950 font-semibold px-5 py-2 rounded-lg hover:bg-zinc-200 transition">
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
          <span className="text-zinc-200">Crear Test FMS</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-bold">🧩 Crear Test FMS</h1>
          <p className="text-zinc-400 mt-2">
            Programá una evaluación de movimiento funcional para un alumno.
          </p>
        </header>

        {/* Qué es FMS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-8">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Patrones que se evaluarán
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-zinc-300">
            {[
              "1. Sentadilla profunda",
              "2. Paso de valla",
              "3. Estocada en línea",
              "4. Movilidad de hombro",
              "5. Elevación activa de pierna",
              "6. Flexión con estabilidad de tronco",
              "7. Estabilidad rotatoria",
            ].map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span className="text-zinc-600">—</span> {p}
              </li>
            ))}
          </ul>
          <p className="text-zinc-500 text-xs mt-3">Cada patrón se puntúa de 0 a 3. Máximo: 21 puntos.</p>
        </div>

        <div className="space-y-6">

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

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Contexto, lesiones previas, condiciones a tener en cuenta..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={guardar}
              disabled={!alumnoId || guardando}
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

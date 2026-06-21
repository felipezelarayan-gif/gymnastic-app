"use client";

// Tablas asumidas:
// - profiles (id, nombre, rol)
// - ejercicios (id, nombre)
// - rm_historico (id, alumno_id, ejercicio_id, peso_kg, repeticiones, rm_estimado, fecha, registrado_por)
// - rm_actual (alumno_id, ejercicio_id, rm_estimado, actualizado_en) → PK compuesta (alumno_id, ejercicio_id)
//   Usar upsert con onConflict: "alumno_id,ejercicio_id"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Alumno = { id: string; nombre: string };
type Ejercicio = { id: string; nombre: string };

type FilaRM = {
  ejercicio_id: string;
  peso_kg: string;
  repeticiones: string;
};

// Fórmula de Epley: 1RM = peso × (1 + reps / 30)
function calcularRM(peso: number, reps: number): number {
  if (reps === 1) return peso;
  return Math.round(peso * (1 + reps / 30) * 10) / 10;
}

export default function RealizarEvaluacionRM() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [alumnoId, setAlumnoId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");
  const [filas, setFilas] = useState<FilaRM[]>([{ ejercicio_id: "", peso_kg: "", repeticiones: "" }]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function cargarDatos() {
      const { data: sessionData } = await supabase.auth.getSession();
      setUserId(sessionData.session?.user.id ?? null);

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

  function agregarFila() {
    setFilas((prev) => [...prev, { ejercicio_id: "", peso_kg: "", repeticiones: "" }]);
  }

  function eliminarFila(idx: number) {
    setFilas((prev) => prev.filter((_, i) => i !== idx));
  }

  function actualizarFila(idx: number, campo: keyof FilaRM, valor: string) {
    setFilas((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f))
    );
  }

  const filasValidas = filas.filter(
    (f) => f.ejercicio_id && f.peso_kg && f.repeticiones
  );

  const puedeGuardar = alumnoId && filasValidas.length > 0;

  async function guardar() {
    if (!puedeGuardar) return;
    setGuardando(true);

    const registros = filasValidas.map((f) => {
      const peso = parseFloat(f.peso_kg);
      const reps = parseInt(f.repeticiones);
      return {
        alumno_id: alumnoId,
        ejercicio_id: f.ejercicio_id,
        peso_kg: peso,
        repeticiones: reps,
        rm_estimado: calcularRM(peso, reps),
        fecha,
        registrado_por: userId,
      };
    });

    // 1. Insertar en rm_historico
    const { error: errorHistorico } = await supabase
      .from("rm_historico")
      .insert(registros);

    if (errorHistorico) {
      alert("Error al guardar historial: " + errorHistorico.message);
      setGuardando(false);
      return;
    }

    // 2. Upsert en rm_actual (actualiza solo si el nuevo RM es mayor, o siempre según tu lógica)
    const upserts = registros.map((r) => ({
      alumno_id: r.alumno_id,
      ejercicio_id: r.ejercicio_id,
      rm_estimado: r.rm_estimado,
      actualizado_en: new Date().toISOString(),
    }));

    const { error: errorActual } = await supabase
      .from("rm_actual")
      .upsert(upserts, { onConflict: "alumno_id,ejercicio_id" });

    if (errorActual) {
      alert("Historial guardado, pero error al actualizar RM actual: " + errorActual.message);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    setExito(true);
  }

  if (loading) {
    return <main className="min-h-screen bg-zinc-950 text-white p-8">Cargando...</main>;
  }

  if (exito) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">✅</p>
          <h2 className="text-2xl font-bold">Test RM registrado</h2>
          <p className="text-zinc-400 mt-2">
            El historial y el RM actual del alumno fueron actualizados.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => { setExito(false); setFilas([{ ejercicio_id: "", peso_kg: "", repeticiones: "" }]); setAlumnoId(""); }}
              className="bg-white text-zinc-950 font-semibold px-5 py-2 rounded-lg hover:bg-zinc-200 transition"
            >
              Nueva evaluación
            </button>
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
      <div className="max-w-3xl mx-auto">

        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
          <a href="/" className="hover:text-zinc-300 transition">Panel del profe</a>
          <span>/</span>
          <a href="/evaluaciones" className="hover:text-zinc-300 transition">Evaluaciones</a>
          <span>/</span>
          <span className="text-zinc-200">Realizar Test RM</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-bold">⚡ Realizar Test RM</h1>
          <p className="text-zinc-400 mt-2">
            Ingresá peso y repeticiones por ejercicio. El RM estimado se calcula con la fórmula de Epley
            y actualiza el historial y el RM actual del alumno.
          </p>
        </header>

        <div className="space-y-6">

          {/* Alumno + Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          {/* Tabla de ejercicios */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-zinc-400">Ejercicios *</label>
              <button
                type="button"
                onClick={agregarFila}
                className="text-sm text-zinc-400 hover:text-white transition flex items-center gap-1"
              >
                + Agregar ejercicio
              </button>
            </div>

            {/* Header */}
            <div className="grid grid-cols-[1fr_110px_110px_120px_36px] gap-2 mb-2 px-1">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Ejercicio</span>
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Peso (kg)</span>
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Reps</span>
              <span className="text-xs text-zinc-500 uppercase tracking-wide">1RM est.</span>
              <span />
            </div>

            <div className="space-y-2">
              {filas.map((fila, idx) => {
                const peso = parseFloat(fila.peso_kg);
                const reps = parseInt(fila.repeticiones);
                const rm = !isNaN(peso) && !isNaN(reps) && reps > 0 ? calcularRM(peso, reps) : null;

                return (
                  <div key={idx} className="grid grid-cols-[1fr_110px_110px_120px_36px] gap-2 items-center">
                    <select
                      value={fila.ejercicio_id}
                      onChange={(e) => actualizarFila(idx, "ejercicio_id", e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500"
                    >
                      <option value="">Seleccioná</option>
                      {ejercicios.map((ej) => (
                        <option key={ej.id} value={ej.id}>{ej.nombre}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="ej: 80"
                      value={fila.peso_kg}
                      onChange={(e) => actualizarFila(idx, "peso_kg", e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500"
                    />
                    <input
                      type="number"
                      min="1"
                      max="30"
                      placeholder="ej: 5"
                      value={fila.repeticiones}
                      onChange={(e) => actualizarFila(idx, "repeticiones", e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500"
                    />
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-center">
                      {rm !== null ? (
                        <span className="text-emerald-400 font-semibold">{rm} kg</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarFila(idx)}
                      disabled={filas.length === 1}
                      className="text-zinc-600 hover:text-red-400 transition disabled:opacity-20 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Info fórmula */}
            <p className="text-xs text-zinc-600 mt-3">
              Fórmula de Epley: 1RM = Peso × (1 + Reps / 30). Para 1 rep, el valor es el peso directo.
            </p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones del test, condición del alumno..."
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          {/* Resumen */}
          {filasValidas.length > 0 && (
            <div className="bg-zinc-900 border border-emerald-900/50 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                Resumen — se guardarán {filasValidas.length} resultado{filasValidas.length > 1 ? "s" : ""}
              </p>
              <ul className="space-y-1">
                {filasValidas.map((f, i) => {
                  const peso = parseFloat(f.peso_kg);
                  const reps = parseInt(f.repeticiones);
                  const rm = calcularRM(peso, reps);
                  const nombre = ejercicios.find((e) => e.id === f.ejercicio_id)?.nombre ?? f.ejercicio_id;
                  return (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-zinc-300">{nombre}</span>
                      <span className="text-zinc-500">
                        {peso} kg × {reps} reps →{" "}
                        <span className="text-emerald-400 font-semibold">{rm} kg RM</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={guardar}
              disabled={!puedeGuardar || guardando}
              className="bg-white text-zinc-950 font-semibold px-6 py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {guardando ? "Guardando..." : "Guardar evaluación"}
            </button>
            <a href="/evaluaciones" className="border border-zinc-700 text-zinc-300 px-6 py-3 rounded-lg hover:bg-zinc-800 transition">
              Cancelar
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

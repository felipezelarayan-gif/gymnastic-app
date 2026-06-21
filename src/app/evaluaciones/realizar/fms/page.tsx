"use client";

// Tablas asumidas:
// - profiles (id, nombre, rol)
// - evaluaciones_fms (
//     id, alumno_id, fecha, notas, estado,
//     sentadilla_profunda, paso_valla, estocada_linea,
//     movilidad_hombro, elevacion_pierna, estabilidad_tronco,
//     estabilidad_rotatoria, total, registrado_por
//   )

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";

type Alumno = { id: string; nombre: string };

const PATRONES = [
  {
    key: "sentadilla_profunda",
    nombre: "Sentadilla profunda",
    descripcion: "Evalúa movilidad bilateral simétrica de caderas, rodillas y tobillos.",
  },
  {
    key: "paso_valla",
    nombre: "Paso de valla",
    descripcion: "Evalúa la mecánica de paso y estabilidad del núcleo en postura unipodal.",
  },
  {
    key: "estocada_linea",
    nombre: "Estocada en línea",
    descripcion: "Evalúa flexibilidad, estabilidad y función en un patrón de desaceleración.",
  },
  {
    key: "movilidad_hombro",
    nombre: "Movilidad de hombro",
    descripcion: "Evalúa amplitud bilateral de movimiento del hombro combinando rotación y aducción/abducción.",
  },
  {
    key: "elevacion_pierna",
    nombre: "Elevación activa de pierna",
    descripcion: "Evalúa la flexibilidad activa del isquiosural y la estabilidad del core.",
  },
  {
    key: "estabilidad_tronco",
    nombre: "Estabilidad de tronco (flexión)",
    descripcion: "Evalúa la capacidad de estabilizar la columna en un patrón de empuje simétrico.",
  },
  {
    key: "estabilidad_rotatoria",
    nombre: "Estabilidad rotatoria",
    descripcion: "Evalúa la estabilidad multiplanar del tronco durante movimientos combinados de extremidades.",
  },
] as const;

type PatronKey = typeof PATRONES[number]["key"];

type Puntajes = Record<PatronKey, number | null>;

const PUNTAJE_LABELS: Record<number, string> = {
  0: "Dolor",
  1: "No pudo",
  2: "Con compensación",
  3: "Correcto",
};

const PUNTAJE_COLORS: Record<number, string> = {
  0: "bg-red-900/40 border-red-700 text-red-400",
  1: "bg-orange-900/40 border-orange-700 text-orange-400",
  2: "bg-yellow-900/40 border-yellow-700 text-yellow-400",
  3: "bg-emerald-900/40 border-emerald-700 text-emerald-400",
};

export default function RealizarFMS() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnoId, setAlumnoId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");
  const [puntajes, setPuntajes] = useState<Puntajes>({
    sentadilla_profunda: null,
    paso_valla: null,
    estocada_linea: null,
    movilidad_hombro: null,
    elevacion_pierna: null,
    estabilidad_tronco: null,
    estabilidad_rotatoria: null,
  });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function cargarDatos() {
      const { data: sessionData } = await supabase.auth.getSession();
      setUserId(sessionData.session?.user.id ?? null);

      const { data } = await supabase
        .from("profiles")
        .select("id, nombre")
        .eq("rol", "alumno")
        .order("nombre");
      if (data) setAlumnos(data);
      setLoading(false);
    }
    cargarDatos();
  }, []);

  function setPuntaje(key: PatronKey, valor: number) {
    setPuntajes((prev) => ({
      ...prev,
      [key]: prev[key] === valor ? null : valor, // toggle si ya estaba seleccionado
    }));
  }

  const valoresCompletos = PATRONES.every((p) => puntajes[p.key] !== null);
  const total = valoresCompletos
    ? PATRONES.reduce((sum, p) => sum + (puntajes[p.key] ?? 0), 0)
    : null;

  function totalColor(t: number) {
    if (t <= 7) return "text-red-400";
    if (t <= 13) return "text-yellow-400";
    return "text-emerald-400";
  }

  function totalLabel(t: number) {
    if (t <= 7) return "Alto riesgo de lesión";
    if (t <= 13) return "Disfunciones a trabajar";
    return "Movimiento funcional adecuado";
  }

  async function guardar() {
    if (!alumnoId || !valoresCompletos) return;
    setGuardando(true);

    const { error } = await supabase.from("evaluaciones_fms").insert({
      alumno_id: alumnoId,
      fecha,
      notas,
      ...puntajes,
      total,
      estado: "completada",
      registrado_por: userId,
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
          <h2 className="text-2xl font-bold">FMS registrado</h2>
          {total !== null && (
            <p className={`text-xl font-bold mt-1 ${totalColor(total)}`}>
              {total}/21 — {totalLabel(total)}
            </p>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => {
                setExito(false);
                setAlumnoId("");
                setPuntajes({
                  sentadilla_profunda: null, paso_valla: null, estocada_linea: null,
                  movilidad_hombro: null, elevacion_pierna: null, estabilidad_tronco: null,
                  estabilidad_rotatoria: null,
                });
              }}
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

  const completados = PATRONES.filter((p) => puntajes[p.key] !== null).length;

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-3xl mx-auto">

        <div className="mb-6">
          <BackButton />
        </div>

        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">🎯 Realizar Test FMS</h1>
              <p className="text-zinc-400 mt-2">
                Puntuá cada patrón de movimiento del 0 al 3.
              </p>
            </div>
            {/* Progreso */}
            <div className="text-right shrink-0 ml-4">
              <p className="text-2xl font-bold">{completados}/7</p>
              <p className="text-xs text-zinc-500">completados</p>
            </div>
          </div>
          {/* Barra de progreso */}
          <div className="mt-4 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${(completados / 7) * 100}%` }}
            />
          </div>
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

          {/* Patrones */}
          <div className="space-y-4">
            {PATRONES.map((patron, idx) => {
              const puntajeActual = puntajes[patron.key];
              return (
                <div key={patron.key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-zinc-500 mb-0.5">Patrón {idx + 1}</p>
                      <h3 className="font-semibold text-white">{patron.nombre}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{patron.descripcion}</p>
                    </div>
                    {puntajeActual !== null && (
                      <span className={`ml-4 shrink-0 text-sm font-bold px-3 py-1 rounded-full border ${PUNTAJE_COLORS[puntajeActual]}`}>
                        {puntajeActual}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPuntaje(patron.key, val)}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition ${
                          puntajeActual === val
                            ? PUNTAJE_COLORS[val]
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                        }`}
                      >
                        <span className="block text-lg leading-none">{val}</span>
                        <span className="block text-[10px] mt-0.5 opacity-70">{PUNTAJE_LABELS[val]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          {total !== null && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Puntaje total</p>
              <p className={`text-5xl font-bold ${totalColor(total)}`}>{total}<span className="text-2xl text-zinc-600">/21</span></p>
              <p className={`mt-2 text-sm font-medium ${totalColor(total)}`}>{totalLabel(total)}</p>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones, compensaciones observadas, recomendaciones..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={guardar}
              disabled={!alumnoId || !valoresCompletos || guardando}
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

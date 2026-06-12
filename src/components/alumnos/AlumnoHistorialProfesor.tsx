"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Alumno = { id: string; nombre: string; apellido?: string | null };
type Rutina = { id: string; nombre?: string | null };
type Registro = {
  id: string;
  alumno_id: string;
  rutina_id?: string | null;
  rutina_asignacion_id?: string | null;
  rutina_ejercicio_id?: string | null;
  entrada_calor_id?: string | null;
  ejercicio_id?: string | null;
  nombre_ejercicio?: string | null;
  peso_kg?: number | string | null;
  repeticiones?: number | string | null;
  rpe?: number | string | null;
  rir?: number | string | null;
  rm_calculado?: number | string | null;
  completado?: boolean | null;
  created_at?: string | null;
};
type RutinaAsignada = { id: string; alumno_id: string; rutina_id: string; fecha_completada?: string | null; fecha_asignacion?: string | null; completada?: boolean | null; rutinas?: Rutina | Rutina[] | null };

type HistorialItem = {
  asignacionId: string;
  rutinaId: string;
  nombre: string;
  fecha?: string | null;
  ejercicios: number;
  rpePromedio: number | null;
  registros: Registro[];
};

const card = "bg-zinc-900 border border-zinc-800 rounded-2xl p-5";

function normalizarRutina(rutinas?: Rutina | Rutina[] | null) {
  if (Array.isArray(rutinas)) return rutinas[0] || null;
  return rutinas || null;
}

function fecha(fecha?: string | null) {
  return fecha ? new Date(fecha).toLocaleDateString("es-AR") : "Sin fecha";
}

function numero(valor?: number | string | null) {
  if (valor === null || valor === undefined || valor === "") return "-";
  return Number(valor).toFixed(1).replace(".0", "");
}

export default function AlumnoHistorialProfesor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [asignaciones, setAsignaciones] = useState<RutinaAsignada[]>([]);
  const [mostrar, setMostrar] = useState(5);
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});

  useEffect(() => { cargarTodo(); }, [id]);

  async function cargarTodo() {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { window.location.href = "/login"; return; }

    const { data: profile } = await supabase.from("profiles").select("rol").eq("id", sessionData.session.user.id).single();
    if (!profile || profile.rol !== "profe") { window.location.href = "/alumno"; return; }

    const { data: alumnoData } = await supabase.from("alumnos").select("id,nombre,apellido").eq("id", id).single();
    const { data: registrosData } = await supabase.from("registros_entrenamiento").select("id,alumno_id,rutina_id,rutina_asignacion_id,rutina_ejercicio_id,entrada_calor_id,ejercicio_id,nombre_ejercicio,peso_kg,repeticiones,rpe,rir,rm_calculado,completado,created_at").eq("alumno_id", id).eq("completado", true).order("created_at", { ascending: false });
    const { data: asignacionesData } = await supabase
      .from("rutina_asignaciones")
      .select("id,alumno_id,rutina_id,fecha_completada,fecha_asignacion,completada,rutinas(id,nombre)")
      .eq("alumno_id", id)
      .order("fecha_completada", { ascending: false });

    setAlumno(alumnoData as Alumno);
    setRegistros((registrosData || []) as Registro[]);
    setAsignaciones((asignacionesData || []) as RutinaAsignada[]);
    setLoading(false);
  }

  const historial = useMemo<HistorialItem[]>(() => {
    return asignaciones
      .filter((asignacion) => asignacion.completada)
      .map((asignacion) => {
        const registrosAsignacion = registros.filter(
          (registro) => registro.rutina_asignacion_id === asignacion.id
        );

        const rutina = normalizarRutina(asignacion.rutinas);
        const rpes = registrosAsignacion
          .map((registro) => Number(registro.rpe))
          .filter((valor) => !Number.isNaN(valor) && valor > 0);
        const rpePromedio = rpes.length
          ? Number((rpes.reduce((total, valor) => total + valor, 0) / rpes.length).toFixed(1))
          : null;
        const fechaRegistro = registrosAsignacion[0]?.created_at;

        return {
          asignacionId: asignacion.id,
          rutinaId: asignacion.rutina_id,
          nombre: rutina?.nombre || "Rutina sin nombre",
          fecha: asignacion.fecha_completada || fechaRegistro,
          ejercicios: registrosAsignacion.length,
          rpePromedio,
          registros: registrosAsignacion,
        };
      });
  }, [registros, asignaciones]);

  if (loading) return <main className="min-h-screen bg-zinc-950 text-white p-6">Cargando historial...</main>;

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-5xl mx-auto">
        <a href={`/alumnos/${id}`} className="text-zinc-400 hover:text-white">← Volver al perfil</a>

        <header className="mt-6 mb-5">
          <h1 className="text-3xl font-bold">Historial de {alumno?.nombre} {alumno?.apellido || ""}</h1>
          <p className="text-zinc-400 mt-1">Entrenamientos completados por el alumno.</p>
        </header>

        <section className={card}>
          {historial.length === 0 ? <p className="text-zinc-400">Este alumno todavía no tiene entrenamientos completados.</p> : (
            <div className="space-y-3">
              {historial.slice(0, mostrar).map((item) => (
                <div key={item.asignacionId} className="rounded-xl border border-zinc-800 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-semibold">{item.nombre}</h3>
                      <p className="text-sm text-zinc-400 mt-1">Fecha: {fecha(item.fecha)}</p>
                      <p className="text-sm text-zinc-400">Ejercicios completados: {item.ejercicios}</p>
                      <p className="text-sm text-zinc-400">RPE promedio: {item.rpePromedio || "Sin cargar"}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setAbiertas((actual) => ({
                          ...actual,
                          [item.asignacionId]: !actual[item.asignacionId],
                        }))
                      }
                      className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      {abiertas[item.asignacionId] ? "Ocultar rutina" : "Ver rutina completa"}
                    </button>
                  </div>

                  {abiertas[item.asignacionId] && (
                    <div className="mt-4 border-t border-zinc-800 pt-4">
                      {item.registros.length === 0 ? (
                        <p className="text-sm text-zinc-500">No hay registros guardados para esta rutina.</p>
                      ) : (
                        <div className="space-y-2">
                          {item.registros.map((registro) => (
                            <div
                              key={registro.id}
                              className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
                            >
                              <p className="font-semibold text-sm">
                                {registro.nombre_ejercicio || "Ejercicio"}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
                                {registro.peso_kg !== null && registro.peso_kg !== undefined && (
                                  <span className="rounded-full bg-zinc-800 px-3 py-1">
                                    Peso: {numero(registro.peso_kg)} kg
                                  </span>
                                )}

                                {registro.repeticiones !== null && registro.repeticiones !== undefined && (
                                  <span className="rounded-full bg-zinc-800 px-3 py-1">
                                    Reps: {numero(registro.repeticiones)}
                                  </span>
                                )}

                                {registro.rm_calculado !== null && registro.rm_calculado !== undefined && (
                                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400">
                                    RM: {numero(registro.rm_calculado)} kg
                                  </span>
                                )}

                                {registro.rpe !== null && registro.rpe !== undefined && (
                                  <span className="rounded-full bg-zinc-800 px-3 py-1">
                                    RPE: {numero(registro.rpe)}
                                  </span>
                                )}

                                {registro.rir !== null && registro.rir !== undefined && (
                                  <span className="rounded-full bg-zinc-800 px-3 py-1">
                                    RIR: {numero(registro.rir)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {mostrar < historial.length && <button onClick={() => setMostrar(mostrar + 5)} className="w-full rounded-xl border border-zinc-700 py-3 text-zinc-300 hover:bg-zinc-800">Mostrar más</button>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

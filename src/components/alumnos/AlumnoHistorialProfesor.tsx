"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Alumno = { id: string; nombre: string; apellido?: string | null };
type Rutina = { id: string; nombre?: string | null };
type Registro = { id: string; alumno_id: string; rutina_id?: string | null; rpe?: number | string | null; completado?: boolean | null; created_at?: string | null; nombre_ejercicio?: string | null };
type RutinaAsignada = { id: string; alumno_id: string; rutina_id: string; fecha_completada?: string | null; fecha_asignacion?: string | null; completada?: boolean | null; rutinas?: Rutina | Rutina[] | null };

const card = "bg-zinc-900 border border-zinc-800 rounded-2xl p-5";

function normalizarRutina(rutinas?: Rutina | Rutina[] | null) {
  if (Array.isArray(rutinas)) return rutinas[0] || null;
  return rutinas || null;
}

function fecha(fecha?: string | null) {
  return fecha ? new Date(fecha).toLocaleDateString("es-AR") : "Sin fecha";
}

export default function AlumnoHistorialProfesor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [asignaciones, setAsignaciones] = useState<RutinaAsignada[]>([]);
  const [mostrar, setMostrar] = useState(5);

  useEffect(() => { cargarTodo(); }, [id]);

  async function cargarTodo() {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { window.location.href = "/login"; return; }

    const { data: profile } = await supabase.from("profiles").select("rol").eq("id", sessionData.session.user.id).single();
    if (!profile || profile.rol !== "profe") { window.location.href = "/alumno"; return; }

    const { data: alumnoData } = await supabase.from("alumnos").select("id,nombre,apellido").eq("id", id).single();
    const { data: registrosData } = await supabase.from("registros_entrenamiento").select("*").eq("alumno_id", id).eq("completado", true).order("created_at", { ascending: false });
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

  const historial = useMemo(() => {
  const rutinasIds = asignaciones
    .filter((a) => a.completada)
    .map((a) => a.rutina_id);

    return rutinasIds.map((rutinaId) => {
      const registrosRutina = registros.filter((r) => r.rutina_id === rutinaId);
      const asignacion = asignaciones.find(
  (a) => a.rutina_id === rutinaId && a.completada
);
      const rutina = normalizarRutina(asignacion?.rutinas);
      const rpes = registrosRutina.map((r) => Number(r.rpe)).filter((v) => !Number.isNaN(v) && v > 0);
      const rpePromedio = rpes.length ? Number((rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1)) : null;
      const fechaRegistro = registrosRutina[0]?.created_at;

      return {
        rutinaId,
        nombre: rutina?.nombre || "Rutina sin nombre",
        fecha: asignacion?.fecha_completada || fechaRegistro,
        ejercicios: registrosRutina.length,
        rpePromedio,
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
                <div key={item.rutinaId} className="rounded-xl border border-zinc-800 p-4">
                  <h3 className="font-semibold">{item.nombre}</h3>
                  <p className="text-sm text-zinc-400 mt-1">Fecha: {fecha(item.fecha)}</p>
                  <p className="text-sm text-zinc-400">Ejercicios completados: {item.ejercicios}</p>
                  <p className="text-sm text-zinc-400">RPE promedio: {item.rpePromedio || "Sin cargar"}</p>
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

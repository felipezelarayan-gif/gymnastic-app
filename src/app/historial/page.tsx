"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";

type Periodo = "dia" | "semana" | "mes" | "anio";

type Alumno = {

  id: string;

  nombre: string;

  apellido?: string | null;

  email?: string | null;

};

type RegistroEntrenamiento = {

  id: string;

  alumno_id: string;

  rutina_id?: string | null;

  nombre_ejercicio?: string | null;

  completado?: boolean | null;

  created_at?: string | null;

};

type RutinaAsignacion = {

  id: string;

  alumno_id: string;

  rutina_id: string;

  completada?: boolean | null;

  fecha_completada?: string | null;

  created_at?: string | null;

};

type AlumnoResumen = {

  alumno: Alumno;

  rutinasCompletadas: number;

  ejerciciosCompletados: number;

  ultimoEntrenamiento: string | null;

};

const periodos: { id: Periodo; label: string }[] = [

  { id: "dia", label: "Hoy" },

  { id: "semana", label: "Semana" },

  { id: "mes", label: "Mes" },

  { id: "anio", label: "Año" },

];

function fechaInicioPeriodo(periodo: Periodo) {

  const fecha = new Date();

  if (periodo === "dia") {

    fecha.setHours(0, 0, 0, 0);

    return fecha;

  }

  if (periodo === "semana") {

    fecha.setDate(fecha.getDate() - 7);

    fecha.setHours(0, 0, 0, 0);

    return fecha;

  }

  if (periodo === "mes") {

    fecha.setMonth(fecha.getMonth() - 1);

    fecha.setHours(0, 0, 0, 0);

    return fecha;

  }

  fecha.setFullYear(fecha.getFullYear() - 1);

  fecha.setHours(0, 0, 0, 0);

  return fecha;

}

function estaDentroPeriodo(fechaTexto: string | null | undefined, periodo: Periodo) {

  if (!fechaTexto) return false;

  const fecha = new Date(fechaTexto);

  const inicio = fechaInicioPeriodo(periodo);

  return fecha >= inicio;

}

function formatearFecha(fechaTexto: string | null | undefined) {

  if (!fechaTexto) return "Sin actividad";

  return new Date(fechaTexto).toLocaleDateString("es-AR", {

    day: "2-digit",

    month: "2-digit",

    year: "numeric",

  });

}

export default function HistorialPage() {

  const [loading, setLoading] = useState(true);

  const [periodo, setPeriodo] = useState<Periodo>("semana");

  const [alumnos, setAlumnos] = useState<Alumno[]>([]);

  const [registros, setRegistros] = useState<RegistroEntrenamiento[]>([]);

  const [asignaciones, setAsignaciones] = useState<RutinaAsignacion[]>([]);

  const [mostrarTodos, setMostrarTodos] = useState(false);

  useEffect(() => {

    cargarDatos();

  }, []);

  async function cargarDatos() {

    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {

      window.location.href = "/login";

      return;

    }

    const user = sessionData.session.user;

    const { data: profile } = await supabase

      .from("profiles")

      .select("rol")

      .eq("id", user.id)

      .single();

    if (!profile || profile.rol !== "profe") {

      window.location.href = "/";

      return;

    }

    const { data: alumnosData, error: alumnosError } = await supabase

      .from("alumnos")

      .select("id,nombre,apellido,email")

      .order("nombre", { ascending: true });

    if (alumnosError) {

      alert(alumnosError.message);

      setLoading(false);

      return;

    }

    const { data: registrosData, error: registrosError } = await supabase

      .from("registros_entrenamiento")

      .select("id,alumno_id,rutina_id,nombre_ejercicio,completado,created_at")

      .eq("completado", true)

      .order("created_at", { ascending: false });

    if (registrosError) {

      alert(registrosError.message);

      setLoading(false);

      return;

    }

    const { data: asignacionesData, error: asignacionesError } = await supabase

      .from("rutina_asignaciones")

      .select("id,alumno_id,rutina_id,completada,fecha_completada,created_at")

      .order("created_at", { ascending: false });

    if (asignacionesError) {

      alert(asignacionesError.message);

      setLoading(false);

      return;

    }

    setAlumnos(alumnosData || []);

    setRegistros(registrosData || []);

    setAsignaciones(asignacionesData || []);

    setLoading(false);

  }

  const registrosPeriodo = useMemo(() => {

    return registros.filter((registro) =>

      estaDentroPeriodo(registro.created_at, periodo)

    );

  }, [registros, periodo]);

  const asignacionesPeriodo = useMemo(() => {

    return asignaciones.filter((asignacion) =>

      estaDentroPeriodo(asignacion.created_at, periodo)

    );

  }, [asignaciones, periodo]);

  const asignacionesCompletadasPeriodo = useMemo(() => {

    return asignaciones.filter(

      (asignacion) =>

        asignacion.completada &&

        estaDentroPeriodo(asignacion.fecha_completada, periodo)

    );

  }, [asignaciones, periodo]);

  const resumenAlumnos: AlumnoResumen[] = useMemo(() => {

    return alumnos

      .map((alumno) => {

        const registrosAlumno = registros.filter(

          (registro) => registro.alumno_id === alumno.id

        );

        const asignacionesCompletadasAlumno = asignaciones.filter(

          (asignacion) =>

            asignacion.alumno_id === alumno.id && asignacion.completada

        );

        const ultimoRegistro = registrosAlumno

          .filter((registro) => registro.created_at)

          .sort(

            (a, b) =>

              new Date(b.created_at || "").getTime() -

              new Date(a.created_at || "").getTime()

          )[0];

        return {

          alumno,

          rutinasCompletadas: asignacionesCompletadasAlumno.length,

          ejerciciosCompletados: registrosAlumno.length,

          ultimoEntrenamiento: ultimoRegistro?.created_at || null,

        };

      })

      .sort((a, b) => {

        if (b.rutinasCompletadas !== a.rutinasCompletadas) {

          return b.rutinasCompletadas - a.rutinasCompletadas;

        }

        return b.ejerciciosCompletados - a.ejerciciosCompletados;

      });

  }, [alumnos, registros, asignaciones]);

  const top3 = resumenAlumnos.slice(0, 3);

  const listaMostrada = mostrarTodos ? resumenAlumnos : top3;

  const alumnosActivos = useMemo(() => {

    const ids = new Set(registrosPeriodo.map((registro) => registro.alumno_id));

    return ids.size;

  }, [registrosPeriodo]);

  const porcentajeRutinasCompletadas = useMemo(() => {

    if (asignacionesPeriodo.length === 0) return 0;

    return Math.round(

      (asignacionesCompletadasPeriodo.length / asignacionesPeriodo.length) * 100

    );

  }, [asignacionesPeriodo, asignacionesCompletadasPeriodo]);

  const ultimaActividad = registros[0]?.created_at || null;

  if (loading) {

    return (

      <main className="min-h-screen bg-zinc-950 text-white p-6">

        Cargando historial...

      </main>

    );

  }

  return (

    <main className="min-h-screen bg-zinc-950 text-white p-6">

      <div className="max-w-6xl mx-auto">

        <a href="/" className="text-zinc-400 hover:text-white">

          ← Volver al panel

        </a>

        <header className="mt-6 mb-6">

          <h1 className="text-3xl font-bold">📈 Historial</h1>

          <p className="text-zinc-400 mt-2">

            Estadísticas generales, mejores alumnos y actividad reciente.

          </p>

        </header>

        <div className="flex flex-wrap gap-2 mb-6">

          {periodos.map((item) => (

            <button

              key={item.id}

              type="button"

              onClick={() => setPeriodo(item.id)}

              className={`rounded-xl px-4 py-2 text-sm font-semibold border ${

                periodo === item.id

                  ? "bg-emerald-500 text-white border-emerald-500"

                  : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800"

              }`}

            >

              {item.label}

            </button>

          ))}

        </div>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-zinc-400 text-sm">Alumnos totales</p>

            <p className="text-3xl font-bold mt-2">{alumnos.length}</p>

          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-zinc-400 text-sm">Alumnos activos</p>

            <p className="text-3xl font-bold mt-2">{alumnosActivos}</p>

          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-zinc-400 text-sm">% rutinas completadas</p>

            <p className="text-3xl font-bold mt-2">

              {porcentajeRutinasCompletadas}%

            </p>

          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-zinc-400 text-sm">Última actividad</p>

            <p className="text-2xl font-bold mt-2">

              {formatearFecha(ultimaActividad)}

            </p>

          </div>

        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-zinc-400 text-sm">Rutinas asignadas</p>

            <p className="text-3xl font-bold mt-2">

              {asignacionesPeriodo.length}

            </p>

          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-zinc-400 text-sm">Rutinas completadas</p>

            <p className="text-3xl font-bold mt-2">

              {asignacionesCompletadasPeriodo.length}

            </p>

          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">

            <p className="text-zinc-400 text-sm">Ejercicios completados</p>

            <p className="text-3xl font-bold mt-2">

              {registrosPeriodo.length}

            </p>

          </div>

        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mt-6">

          <div className="flex items-center justify-between gap-3 mb-4">

            <div>

              <h2 className="text-2xl font-bold">🏆 Mejores alumnos</h2>

              <p className="text-zinc-400 text-sm mt-1">

                Ordenados por rutinas completadas y ejercicios registrados.

              </p>

            </div>

            <button

              type="button"

              onClick={() => setMostrarTodos(!mostrarTodos)}

              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"

            >

              {mostrarTodos ? "Ver top 3" : "Ver todos"}

            </button>

          </div>

          {listaMostrada.length === 0 ? (

            <p className="text-zinc-500">Todavía no hay datos de alumnos.</p>

          ) : (

            <div className="space-y-3">

              {listaMostrada.map((item, index) => (

                <div

                  key={item.alumno.id}

                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"

                >

                  <div className="flex items-start justify-between gap-3">

                    <div>

                      <h3 className="text-lg font-semibold">

                        {index + 1}. {item.alumno.nombre}{" "}

                        {item.alumno.apellido || ""}

                      </h3>

                      <p className="text-zinc-500 text-sm">

                        {item.alumno.email || "Sin email"}

                      </p>

                    </div>

                    {index === 0 && (

                      <span className="rounded-full bg-yellow-500/10 text-yellow-400 px-3 py-1 text-sm font-semibold">

                        🥇 Top

                      </span>

                    )}

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">

                    <div className="rounded-xl bg-zinc-900 p-3">

                      <p className="text-zinc-400 text-sm">

                        Rutinas completadas

                      </p>

                      <p className="text-2xl font-bold">

                        {item.rutinasCompletadas}

                      </p>

                    </div>

                    <div className="rounded-xl bg-zinc-900 p-3">

                      <p className="text-zinc-400 text-sm">

                        Ejercicios completados

                      </p>

                      <p className="text-2xl font-bold">

                        {item.ejerciciosCompletados}

                      </p>

                    </div>

                    <div className="rounded-xl bg-zinc-900 p-3">

                      <p className="text-zinc-400 text-sm">

                        Último entrenamiento

                      </p>

                      <p className="text-lg font-bold">

                        {formatearFecha(item.ultimoEntrenamiento)}

                      </p>

                    </div>

                  </div>

                  <div className="mt-4">

                    <a

                      href={`/alumnos/${item.alumno.id}`}

                      className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold"

                    >

                      Ver alumno →

                    </a>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

      </div>

    </main>

  );

}
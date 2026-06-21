"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";

type Profile = {
  nombre: string;
  rol: string;
  foto_url?: string | null;
};

type Alumno = {
  id: string;
  nombre: string;
};

type EvaluacionAlumno = {
  id: string;
  alumno_id: string;
  estado: string | null;
  fecha_realizacion: string | null;
  fecha_asignacion: string | null;
  created_at: string | null;
  nombre: string | null;
  observaciones: string | null;
  cantidad_ejercicios: number;
};

const EVALUACIONES_POR_PAGINA = 5;

export default function EvaluacionesPorAlumnoPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [buscandoAlumnos, setBuscandoAlumnos] = useState(false);
  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [evaluacionesAlumno, setEvaluacionesAlumno] = useState<EvaluacionAlumno[]>([]);
  const [totalEvaluaciones, setTotalEvaluaciones] = useState(0);
  const [cargandoEvaluaciones, setCargandoEvaluaciones] = useState(false);
  const [paginaEvaluaciones, setPaginaEvaluaciones] = useState(1);
  const [borrandoEvaluacionId, setBorrandoEvaluacionId] = useState<string | null>(null);

  useEffect(() => {
    async function cargarInicial() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const user = sessionData.session.user;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("nombre, rol, foto_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData?.rol === "alumno") {
        window.location.href = "/alumno";
        return;
      }

      if (profileData) setProfile(profileData);

      setLoading(false);
    }

    cargarInicial();
  }, []);

  const totalPaginasEvaluaciones = Math.max(
    1,
    Math.ceil(totalEvaluaciones / EVALUACIONES_POR_PAGINA)
  );

  function formatearFechaEvaluacion(fecha: string | null) {
    if (!fecha) return "Sin fecha";

    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(fecha));
  }

  async function buscarAlumnos(valor: string) {
    setBusquedaAlumno(valor);
    setAlumnoSeleccionado(null);
    setEvaluacionesAlumno([]);
    setTotalEvaluaciones(0);
    setPaginaEvaluaciones(1);

    const busqueda = valor.trim();

    if (busqueda.length < 2) {
      setAlumnos([]);
      return;
    }

    setBuscandoAlumnos(true);

    const { data, error } = await supabase
      .from("alumnos")
      .select("id, nombre")
      .ilike("nombre", `%${busqueda}%`)
      .order("nombre", { ascending: true })
      .limit(20);

    setBuscandoAlumnos(false);

    if (error) {
      alert(error.message);
      return;
    }

    setAlumnos(data || []);
  }

  async function cargarEvaluacionesAlumno(alumno: Alumno, pagina = 1) {
    setAlumnoSeleccionado(alumno);
    setPaginaEvaluaciones(pagina);
    setCargandoEvaluaciones(true);

    const desde = (pagina - 1) * EVALUACIONES_POR_PAGINA;
    const hasta = desde + EVALUACIONES_POR_PAGINA - 1;

    const {
      data: evaluacionesData,
      error: evaluacionesError,
      count,
    } = await supabase
      .from("evaluaciones_rm")
      .select("id, alumno_id, estado, fecha_realizacion, fecha_asignacion, created_at, nombre, observaciones", {
        count: "exact",
      })
      .eq("alumno_id", alumno.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(desde, hasta);

    if (evaluacionesError) {
      alert(evaluacionesError.message);
      setCargandoEvaluaciones(false);
      return;
    }

    const evaluacionesBase = evaluacionesData || [];
    const evaluacionIds = evaluacionesBase.map((evaluacion) => evaluacion.id);
    const cantidadPorEvaluacion = new Map<string, number>();

    if (evaluacionIds.length > 0) {
      const { data: resultadosData, error: resultadosError } = await supabase
        .from("evaluaciones_rm_resultados")
        .select("evaluacion_rm_id")
        .in("evaluacion_rm_id", evaluacionIds);

      if (resultadosError) {
        alert(resultadosError.message);
        setCargandoEvaluaciones(false);
        return;
      }

      (resultadosData || []).forEach((resultado) => {
        cantidadPorEvaluacion.set(
          resultado.evaluacion_rm_id,
          (cantidadPorEvaluacion.get(resultado.evaluacion_rm_id) || 0) + 1
        );
      });
    }

    setEvaluacionesAlumno(
      evaluacionesBase.map((evaluacion) => ({
        ...evaluacion,
        cantidad_ejercicios: cantidadPorEvaluacion.get(evaluacion.id) || 0,
      }))
    );
    setTotalEvaluaciones(count || 0);
    setCargandoEvaluaciones(false);
  }

  async function eliminarEvaluacion(evaluacion: EvaluacionAlumno) {
    const confirmar = window.confirm(
      "⚠️ Esta acción eliminará permanentemente la evaluación RM y todos los RM generados por ella.\n\nSe eliminarán resultados, historial RM y RM actual asociados a esta evaluación.\n\nEsta acción no se puede deshacer.\n\n¿Deseás continuar?"
    );

    if (!confirmar) return;

    setBorrandoEvaluacionId(evaluacion.id);

    const { error: historialError } = await supabase
      .from("rms_historial")
      .delete()
      .eq("evaluacion_rm_id", evaluacion.id);

    if (historialError) {
      alert(historialError.message);
      setBorrandoEvaluacionId(null);
      return;
    }

    const { error: actualesError } = await supabase
      .from("rms_actuales")
      .delete()
      .eq("evaluacion_rm_id", evaluacion.id);

    if (actualesError) {
      alert(actualesError.message);
      setBorrandoEvaluacionId(null);
      return;
    }

    const { error: resultadosError } = await supabase
      .from("evaluaciones_rm_resultados")
      .delete()
      .eq("evaluacion_rm_id", evaluacion.id);

    if (resultadosError) {
      alert(resultadosError.message);
      setBorrandoEvaluacionId(null);
      return;
    }

    const { error: evaluacionError } = await supabase
      .from("evaluaciones_rm")
      .delete()
      .eq("id", evaluacion.id);

    if (evaluacionError) {
      alert(evaluacionError.message);
      setBorrandoEvaluacionId(null);
      return;
    }

    setTotalEvaluaciones((prev) => Math.max(0, prev - 1));
    setBorrandoEvaluacionId(null);

    if (alumnoSeleccionado) {
      const nuevaPagina =
        evaluacionesAlumno.length === 1 && paginaEvaluaciones > 1
          ? paginaEvaluaciones - 1
          : paginaEvaluaciones;

      await cargarEvaluacionesAlumno(alumnoSeleccionado, nuevaPagina);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando evaluaciones...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <BackButton />
        </div>

        <header className="mb-8">
          <p className="text-sm text-zinc-500 mb-2">
            Profesor {profile?.nombre ? `· ${profile.nombre}` : ""}
          </p>
          <h1 className="text-3xl font-bold">📋 Evaluaciones por alumno</h1>
          <p className="text-zinc-400 mt-2">
            Buscá un alumno, revisá sus evaluaciones RM y eliminá evaluaciones junto con los RM generados por ellas.
          </p>
        </header>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section>
              <h2 className="text-xl font-semibold">🔎 Buscar alumno</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Seleccioná un alumno para ver sus evaluaciones RM.
              </p>

              <input
                type="text"
                value={busquedaAlumno}
                onChange={(e) => buscarAlumnos(e.target.value)}
                placeholder="Buscar por nombre..."
                className="mt-4 w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />

              <div className="mt-3 max-h-[520px] overflow-y-auto space-y-2 pr-1">
                {busquedaAlumno.trim().length < 2 ? (
                  <p className="text-sm text-zinc-500 py-3">Escribí al menos 2 letras para buscar.</p>
                ) : buscandoAlumnos ? (
                  <p className="text-sm text-zinc-500 py-3">Buscando alumnos...</p>
                ) : alumnos.length === 0 ? (
                  <p className="text-sm text-zinc-500 py-3">No se encontraron alumnos.</p>
                ) : (
                  alumnos.map((alumno) => (
                    <button
                      key={alumno.id}
                      type="button"
                      onClick={() => cargarEvaluacionesAlumno(alumno)}
                      className={`w-full text-left rounded-lg border px-4 py-3 transition ${
                        alumnoSeleccionado?.id === alumno.id
                          ? "bg-white text-zinc-950 border-white"
                          : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                      }`}
                    >
                      {alumno.nombre}
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {alumnoSeleccionado
                      ? `Evaluaciones de ${alumnoSeleccionado.nombre}`
                      : "Evaluaciones"}
                  </h2>
                  <p className="text-zinc-400 text-sm mt-1">
                    Ordenadas de más recientes a más antiguas.
                  </p>
                </div>

                {alumnoSeleccionado && evaluacionesAlumno.length > 0 && (
                  <span className="text-sm text-zinc-400">
                    Página {paginaEvaluaciones} de {totalPaginasEvaluaciones}
                  </span>
                )}
              </div>

              {!alumnoSeleccionado ? (
                <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-zinc-500 text-sm">
                  Elegí un alumno para ver sus evaluaciones.
                </div>
              ) : cargandoEvaluaciones ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-zinc-400 text-sm">
                  Cargando evaluaciones...
                </div>
              ) : evaluacionesAlumno.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-zinc-400 text-sm">
                  Este alumno no tiene evaluaciones RM.
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {evaluacionesAlumno.map((evaluacion) => (
                      <div
                        key={evaluacion.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">
                              {evaluacion.nombre || "Evaluación de RM"}
                            </h3>
                            <span className="text-xs rounded-full border border-zinc-700 text-zinc-400 px-2 py-0.5">
                              {evaluacion.estado || "sin estado"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2 text-sm text-zinc-400">
                            <span>
                              Fecha: {formatearFechaEvaluacion(evaluacion.fecha_realizacion || evaluacion.created_at)}
                            </span>
                            <span>•</span>
                            <span>{evaluacion.cantidad_ejercicios} ejercicios</span>
                          </div>
                          {evaluacion.observaciones && (
                            <p className="text-sm text-zinc-500 mt-2 line-clamp-2">
                              {evaluacion.observaciones}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => eliminarEvaluacion(evaluacion)}
                          disabled={borrandoEvaluacionId === evaluacion.id}
                          title="Eliminar evaluación"
                          className="border border-red-900/60 text-red-400 font-semibold px-4 py-3 rounded-lg hover:bg-red-950/40 transition text-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {borrandoEvaluacionId === evaluacion.id ? "⏳" : "🗑️"}
                        </button>
                      </div>
                    ))}
                  </div>

                  {totalPaginasEvaluaciones > 1 && (
                    <div className="flex items-center justify-between mt-5">
                      <button
                        type="button"
                        onClick={() => {
                          if (!alumnoSeleccionado) return;
                          cargarEvaluacionesAlumno(alumnoSeleccionado, Math.max(1, paginaEvaluaciones - 1));
                        }}
                        disabled={paginaEvaluaciones === 1}
                        className="border border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>

                      <span className="text-sm text-zinc-500">
                        {totalEvaluaciones} evaluaciones
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          if (!alumnoSeleccionado) return;
                          cargarEvaluacionesAlumno(
                            alumnoSeleccionado,
                            Math.min(totalPaginasEvaluaciones, paginaEvaluaciones + 1)
                          );
                        }}
                        disabled={paginaEvaluaciones === totalPaginasEvaluaciones}
                        className="border border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
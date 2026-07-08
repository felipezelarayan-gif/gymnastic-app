"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import {
  obtenerEvaluacionesAlumnoProfe,
  type EvaluacionAlumnoProfe,
} from "@/lib/evaluaciones/obtenerEvaluacionesAlumnoProfe";
import { eliminarEvaluacionAlumnoProfesor } from "@/lib/evaluaciones/eliminarEvaluacionAlumnoProfesor";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";

type Profile = {
  nombre: string;
  rol: string;
  foto_url?: string | null;
};

type Alumno = {
  id: string;
  nombre: string;
  profesor_id?: string | null;
};


const EVALUACIONES_POR_PAGINA = 5;

export default function EvaluacionesPorAlumnoPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [buscandoAlumnos, setBuscandoAlumnos] = useState(false);
  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [evaluacionesAlumno, setEvaluacionesAlumno] = useState<EvaluacionAlumnoProfe[]>([]);
  const [totalEvaluaciones, setTotalEvaluaciones] = useState(0);
  const [cargandoEvaluaciones, setCargandoEvaluaciones] = useState(false);
  const [paginaEvaluaciones, setPaginaEvaluaciones] = useState(1);
  const [borrandoEvaluacionId, setBorrandoEvaluacionId] = useState<string | null>(null);
  const [profesorId, setProfesorId] = useState<string | null>(null);
  const [editandoEvaluacion, setEditandoEvaluacion] = useState<{
    id: string;
    tipo: "rm" | "fms";
    fechaActual: string;
  } | null>(null);
  const { formatearFechaCorta } = useFormatoFecha();

  useEffect(() => {
    async function cargarInicial() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        window.location.href = "/login";
        return;
      }

      const user = sessionData.session.user;
      setProfesorId(user.id);

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

    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      return;
    }
    setBuscandoAlumnos(true);

    const { data, error } = await supabase
      .from("alumnos")
      .select("id, nombre, profesor_id")
      .eq("profesor_id", profesorId)
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

    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      setCargandoEvaluaciones(false);
      return;
    }

    if (alumno.profesor_id !== profesorId) {
      alert("No tenés permiso para ver evaluaciones de este alumno.");
      setCargandoEvaluaciones(false);
      return;
    }

    const evaluaciones = await obtenerEvaluacionesAlumnoProfe(
      supabase,
      alumno.id
    );

    const evaluacionesPropias = evaluaciones.filter(
      (evaluacion) => evaluacion.profesor_id === profesorId
    );

    const desde = (pagina - 1) * EVALUACIONES_POR_PAGINA;
    const hasta = desde + EVALUACIONES_POR_PAGINA;

    setEvaluacionesAlumno(evaluacionesPropias.slice(desde, hasta));
    setTotalEvaluaciones(evaluacionesPropias.length);
    setCargandoEvaluaciones(false);
  }

  async function actualizarFechaEvaluacion(evaluacionId: string, tipo: "rm" | "fms", nuevaFecha: string) {
    const tabla = tipo === "rm" ? "evaluaciones_rm" : "evaluaciones_fms";

    const { error } = await supabase
      .from(tabla)
      .update({ fecha_realizacion: nuevaFecha })
      .eq("id", evaluacionId);

    if (error) {
      alert(error.message);
      return;
    }

    if (alumnoSeleccionado) {
      await cargarEvaluacionesAlumno(alumnoSeleccionado, paginaEvaluaciones);
    }
  }

  async function eliminarEvaluacion(evaluacion: EvaluacionAlumnoProfe) {
    const confirmar = window.confirm(
      `⚠️ Esta acción eliminará permanentemente la evaluación ${evaluacion.tipo.toUpperCase()} y todos sus registros asociados.\n\nEsta acción no se puede deshacer.\n\n¿Deseás continuar?`
    );

    if (!confirmar) return;

    setBorrandoEvaluacionId(evaluacion.id);

    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      setBorrandoEvaluacionId(null);
      return;
    }

    if (evaluacion.profesor_id !== profesorId) {
      alert("No tenés permiso para borrar esta evaluación.");
      setBorrandoEvaluacionId(null);
      return;
    }

    try {
      await eliminarEvaluacionAlumnoProfesor({
        supabase,
        evaluacionId: evaluacion.id,
        tipo: evaluacion.tipo,
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo eliminar la evaluación.");
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
          <BackButton fallback="/evaluaciones" />
        </div>

        <header className="mb-8">
          <p className="text-sm text-zinc-500 mb-2">
            Profesor {profile?.nombre ? `· ${profile.nombre}` : ""}
          </p>
          <h1 className="text-3xl font-bold">📋 Evaluaciones por alumno</h1>
          <p className="text-zinc-400 mt-2">
            Buscá un alumno, revisá todas sus evaluaciones y eliminá registros asociados cuando sea necesario.
          </p>
        </header>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section>
              <h2 className="text-xl font-semibold">🔎 Buscar alumno</h2>
              <p className="text-zinc-400 text-sm mt-1">
                Seleccioná un alumno para ver sus evaluaciones.
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
                  Este alumno no tiene evaluaciones registradas.
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
                              {evaluacion.nombre || "Evaluación"}
                            </h3>
                            <span className="text-xs rounded-full border border-zinc-700 text-zinc-300 px-2 py-0.5 uppercase">
                              {evaluacion.tipo}
                            </span>
                            <span className={`text-xs rounded-full px-2 py-1 font-semibold ${
                              evaluacion.estado === "completada"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            }`}>
                              {evaluacion.estado === "completada" ? "Completada" : "Pendiente"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2 text-sm text-zinc-400">
                            <span>
                              Fecha: {formatearFechaCorta(evaluacion.fecha_realizacion || evaluacion.created_at)}
                            </span>
                            <span>•</span>
                            <span>
                              {evaluacion.cantidad_items} {evaluacion.tipo === "rm" ? "ejercicios" : "tests"}
                            </span>
                          </div>
                          {evaluacion.observaciones && (
                            <p className="text-sm text-zinc-500 mt-2 line-clamp-2">
                              {evaluacion.observaciones}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditandoEvaluacion({
                              id: evaluacion.id,
                              tipo: evaluacion.tipo as "rm" | "fms",
                              fechaActual: (evaluacion.fecha_realizacion || evaluacion.created_at || "").split('T')[0]
                            })}
                            title="Editar fecha"
                            className="border border-zinc-700 text-zinc-300 font-semibold px-3 py-2 rounded-lg hover:bg-zinc-800 transition"
                          >
                            ✏️
                          </button>

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

        {editandoEvaluacion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Editar fecha de evaluación</h3>

              <input
                type="date"
                value={editandoEvaluacion.fechaActual}
                onChange={(e) => setEditandoEvaluacion({
                  ...editandoEvaluacion,
                  fechaActual: e.target.value
                })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white mb-4"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditandoEvaluacion(null)}
                  className="flex-1 rounded-xl border border-zinc-700 py-3 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await actualizarFechaEvaluacion(
                      editandoEvaluacion.id,
                      editandoEvaluacion.tipo,
                      editandoEvaluacion.fechaActual
                    );
                    setEditandoEvaluacion(null);
                  }}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600"
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
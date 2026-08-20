"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import {
  obtenerEvaluacionesAlumnoProfe,
  type EvaluacionAlumnoProfe,
} from "@/lib/evaluaciones/obtenerEvaluacionesAlumnoProfe";
import { eliminarEvaluacionAlumnoProfesor } from "@/lib/evaluaciones/eliminarEvaluacionAlumnoProfesor";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import SkeletonEvaluaciones from "@/components/SkeletonEvaluaciones";
import VerEvaluacionModal from "@/components/alumno/VerEvaluacionModal";
import MenuEvaluacionAlumno from "@/components/alumnos/MenuEvaluacionAlumno";
import { useProfileCheck } from "@/lib/useProfileCheck";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";

type Alumno = {
  id: string;
  nombre: string;
  profesor_id?: string | null;
};

const EVALUACIONES_POR_PAGINA = 5;

export default function EvaluacionesPorAlumnoPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const { t } = useIdioma();
  const { profile, loading } = useProfileCheck({ onError: (msg) => mostrarToast(msg, "error") });
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [buscandoAlumnos, setBuscandoAlumnos] = useState(false);
  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [evaluacionesAlumno, setEvaluacionesAlumno] = useState<EvaluacionAlumnoProfe[]>([]);
  const [totalEvaluaciones, setTotalEvaluaciones] = useState(0);
  const [cargandoEvaluaciones, setCargandoEvaluaciones] = useState(false);
  const [paginaEvaluaciones, setPaginaEvaluaciones] = useState(1);
  const [profesorId, setProfesorId] = useState<string | null>(null);
  const [editandoEvaluacion, setEditandoEvaluacion] = useState<{
    id: string;
    tipo: "rm" | "fms";
    fechaAsignacion: string;
  } | null>(null);
  const [verEvaluacionId, setVerEvaluacionId] = useState<string | null>(null);
  const [verEvaluacionTipo, setVerEvaluacionTipo] = useState<"rm" | "fms">("rm");
  const { formatearFechaCorta } = useFormatoFecha();

  useEffect(() => {
    async function cargarProfesorId() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) setProfesorId(user.id);
    }
    cargarProfesorId();
  }, []);

  const totalPaginasEvaluaciones = Math.max(1, Math.ceil(totalEvaluaciones / EVALUACIONES_POR_PAGINA));

  async function buscarAlumnos(valor: string) {
    setBusquedaAlumno(valor);
    setAlumnoSeleccionado(null);
    setEvaluacionesAlumno([]);
    setTotalEvaluaciones(0);
    setPaginaEvaluaciones(1);
    const busqueda = valor.trim();
    if (busqueda.length < 2) { setAlumnos([]); return; }
    if (!profesorId) { alert("No se pudo validar el profesor actual."); return; }
    setBuscandoAlumnos(true);
    const { data, error } = await supabase.from("alumnos").select("id, nombre, profesor_id").eq("profesor_id", profesorId).ilike("nombre", `%${busqueda}%`).order("nombre", { ascending: true }).limit(20);
    setBuscandoAlumnos(false);
    if (error) { alert(error.message); return; }
    setAlumnos(data || []);
  }

  async function cargarEvaluacionesAlumno(alumno: Alumno, pagina = 1) {
    setAlumnoSeleccionado(alumno);
    setPaginaEvaluaciones(pagina);
    setCargandoEvaluaciones(true);
    if (!profesorId) { alert("No se pudo validar el profesor actual."); setCargandoEvaluaciones(false); return; }
    if (alumno.profesor_id !== profesorId) { alert("No tenés permiso para ver evaluaciones de este alumno."); setCargandoEvaluaciones(false); return; }
    const evaluaciones = await obtenerEvaluacionesAlumnoProfe(supabase, alumno.id);
    const evaluacionesPropias = evaluaciones.filter((e) => e.profesor_id === profesorId);
    const desde = (pagina - 1) * EVALUACIONES_POR_PAGINA;
    const hasta = desde + EVALUACIONES_POR_PAGINA;
    setEvaluacionesAlumno(evaluacionesPropias.slice(desde, hasta));
    setTotalEvaluaciones(evaluacionesPropias.length);
    setCargandoEvaluaciones(false);
  }

  async function actualizarFechaAsignacion(evaluacionId: string, tipo: "rm" | "fms", nuevaFecha: string) {
    const tabla = tipo === "rm" ? "evaluaciones_rm" : "evaluaciones_fms";
    const { data, error } = await supabase.from(tabla).update({ fecha_asignacion: nuevaFecha }).eq("id", evaluacionId).eq("profesor_id", profesorId).select("id");
    if (error) { alert(error.message); return; }
    if (!data || data.length === 0) { alert("No se pudo actualizar la fecha. Verificá que tengas permiso sobre esta evaluación."); return; }
    if (alumnoSeleccionado) await cargarEvaluacionesAlumno(alumnoSeleccionado, paginaEvaluaciones);
  }

  async function eliminarEvaluacion(evaluacion: EvaluacionAlumnoProfe) {
    const confirmar = window.confirm(`⚠️ Esta acción eliminará permanentemente la evaluación ${evaluacion.tipo.toUpperCase()} y todos sus registros asociados.\n\nEsta acción no se puede deshacer.\n\n¿Deseás continuar?`);
    if (!confirmar) return;
    if (!profesorId) { alert("No se pudo validar el profesor actual."); return; }
    if (evaluacion.profesor_id !== profesorId) { alert("No tenés permiso para borrar esta evaluación."); return; }
    try { await eliminarEvaluacionAlumnoProfesor({ supabase, evaluacionId: evaluacion.id, tipo: evaluacion.tipo }); }
    catch (error) { alert(error instanceof Error ? error.message : "No se pudo eliminar la evaluación."); return; }
    setTotalEvaluaciones((prev) => Math.max(0, prev - 1));
    if (alumnoSeleccionado) {
      const nuevaPagina = evaluacionesAlumno.length === 1 && paginaEvaluaciones > 1 ? paginaEvaluaciones - 1 : paginaEvaluaciones;
      await cargarEvaluacionesAlumno(alumnoSeleccionado, nuevaPagina);
    }
  }

  function estaCompletada(evaluacion: EvaluacionAlumnoProfe): boolean {
    return evaluacion.estado === "completada" || evaluacion.estado === "cargado";
  }

  if (loading) return <SkeletonEvaluaciones />;

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6"><BackButton fallback="/evaluaciones" /></div>
        <header className="mb-8">
          <p className="text-sm text-zinc-500 mb-2">Profesor {profile?.nombre ? `· ${profile.nombre}` : ""}</p>
          <h1 className="text-3xl font-bold">{t("evaluaciones.porAlumno")}</h1>
          <p className="text-zinc-400 mt-2">{t("evaluaciones.porAlumnoDesc")}</p>
        </header>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section>
              <h2 className="text-xl font-semibold">{t("evaluaciones.buscarAlumno")}</h2>
              <p className="text-zinc-400 text-sm mt-1">{t("evaluaciones.seleccionarAlumnoEvaluaciones")}</p>
              <input type="text" value={busquedaAlumno} onChange={(e) => buscarAlumnos(e.target.value)}
                placeholder={t("evaluaciones.buscarPlaceholder")}
                className="mt-4 w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
              <div className="mt-3 max-h-[520px] overflow-y-auto space-y-2 pr-1">
                {busquedaAlumno.trim().length < 2 ? (
                  <p className="text-sm text-zinc-500 py-3">{t("evaluaciones.minBusqueda")}</p>
                ) : buscandoAlumnos ? (
                  <p className="text-sm text-zinc-500 py-3">{t("evaluaciones.buscando")}</p>
                ) : alumnos.length === 0 ? (
                  <p className="text-sm text-zinc-500 py-3">{t("evaluaciones.noEncontrados")}</p>
                ) : (
                  alumnos.map((alumno) => (
                    <button key={alumno.id} type="button" onClick={() => cargarEvaluacionesAlumno(alumno)}
                      className={`w-full text-left rounded-lg border px-4 py-3 transition ${alumnoSeleccionado?.id === alumno.id ? "bg-white text-zinc-950 border-white" : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>
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
                    {alumnoSeleccionado ? `${t("evaluaciones.evaluacionesDe")} ${alumnoSeleccionado.nombre}` : t("evaluaciones.evaluaciones")}
                  </h2>
                  <p className="text-zinc-400 text-sm mt-1">{t("evaluaciones.ordenadasPor")}</p>
                </div>
                {alumnoSeleccionado && evaluacionesAlumno.length > 0 && (
                  <span className="text-sm text-zinc-400">{t("common.pagina")} {paginaEvaluaciones} {t("common.de")} {totalPaginasEvaluaciones}</span>
                )}
              </div>

              {!alumnoSeleccionado ? (
                <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-zinc-500 text-sm">{t("evaluaciones.elegirAlumno")}</div>
              ) : cargandoEvaluaciones ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-zinc-400 text-sm">{t("evaluaciones.cargandoEvaluaciones")}</div>
              ) : evaluacionesAlumno.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-zinc-400 text-sm">{t("evaluaciones.sinEvaluaciones")}</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {evaluacionesAlumno.map((evaluacion) => {
                      const completada = estaCompletada(evaluacion);
                      return (
                        <div key={evaluacion.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{evaluacion.nombre || t("evaluaciones.evaluacion")}</h3>
                              <span className="text-xs rounded-full border border-zinc-700 text-zinc-300 px-2 py-0.5 uppercase">{evaluacion.tipo}</span>
                              <span className={`text-xs rounded-full px-2 py-1 font-semibold ${completada ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}`}>
                                {completada ? t("evaluaciones.completada") : t("evaluaciones.pendiente")}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2 text-sm text-zinc-400">
                              <span>{completada ? t("evaluaciones.fechaCompletada") : t("evaluaciones.fechaARealizar")}{formatearFechaCorta(completada ? evaluacion.fecha_realizacion : evaluacion.fecha_asignacion) || t("common.sinFecha")}</span>
                              <span>•</span>
                              <span>{evaluacion.cantidad_items} {evaluacion.tipo === "rm" ? t("evaluaciones.ejercicios") : t("evaluaciones.tests")}</span>
                            </div>
                            {evaluacion.observaciones && <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{evaluacion.observaciones}</p>}
                          </div>
                          <MenuEvaluacionAlumno
                            evaluacion={evaluacion}
                            completada={completada}
                            onVer={() => { setVerEvaluacionId(evaluacion.id); setVerEvaluacionTipo(evaluacion.tipo as "rm" | "fms"); }}
                            onEditarFecha={() => setEditandoEvaluacion({ id: evaluacion.id, tipo: evaluacion.tipo as "rm" | "fms", fechaAsignacion: evaluacion.fecha_asignacion || "" })}
                            onCompletar={() => router.push(`/evaluaciones/realizar/${evaluacion.tipo}/${evaluacion.id}`)}
                            onEliminar={() => eliminarEvaluacion(evaluacion)}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {totalPaginasEvaluaciones > 1 && (
                    <div className="flex items-center justify-between mt-5">
                      <button type="button" onClick={() => { if (!alumnoSeleccionado) return; cargarEvaluacionesAlumno(alumnoSeleccionado, Math.max(1, paginaEvaluaciones - 1)); }}
                        disabled={paginaEvaluaciones === 1} className="border border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed">{t("common.anterior")}</button>
                      <span className="text-sm text-zinc-500">{totalEvaluaciones} {t("evaluaciones.evaluaciones")}</span>
                      <button type="button" onClick={() => { if (!alumnoSeleccionado) return; cargarEvaluacionesAlumno(alumnoSeleccionado, Math.min(totalPaginasEvaluaciones, paginaEvaluaciones + 1)); }}
                        disabled={paginaEvaluaciones === totalPaginasEvaluaciones} className="border border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed">{t("common.siguiente")}</button>
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
              <h3 className="text-xl font-bold mb-4">{t("evaluaciones.editarFechaTitulo")}</h3>
              <input type="date" value={editandoEvaluacion.fechaAsignacion} onChange={(e) => setEditandoEvaluacion({ ...editandoEvaluacion, fechaAsignacion: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white mb-4" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditandoEvaluacion(null)} className="flex-1 rounded-xl border border-zinc-700 py-3 text-zinc-300 hover:bg-zinc-800">{t("common.cancelar")}</button>
                <button type="button" onClick={async () => { await actualizarFechaAsignacion(editandoEvaluacion.id, editandoEvaluacion.tipo, editandoEvaluacion.fechaAsignacion); setEditandoEvaluacion(null); }}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600">{t("common.guardar")}</button>
              </div>
            </div>
          </div>
        )}

        {verEvaluacionId && (
          <VerEvaluacionModal open={true} onClose={() => setVerEvaluacionId(null)} evaluacionId={verEvaluacionId} subtipo={verEvaluacionTipo} />
        )}
      </div>
    </main>
  );
}
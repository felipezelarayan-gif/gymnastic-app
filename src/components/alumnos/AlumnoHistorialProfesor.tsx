"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getRolCached } from "@/lib/rol-cache";
import { normalizarRelacion } from "@/lib/utils/normalizarRelacion";
import BackButton from "@/components/BackButton";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import VerEvaluacionModal from "@/components/alumno/VerEvaluacionModal";

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
  numero_serie?: number | string | null;
  peso_kg?: number | string | null;
  repeticiones?: number | string | null;
  rpe?: number | string | null;
  rir?: number | string | null;
  rm_calculado?: number | string | null;
  completado?: boolean | null;
  created_at?: string | null;
};
type RutinaAsignada = {
  id: string;
  alumno_id: string;
  rutina_id: string;
  fecha_completada?: string | null;
  fecha_asignacion?: string | null;
  completada?: boolean | null;
  rutinas?: Rutina | Rutina[] | null;
};

type EvaluacionPlantilla = { id: string; nombre?: string | null; formato?: string | null; modalidad?: string | null };
type EvaluacionRM = {
  id: string;
  alumno_id: string;
  plantilla_id?: string | null;
  estado?: string | null;
  created_at?: string | null;
  evaluacion_plantillas?: EvaluacionPlantilla | EvaluacionPlantilla[] | null;
};
type EvaluacionRMResultado = { id: string; evaluacion_rm_id: string };
type EvaluacionFMS = {
  id: string;
  alumno_id: string;
  profesor_id?: string | null;
  estado?: string | null;
  fecha_asignacion?: string | null;
  fecha_realizacion?: string | null;
  puntaje_total?: number | null;
  created_at?: string | null;
  deleted_at?: string | null;
};
type EvaluacionFMSTest = { id: string; evaluacion_fms_id: string };

type HistorialEntrenamientoItem = {
  tipo: "entrenamiento";
  id: string;
  asignacionId: string;
  rutinaId: string;
  nombre: string;
  fecha?: string | null;
  estado?: string | null;
  ejercicios: number;
  rpePromedio: number | null;
  registros: Registro[];
};

type HistorialEvaluacionItem = {
  tipo: "evaluacion_rm" | "evaluacion_fms";
  id: string;
  nombre: string;
  fecha?: string | null;
  estado?: string | null;
  resultados: number;
};

type HistorialItem = HistorialEntrenamientoItem | HistorialEvaluacionItem;


function numero(valor?: number | string | null) {
  if (valor === null || valor === undefined || valor === "") return "-";
  const convertido = Number(valor);
  if (Number.isNaN(convertido)) return String(valor);
  return convertido.toFixed(1).replace(".0", "");
}

function obtenerFechaOrden(fecha?: string | null) {
  if (!fecha) return 0;
  const valor = new Date(fecha).getTime();
  return Number.isNaN(valor) ? 0 : valor;
}

function etiquetaItem(item: HistorialItem) {
  if (item.tipo === "entrenamiento") return "Rutina";
  if (item.tipo === "evaluacion_rm") return "Evaluación RM";
  return "Evaluación FMS";
}

function iconoItem(item: HistorialItem) {
  if (item.tipo === "entrenamiento") return "🏋️";
  if (item.tipo === "evaluacion_rm") return "📊";
  return "🤸";
}

function agruparRegistrosPorEjercicio(registros: Registro[]) {
  const grupos = new Map<string, { id: string; nombre: string; registros: Registro[] }>();

  registros.forEach((registro, index) => {
    const clave =
      registro.rutina_ejercicio_id ||
      registro.entrada_calor_id ||
      registro.ejercicio_id ||
      `${registro.nombre_ejercicio || "ejercicio"}-${index}`;

    const nombre = registro.nombre_ejercicio || "Ejercicio";
    const grupoExistente = grupos.get(clave);

    if (grupoExistente) {
      grupoExistente.registros.push(registro);
    } else {
      grupos.set(clave, {
        id: clave,
        nombre,
        registros: [registro],
      });
    }
  });

  return Array.from(grupos.values()).map((grupo) => ({
    ...grupo,
    registros: [...grupo.registros].sort((a, b) => {
      const serieA = Number(a.numero_serie ?? 0);
      const serieB = Number(b.numero_serie ?? 0);
      if (serieA !== serieB) return serieA - serieB;
      return obtenerFechaOrden(a.created_at) - obtenerFechaOrden(b.created_at);
    }),
  }));
}

export default function AlumnoHistorialProfesor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [asignaciones, setAsignaciones] = useState<RutinaAsignada[]>([]);
  const [evaluacionesRM, setEvaluacionesRM] = useState<EvaluacionRM[]>([]);
  const [evaluacionesRMResultados, setEvaluacionesRMResultados] = useState<EvaluacionRMResultado[]>([]);
  const [evaluacionesFMS, setEvaluacionesFMS] = useState<EvaluacionFMS[]>([]);
  const [evaluacionesFMSTests, setEvaluacionesFMSTests] = useState<EvaluacionFMSTest[]>([]);
  const [itemSeleccionado, setItemSeleccionado] = useState<HistorialItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalEvaluacion, setModalEvaluacion] = useState<{
    open: boolean;
    id: string;
    subtipo: "rm" | "fms";
  } | null>(null);
  const { formatearFechaCorta } = useFormatoFecha();

  useEffect(() => {
    cargarTodo();
  }, [id]);

  async function cargarTodo() {
    setLoading(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      window.location.replace("/login");
      return;
    }

    const rol = await getRolCached(sessionData.session.user.id);
    if (rol !== "profe") {
      window.location.replace("/alumno");
      return;
    }

    // Paso 1: Ejecutar consultas independientes en paralelo
    const [
      { data: alumnoData, error: alumnoError },
      { data: registrosData, error: registrosError },
      { data: asignacionesData, error: asignacionesError },
      { data: evaluacionesRMData, error: evaluacionesRMError },
      { data: evaluacionesFMSData, error: evaluacionesFMSError },
    ] = await Promise.all([
      supabase.from("alumnos").select("id,nombre,apellido").eq("id", id).single(),
      supabase
        .from("registros_entrenamiento")
        .select("id,alumno_id,rutina_id,rutina_asignacion_id,rutina_ejercicio_id,entrada_calor_id,ejercicio_id,nombre_ejercicio,numero_serie,peso_kg,repeticiones,rpe,rir,rm_calculado,completado,created_at")
        .eq("alumno_id", id)
        .eq("completado", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("rutina_asignaciones")
        .select("id,alumno_id,rutina_id,fecha_completada,fecha_asignacion,completada,rutinas(id,nombre)")
        .eq("alumno_id", id)
        .order("fecha_completada", { ascending: false }),
      supabase
        .from("evaluaciones_rm")
        .select("id,alumno_id,plantilla_id,estado,created_at,evaluacion_plantillas(id,nombre,formato,modalidad)")
        .eq("alumno_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("evaluaciones_fms")
        .select("id,alumno_id,profesor_id,estado,fecha_asignacion,fecha_realizacion,puntaje_total,created_at,deleted_at")
        .eq("alumno_id", id)
        .is("deleted_at", null)
        .order("fecha_realizacion", { ascending: false }),
    ]);

    if (alumnoError) {
      setError(alumnoError.message);
      setLoading(false);
      return;
    }

    if (registrosError) {
      setError(registrosError.message);
      setLoading(false);
      return;
    }

    if (asignacionesError) {
      setError(asignacionesError.message);
      setLoading(false);
      return;
    }

    if (evaluacionesRMError) {
      setError(evaluacionesRMError.message);
      setLoading(false);
      return;
    }

    if (evaluacionesFMSError) {
      setError(evaluacionesFMSError.message);
      setLoading(false);
      return;
    }

    // Paso 2: Consultas dependientes en paralelo (resultados RM y tests FMS)
    const evaluacionesRMIds = (evaluacionesRMData || []).map((evaluacion) => evaluacion.id);
    const evaluacionesFMSIds = (evaluacionesFMSData || []).map((evaluacion) => evaluacion.id);

    const [
      { data: evaluacionesRMResultadosData, error: evaluacionesRMResultadosError },
      { data: evaluacionesFMSTestsData, error: evaluacionesFMSTestsError },
    ] = await Promise.all([
      evaluacionesRMIds.length
        ? supabase.from("evaluaciones_rm_resultados").select("id,evaluacion_rm_id").in("evaluacion_rm_id", evaluacionesRMIds)
        : { data: [], error: null },
      evaluacionesFMSIds.length
        ? supabase.from("evaluaciones_fms_tests").select("id,evaluacion_fms_id").in("evaluacion_fms_id", evaluacionesFMSIds)
        : { data: [], error: null },
    ]);

    if (evaluacionesRMResultadosError) {
      setError(evaluacionesRMResultadosError.message);
      setLoading(false);
      return;
    }

    if (evaluacionesFMSTestsError) {
      setError(evaluacionesFMSTestsError.message);
      setLoading(false);
      return;
    }

    setAlumno(alumnoData as Alumno);
    setRegistros((registrosData || []) as Registro[]);
    setAsignaciones((asignacionesData || []) as RutinaAsignada[]);
    setEvaluacionesRM((evaluacionesRMData || []) as EvaluacionRM[]);
    setEvaluacionesRMResultados((evaluacionesRMResultadosData || []) as EvaluacionRMResultado[]);
    setEvaluacionesFMS((evaluacionesFMSData || []) as EvaluacionFMS[]);
    setEvaluacionesFMSTests((evaluacionesFMSTestsData || []) as EvaluacionFMSTest[]);
    setLoading(false);
  }

  const historial = useMemo<HistorialItem[]>(() => {
    const entrenamientos: HistorialEntrenamientoItem[] = asignaciones
      .filter((asignacion) => asignacion.completada)
      .map((asignacion) => {
        const registrosAsignacion = registros.filter(
          (registro) => registro.rutina_asignacion_id === asignacion.id
        );

        const rutina = normalizarRelacion<Rutina>(asignacion.rutinas);
        const rpes = registrosAsignacion
          .map((registro) => Number(registro.rpe))
          .filter((valor) => !Number.isNaN(valor) && valor > 0);
        const rpePromedio = rpes.length
          ? Number((rpes.reduce((total, valor) => total + valor, 0) / rpes.length).toFixed(1))
          : null;
        const fechaRegistro = registrosAsignacion[0]?.created_at;

        return {
          tipo: "entrenamiento",
          id: asignacion.id,
          asignacionId: asignacion.id,
          rutinaId: asignacion.rutina_id,
          nombre: rutina?.nombre || "Rutina sin nombre",
          fecha: asignacion.fecha_completada || fechaRegistro,
          estado: "Completada",
          ejercicios: agruparRegistrosPorEjercicio(registrosAsignacion).length,
          rpePromedio,
          registros: registrosAsignacion,
        };
      });

    const rm: HistorialEvaluacionItem[] = evaluacionesRM.map((evaluacion) => {
      const plantilla = normalizarRelacion<EvaluacionPlantilla>(evaluacion.evaluacion_plantillas);
      const resultados = evaluacionesRMResultados.filter(
        (resultado) => resultado.evaluacion_rm_id === evaluacion.id
      ).length;

      return {
        tipo: "evaluacion_rm",
        id: evaluacion.id,
        nombre: plantilla?.nombre || "Evaluación RM",
        fecha: evaluacion.created_at,
        estado: evaluacion.estado,
        resultados,
      };
    });

    const fms: HistorialEvaluacionItem[] = evaluacionesFMS.map((evaluacion) => {
      const resultados = evaluacionesFMSTests.filter(
        (test) => test.evaluacion_fms_id === evaluacion.id
      ).length;

      return {
        tipo: "evaluacion_fms",
        id: evaluacion.id,
        nombre: "Evaluación FMS",
        fecha: evaluacion.fecha_realizacion || evaluacion.created_at,
        estado: evaluacion.estado,
        resultados: resultados || evaluacion.puntaje_total || 0,
      };
    });

    return [...entrenamientos, ...rm, ...fms].sort((a, b) => obtenerFechaOrden(b.fecha) - obtenerFechaOrden(a.fecha));
  }, [registros, asignaciones, evaluacionesRM, evaluacionesRMResultados, evaluacionesFMS, evaluacionesFMSTests]);

  const rutinasCompletadas = historial.filter((item) => item.tipo === "entrenamiento").length;
  const evaluacionesCompletadas = historial.filter((item) => item.tipo !== "entrenamiento").length;

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-6 pb-24">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-10 w-32 rounded-xl bg-zinc-900 animate-pulse" />
          <div className="h-28 rounded-3xl bg-zinc-900 animate-pulse" />
          <div className="h-28 rounded-3xl bg-zinc-900 animate-pulse" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white p-4 pb-24">
        <div className="max-w-3xl mx-auto space-y-5">
          <BackButton fallback={`/alumnos/${id}`} />
          <section className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6">
            <p className="font-semibold text-red-300">No pudimos cargar el historial</p>
            <p className="text-sm text-zinc-400 mt-2">{error}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton fallback={`/alumnos/${id}`} />

        <header>
          <p className="text-sm text-zinc-500">Profesor</p>
          <h1 className="text-3xl font-bold">Historial de {alumno?.nombre} {alumno?.apellido || ""}</h1>
          <p className="text-zinc-400 mt-2">Rutinas y evaluaciones realizadas por el alumno.</p>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm text-zinc-400">Rutinas completadas</p>
            <p className="text-3xl font-bold mt-1">{rutinasCompletadas}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm text-zinc-400">Evaluaciones</p>
            <p className="text-3xl font-bold mt-1">{evaluacionesCompletadas}</p>
          </div>
        </section>

        {historial.length === 0 ? (
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-xl font-bold">Sin historial</h2>
            <p className="text-zinc-400 mt-2">Todavía no hay rutinas ni evaluaciones completadas.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {historial.map((item) => (
              <article key={`${item.tipo}-${item.id}`} className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="text-3xl">{iconoItem(item)}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-400">{etiquetaItem(item)}</p>
                      <h2 className="text-xl font-bold mt-1 truncate">{item.nombre}</h2>
                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-zinc-500">
                        <span>{formatearFechaCorta(item.fecha)}</span>
                        {item.estado && (
                          <>
                            <span>•</span>
                            <span>{item.estado}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (item.tipo === "evaluacion_rm" || item.tipo === "evaluacion_fms") {
                        setModalEvaluacion({
                          open: true,
                          id: item.id,
                          subtipo: item.tipo === "evaluacion_rm" ? "rm" : "fms",
                        });
                      } else {
                        setItemSeleccionado(item);
                      }
                    }}
                    className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                  >
                    Ver
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {modalEvaluacion?.open && (
        <VerEvaluacionModal
          open={modalEvaluacion.open}
          onClose={() => setModalEvaluacion(null)}
          evaluacionId={modalEvaluacion.id}
          subtipo={modalEvaluacion.subtipo}
          completada={true}
          vista="profesor"
        />
      )}

      {itemSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <section className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">{etiquetaItem(itemSeleccionado)}</p>
                <h2 className="text-2xl font-bold mt-1">{itemSeleccionado.nombre}</h2>
                <p className="text-sm text-zinc-500 mt-1">{formatearFechaCorta(itemSeleccionado.fecha)}</p>
              </div>

              <button
                type="button"
                onClick={() => setItemSeleccionado(null)}
                className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 max-h-[60vh] overflow-y-auto pr-1">
              {itemSeleccionado.tipo === "entrenamiento" ? (
                itemSeleccionado.registros.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                    <p className="font-semibold text-zinc-200">Sin ejercicios registrados</p>
                    <p className="text-sm text-zinc-400 mt-1">No encontramos registros guardados para este entrenamiento.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {agruparRegistrosPorEjercicio(itemSeleccionado.registros).map((grupo) => (
                      <article key={grupo.id} className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-semibold text-white">{grupo.nombre}</h3>
                          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                            {grupo.registros.length} {grupo.registros.length === 1 ? "serie" : "series"}
                          </span>
                        </div>

                        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
                          <div className="grid grid-cols-5 bg-zinc-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            <span>Serie</span>
                            <span>Reps</span>
                            <span>Peso</span>
                            <span>RPE</span>
                            <span>RIR</span>
                          </div>

                          <div className="divide-y divide-zinc-800">
                            {grupo.registros.map((registro, index) => (
                              <div key={registro.id} className="grid grid-cols-5 px-3 py-3 text-sm text-zinc-200">
                                <span>{registro.numero_serie ?? index + 1}</span>
                                <span>{numero(registro.repeticiones)}</span>
                                <span>{registro.peso_kg !== null && registro.peso_kg !== undefined ? `${numero(registro.peso_kg)} kg` : "-"}</span>
                                <span>{numero(registro.rpe)}</span>
                                <span>{numero(registro.rir)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <p className="font-semibold text-zinc-200">Resumen</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    {itemSeleccionado.tipo === "evaluacion_rm" ? "Resultados cargados" : "Tests cargados"}: {itemSeleccionado.resultados}
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">Estado: {itemSeleccionado.estado || "Sin estado"}</p>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4">
              <button
                type="button"
                disabled
                title="Disponible en una actualización futura"
                className="rounded-2xl border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-500 opacity-60"
              >
                Modificar
              </button>
              <button
                type="button"
                disabled
                title="Disponible en una actualización futura"
                className="rounded-2xl border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-500 opacity-60"
              >
                Deshacer
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

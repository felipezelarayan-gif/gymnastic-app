"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import { recalcularRMActual } from "@/lib/recalcularRMActual";
import { parseFechaLocal, formatearFechaCorta } from "@/lib/utils/formatearFecha";
import VerRutinaModal from "@/components/alumno/VerRutinaModal";

type HistorialActividad = {
  id: string;
  tipo: "rutina" | "evaluacion";
  subtipo?: string;
  nombre: string;
  fecha: string | null;
  estado: string | null;
  rutina_id?: string | null;
};

type DetalleEntrenamiento = {
  id: string;
  ejercicio: string;
  serie?: number | null;
  repeticiones?: number | null;
  peso?: number | null;
  rpe?: number | null;
  rir?: number | null;
};

type DetalleEjercicio = {
  ejercicio: string;
  series: DetalleEntrenamiento[];
};

type DetalleFms = {
  id: string;
  test: string;
  puntaje: number | null;
  comentario: string | null;
};

function ordenarPorFechaDesc<T extends { fecha?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const fechaA = a.fecha ? parseFechaLocal(a.fecha)?.getTime() ?? 0 : 0;
    const fechaB = b.fecha ? parseFechaLocal(b.fecha)?.getTime() ?? 0 : 0;

    return fechaB - fechaA;
  });
}

function obtenerEtiquetaActividad(actividad: HistorialActividad) {
  if (actividad.tipo === "rutina") return "Rutina";
  if (actividad.subtipo) return `Evaluación ${actividad.subtipo.toUpperCase()}`;
  return "Evaluación";
}

function obtenerIconoActividad(actividad: HistorialActividad) {
  return actividad.tipo === "rutina" ? "🏋️" : "📋";
}

function agruparDetallePorEjercicio(detalle: DetalleEntrenamiento[]): DetalleEjercicio[] {
  const grupos = new Map<string, DetalleEntrenamiento[]>();

  detalle.forEach((item) => {
    const nombreEjercicio = item.ejercicio || "Ejercicio";
    const seriesActuales = grupos.get(nombreEjercicio) || [];
    grupos.set(nombreEjercicio, [...seriesActuales, item]);
  });

  return Array.from(grupos.entries()).map(([ejercicio, series]) => ({
    ejercicio,
    series: [...series].sort((a, b) => (a.serie ?? 0) - (b.serie ?? 0)),
  }));
}

export default function NuevaRutinaHistorialPage() {
  const [cargando, setCargando] = useState(true);
  const [historial, setHistorial] = useState<HistorialActividad[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [detalleRutina, setDetalleRutina] = useState<DetalleEntrenamiento[]>([]);
  const [detalleFms, setDetalleFms] = useState<DetalleFms[]>([]);
  const [detalleEvaluacionRM, setDetalleEvaluacionRM] = useState<DetalleEntrenamiento[]>([]);
  const [rutinaSeleccionada, setRutinaSeleccionada] = useState<HistorialActividad | null>(null);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [modalRutina, setModalRutina] = useState<{
    open: boolean;
    id: string;
    completada: boolean;
  } | null>(null);
  // Deshacer UI flow state
  const [confirmarDeshacer, setConfirmarDeshacer] = useState<HistorialActividad | null>(null);
  const [deshaciendo, setDeshaciendo] = useState(false);

  const router = useRouter();
  const [confirmarModificar, setConfirmarModificar] = useState<HistorialActividad | null>(null);
  const [modificando, setModificando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError("No se pudo validar tu sesión.");
      setCargando(false);
      return;
    }

    const { data: alumnoData, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (alumnoError) {
      setError(alumnoError.message);
      setCargando(false);
      return;
    }

    if (!alumnoData) {
      setError("No encontramos un alumno vinculado a esta cuenta.");
      setCargando(false);
      return;
    }

    const historialActividades = await cargarHistorial(alumnoData.id);
    setHistorial(historialActividades);
    setCargando(false);
  }

  async function cargarHistorial(alumnoId: string): Promise<HistorialActividad[]> {
    const [rutinasCompletadas, evaluacionesRm, evaluacionesFms] = await Promise.all([
      cargarHistorialRutinas(alumnoId),
      cargarHistorialRm(alumnoId),
      cargarHistorialFms(alumnoId),
    ]);

    return ordenarPorFechaDesc([
      ...rutinasCompletadas,
      ...evaluacionesRm,
      ...evaluacionesFms,
    ]);
  }

  async function cargarHistorialRutinas(alumnoId: string): Promise<HistorialActividad[]> {
    const { data, error } = await supabase
      .from("rutina_asignaciones")
      .select(
        `
          id,
          rutina_id,
          completada,
          fecha_asignacion,
          fecha_completada,
          created_at,
          rutinas (
            nombre
          )
        `,
      )
      .eq("alumno_id", alumnoId)
      .eq("completada", true)
      .order("fecha_completada", { ascending: false });

    if (error || !data) return [];

    return data.map((rutina) => {
      const rutinaRelacionada = Array.isArray(rutina.rutinas)
        ? rutina.rutinas[0]
        : rutina.rutinas;

      return {
        id: rutina.id,
        rutina_id: rutina.rutina_id ?? null,
        tipo: "rutina" as const,
        nombre: rutinaRelacionada?.nombre || "Rutina completada",
        fecha: rutina.fecha_completada || rutina.created_at || rutina.fecha_asignacion || null,
        estado: "completada",
      };
    });
  }

  async function cargarHistorialRm(alumnoId: string): Promise<HistorialActividad[]> {
    const { data, error } = await supabase
      .from("evaluaciones_rm")
      .select("id, nombre, estado, fecha_realizacion, created_at")
      .eq("alumno_id", alumnoId)
      .is("deleted_at", null)
      .not("estado", "in", "(pendiente,incompleta)")
      .order("fecha_realizacion", { ascending: false });

    if (error || !data) return [];

    return data.map((evaluacion) => ({
      id: evaluacion.id,
      tipo: "evaluacion" as const,
      subtipo: "rm",
      nombre: evaluacion.nombre || "Evaluación de RM",
      fecha: evaluacion.fecha_realizacion || evaluacion.created_at || null,
      estado: evaluacion.estado || null,
    }));
  }

  async function cargarHistorialFms(alumnoId: string): Promise<HistorialActividad[]> {
    const { data, error } = await supabase
      .from("evaluaciones_fms")
      .select("id, estado, fecha_realizacion, created_at")
      .eq("alumno_id", alumnoId)
      .is("deleted_at", null)
      .not("estado", "in", "(pendiente,incompleta)")
      .order("fecha_realizacion", { ascending: false });

    if (error || !data) return [];

    return data.map((evaluacion) => ({
      id: evaluacion.id,
      tipo: "evaluacion" as const,
      subtipo: "fms",
      nombre: "Evaluación FMS",
      fecha: evaluacion.fecha_realizacion || evaluacion.created_at || null,
      estado: evaluacion.estado || null,
    }));
  }

  async function abrirDetalleActividad(actividad: HistorialActividad) {
    setModalAbierto(true);
    setRutinaSeleccionada(actividad);
    setDetalleRutina([]);
    setDetalleFms([]);
    setErrorDetalle(null);
    setCargandoDetalle(true);

    if (actividad.tipo === "rutina") {
      const { data, error } = await supabase
        .from("registros_entrenamiento")
        .select(
          "id,rutina_ejercicio_id,nombre_ejercicio,numero_serie,peso_kg,repeticiones,rpe,rir,created_at"
        )
        .eq("rutina_asignacion_id", actividad.id)
        .not("rutina_ejercicio_id", "is", null)
        .order("rutina_ejercicio_id", { ascending: true })
        .order("numero_serie", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        setErrorDetalle(error.message);
        setCargandoDetalle(false);
        return;
      }

      const detalle = (data || []).map((registro: any, index: number) => ({
        id: registro.id || `${actividad.id}-${index}`,
        ejercicio: registro.nombre_ejercicio || "Ejercicio",
        serie: registro.numero_serie ?? index + 1,
        repeticiones: registro.repeticiones ?? null,
        peso: registro.peso_kg ?? null,
        rpe: registro.rpe ?? null,
        rir: registro.rir ?? null,
      }));

      setDetalleRutina(detalle);
      setCargandoDetalle(false);
      return;
    }

    if (actividad.tipo === "evaluacion" && actividad.subtipo === "rm") {
      const { data, error } = await supabase
        .from("evaluaciones_rm_resultados")
        .select("id, metodo, peso_directo, peso_usado, repeticiones, rm_estimado, rm_final, ejercicios(nombre)")
        .eq("evaluacion_rm_id", actividad.id)
        .order("orden", { ascending: true });

      if (error) {
        setErrorDetalle(error.message);
        setCargandoDetalle(false);
        return;
      }

      const detalle = (data || []).map((registro: any, index: number) => ({
        id: registro.id || `${actividad.id}-${index}`,
        ejercicio: registro.ejercicios?.nombre || "Ejercicio",
        serie: 1,
        peso: registro.peso_usado ?? registro.peso_directo ?? null,
        repeticiones: registro.repeticiones ?? null,
        rpe: null,
        rir: null,
      }));

      setDetalleRutina(detalle);
      setCargandoDetalle(false);
      return;
    }
    if (actividad.tipo === "evaluacion" && actividad.subtipo === "fms") {
      const { data, error } = await supabase
        .from("evaluaciones_fms_tests")
        .select("*")
        .eq("evaluacion_fms_id", actividad.id)
        .order("created_at", { ascending: true });

      if (error) {
        setErrorDetalle(error.message);
        setCargandoDetalle(false);
        return;
      }

      const detalle = (data || []).map((registro: any, index: number) => ({
        id: registro.id || `${actividad.id}-${index}`,
        test:
          registro.test_nombre ||
          registro.nombre_test ||
          registro.nombre ||
          registro.test ||
          `Test ${index + 1}`,
        puntaje: registro.puntaje ?? registro.score ?? registro.valor ?? null,
        comentario: registro.comentario || registro.observaciones || registro.observacion || null,
      }));

      setDetalleFms(detalle);
      setCargandoDetalle(false);
      return;
    }

    setErrorDetalle("Todavía no hay un detalle disponible para esta evaluación.");
    setCargandoDetalle(false);
  }

  async function modificarEntrenamiento() {
    if (!confirmarModificar) return;

    if (confirmarModificar.rutina_id === null) {
      alert(
        "Esta rutina fue eliminada por el profesor. Para corregir este registro, contactá al soporte."
      );
      setConfirmarModificar(null);
      return;
    }

    setModificando(true);

    try {
      sessionStorage.setItem(
        "rutina_a_modificar",
        JSON.stringify({
          asignacionId: confirmarModificar.id,
        })
      );

      router.push(`/alumno/rutina/${confirmarModificar.id}?modo=modificar`);
    } finally {
      setModificando(false);
      setConfirmarModificar(null);
    }
  }

  async function deshacerEntrenamiento() {
    if (!confirmarDeshacer) return;

    if (confirmarDeshacer.rutina_id === null) {
      alert(
        "Esta rutina fue eliminada por el profesor. Para corregir este registro, contactá al soporte."
      );
      setConfirmarDeshacer(null);
      return;
    }

    setDeshaciendo(true);
    try {
      const rutina = confirmarDeshacer;
      if (!rutina) return;

      const { data: historial } = await supabase
        .from("rms_historial")
        .select("id, alumno_id, ejercicio_id")
        .eq("rutina_asignacion_id", rutina.id)
        .eq("origen", "entrenamiento");

      const alumnoId = historial?.[0]?.alumno_id;
      const ejercicios = [...new Set((historial || []).map((item) => item.ejercicio_id).filter(Boolean))] as string[];

      if (historial?.length) {
        const { error } = await supabase
          .from("rms_historial")
          .delete()
          .in(
            "id",
            historial.map((item) => item.id)
          );

        if (error) throw error;
      }

      const { error: registrosError } = await supabase
        .from("registros_entrenamiento")
        .delete()
        .eq("rutina_asignacion_id", rutina.id);

      if (registrosError) throw registrosError;

      const { error: asignacionError } = await supabase
        .from("rutina_asignaciones")
        .update({
          completada: false,
          activa: true,
          fecha_completada: null,
        })
        .eq("id", rutina.id);

      if (asignacionError) throw asignacionError;

      if (alumnoId) {
        for (const ejercicioId of ejercicios) {
          await recalcularRMActual({
            alumnoId,
            ejercicioId,
          });
        }
      }

      await cargarDatos();

      setConfirmarDeshacer(null);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo deshacer el entrenamiento.";
      alert(mensaje);
    } finally {
      setDeshaciendo(false);
    }
  }

  function cerrarModalDetalle() {
    setModalAbierto(false);
    setRutinaSeleccionada(null);
    setDetalleRutina([]);
    setDetalleFms([]);
    setErrorDetalle(null);
    setCargandoDetalle(false);
  }

  const rutinasCompletadas = historial.filter((actividad) => actividad.tipo === "rutina").length;
  const evaluacionesCompletadas = historial.filter((actividad) => actividad.tipo === "evaluacion").length;
  const detalleAgrupado = agruparDetallePorEjercicio(detalleRutina);

  if (cargando) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-10 w-32 rounded-xl bg-zinc-900 animate-pulse" />
          <div className="h-24 rounded-3xl bg-zinc-900 animate-pulse" />
          <div className="h-24 rounded-3xl bg-zinc-900 animate-pulse" />
          <div className="h-24 rounded-3xl bg-zinc-900 animate-pulse" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <BackButton fallback="/alumno/rutina" />

        <section className="rounded-3xl border border-red-900/50 bg-red-950/20 p-6">
            <p className="text-red-300 font-semibold">No pudimos cargar el historial</p>
            <p className="text-zinc-400 mt-2">{error}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="max-w-3xl mx-auto space-y-5">
        <BackButton fallback="/alumno/rutina" />

        <header>
          <p className="text-sm text-zinc-500">Alumno</p>
          <h1 className="text-3xl font-bold">Historial</h1>
          <p className="text-zinc-400 mt-2">
            Tus rutinas y evaluaciones realizadas.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm text-zinc-400">Rutinas completadas</p>
            <p className="text-3xl font-bold mt-1">{rutinasCompletadas}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <p className="text-sm text-zinc-400">Evaluaciones realizadas</p>
            <p className="text-3xl font-bold mt-1">{evaluacionesCompletadas}</p>
          </div>
        </section>

        {historial.length === 0 ? (
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-xl font-bold">Sin historial</h2>
            <p className="text-zinc-400 mt-2">
              Todavía no hay rutinas ni evaluaciones completadas.
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {historial.map((actividad) => (
              <div
                key={`${actividad.tipo}-${actividad.subtipo || "general"}-${actividad.id}`}
                className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-3xl">{obtenerIconoActividad(actividad)}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-400">
                        {obtenerEtiquetaActividad(actividad)}
                      </p>
                      <h2 className="text-xl font-bold mt-1 truncate">
                        {actividad.nombre}
                      </h2>
                      <div className="flex flex-wrap gap-2 text-sm text-zinc-500 mt-1">
                        <span>Fecha completada: {formatearFechaCorta(actividad.fecha)}</span>
                        {actividad.estado && (
                          <>
                            <span>•</span>
                            <span>{actividad.estado}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {(
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      {actividad.tipo === "rutina" ? (
                        <button
                          type="button"
                          onClick={() => setModalRutina({ open: true, id: actividad.id, completada: true })}
                          className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                        >
                          Ver detalles
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirDetalleActividad(actividad)}
                          className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
                        >
                          Ver
                        </button>
                      )}
                      {actividad.tipo === "rutina" && actividad.rutina_id !== null ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setConfirmarModificar(actividad)}
                            className="rounded-full border border-amber-800 px-4 py-2 text-sm font-semibold text-amber-300 hover:border-amber-500 hover:bg-amber-950/30"
                          >
                            Modificar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmarDeshacer(actividad)}
                            className="rounded-full border border-red-900/60 px-4 py-2 text-sm font-semibold text-red-300 hover:border-red-500 hover:bg-red-950/30"
                          >
                            Deshacer
                          </button>
                        </>
                      ) : actividad.tipo === "rutina" && actividad.rutina_id === null ? (
                        <p className="max-w-[220px] text-right text-xs text-zinc-500">
                          Rutina eliminada por el profesor.
                          Para corregir este registro, contactá al soporte.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <section className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">
                  {rutinaSeleccionada?.tipo === "rutina" ? "Detalle del entrenamiento" : "Detalle de la evaluación"}
                </p>
                <h2 className="text-2xl font-bold mt-1">
                  {rutinaSeleccionada?.nombre || "Rutina"}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {formatearFechaCorta(rutinaSeleccionada?.fecha)}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModalDetalle}
                className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 max-h-[60vh] overflow-y-auto pr-1">
              {cargandoDetalle ? (
                <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-5 text-center">
                  <p className="font-semibold text-emerald-300">
                    {rutinaSeleccionada?.tipo === "rutina" ? "Estamos cargando tu rutina" : "Estamos cargando tu evaluación"}
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Consultando los ejercicios realizados...
                  </p>
                </div>
              ) : errorDetalle ? (
                <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-5">
                  <p className="font-semibold text-red-300">No pudimos cargar el detalle</p>
                  <p className="text-sm text-zinc-400 mt-1">{errorDetalle}</p>
                </div>
              ) : rutinaSeleccionada?.subtipo === "fms" ? (
                detalleFms.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                    <p className="font-semibold text-zinc-200">Sin resultados registrados</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      No encontramos resultados guardados para esta evaluación.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detalleFms.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-zinc-800 bg-black/40 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-white">{item.test}</h3>
                            {item.comentario && (
                              <p className="text-sm text-zinc-400 mt-1">{item.comentario}</p>
                            )}
                          </div>
                          <span className="rounded-full border border-zinc-700 px-3 py-1 text-sm font-bold text-emerald-300">
                            {item.puntaje ?? "-"}
                          </span>
                        </div>
                      </article>
                    ))}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between">
                      <span className="text-zinc-400">Total</span>
                      <span className="text-xl font-bold text-white">
                        {detalleFms.reduce((total, item) => total + Number(item.puntaje || 0), 0)}
                      </span>
                    </div>
                  </div>
                )
              ) : detalleAgrupado.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <p className="font-semibold text-zinc-200">
                    {rutinaSeleccionada?.tipo === "rutina" ? "Sin ejercicios registrados" : "Sin resultados registrados"}
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">
                    {rutinaSeleccionada?.tipo === "rutina"
                      ? "No encontramos registros guardados para este entrenamiento."
                      : "No encontramos resultados guardados para esta evaluación."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {detalleAgrupado.map((grupo) => (
                    <article
                      key={grupo.ejercicio}
                      className="rounded-2xl border border-zinc-800 bg-black/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-white">{grupo.ejercicio}</h3>
                        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                          {grupo.series.length} {grupo.series.length === 1 ? "serie" : "series"}
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
                          {grupo.series.map((serie, index) => (
                            <div
                              key={serie.id}
                              className="grid grid-cols-5 px-3 py-3 text-sm text-zinc-200"
                            >
                              <span>{serie.serie ?? index + 1}</span>
                              <span>{serie.repeticiones ?? "-"}</span>
                              <span>
                                {serie.peso !== null && serie.peso !== undefined
                                  ? `${serie.peso} kg`
                                  : "-"}
                              </span>
                              <span>{serie.rpe ?? "-"}</span>
                              <span>{serie.rir ?? "-"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    {/* Modal de confirmación para Modificar */}
    {confirmarModificar && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
        <section className="w-full max-w-md rounded-3xl border border-amber-900 bg-zinc-950 p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-amber-300 mb-2">¿Modificar entrenamiento?</h2>
          <p className="text-zinc-300 mb-4">
            El entrenamiento se reabrirá con los datos anteriores para que puedas editarlo y volver a completarlo. ¿Deseas continuar?
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmarModificar(null)}
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
              disabled={modificando}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={modificarEntrenamiento}
              disabled={modificando}
              className="rounded-full border border-amber-900 px-4 py-2 text-sm font-semibold text-amber-300 hover:border-amber-500 hover:bg-amber-950/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {modificando ? "Abriendo..." : "Modificar"}
            </button>
          </div>
        </section>
      </div>
    )}
    {/* Modal de confirmación para Deshacer */}
    {confirmarDeshacer && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
        <section className="w-full max-w-md rounded-3xl border border-red-900 bg-zinc-950 p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-red-300 mb-2">¿Deshacer entrenamiento?</h2>
          <p className="text-zinc-300 mb-4">
            Se eliminarán los registros del entrenamiento y la rutina volverá a quedar pendiente para que puedas realizarla nuevamente. Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmarDeshacer(null)}
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500"
              disabled={deshaciendo}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={deshacerEntrenamiento}
              disabled={deshaciendo}
              className="rounded-full border border-red-900 px-4 py-2 text-sm font-semibold text-red-300 hover:border-red-500 hover:bg-red-950/30 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {deshaciendo ? "Procesando..." : "Deshacer"}
            </button>
          </div>
        </section>
      </div>
    )}
      {modalRutina?.open && (
        <VerRutinaModal
          open={modalRutina.open}
          onClose={() => setModalRutina(null)}
          asignacionId={modalRutina.id}
          completada={modalRutina.completada}
        />
      )}
    </main>
  );
}

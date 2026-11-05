"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import { useIdioma } from "@/lib/i18n-context";

type VerRutinaModalProps = {
  open: boolean;
  onClose: () => void;
  asignacionId: string;
  completada: boolean;
};

type RutinaData = {
  id: string;
  rutina_id: string;
  completada: boolean;
  fecha_asignacion: string | null;
  fecha_completada: string | null;
  rutinas: {
    id: string;
    nombre: string | null;
    objetivo: string | null;
    estructura: string | null;
  } | null;
};

type RutinaEjercicio = {
  id: string;
  nombre_ejercicio: string;
  series: number | null;
  tipo_prescripcion: string | null;
  repeticiones: string | null;
  duracion: string | null;
  peso: string | null;
  porcentaje_rm: string | null;
  rir: string | null;
  descanso: string | null;
  observaciones: string | null;
  orden: number | null;
  tipo_configuracion: string | null;
  modo: "ejercicio" | "amrap" | "circuito" | null;
  tiempo_limite: string | null;
  rondas_objetivo: number | null;
  descanso_entre_rondas: string | null;
  tipo_tiempo_circuito: string | null;
  duracion_ronda: string | null;
  bloque_id: string | null;
  bloque_orden: number | null;
};

type TFn = (key: string, params?: Record<string, string | number>) => string;

function esBloque(item: RutinaEjercicio) {
  return (item.modo === "amrap" || item.modo === "circuito") && !!item.bloque_id;
}

function agruparBloques(items: RutinaEjercicio[]): { sueltos: RutinaEjercicio[]; bloques: RutinaEjercicio[][] } {
  const sueltos: RutinaEjercicio[] = [];
  const porBloque = new Map<string, RutinaEjercicio[]>();
  for (const item of items) {
    if (esBloque(item) && item.bloque_id) {
      const lista = porBloque.get(item.bloque_id) || [];
      lista.push(item);
      porBloque.set(item.bloque_id, lista);
    } else {
      sueltos.push(item);
    }
  }
  const bloques = [...porBloque.values()].map((lista) =>
    [...lista].sort((a, b) => Number(a.bloque_orden || 0) - Number(b.bloque_orden || 0))
  );
  return { sueltos, bloques };
}

function descripcionBloque(bloque: RutinaEjercicio[], t: TFn): string {
  const primero = bloque[0];
  if (!primero) return "";
  if (primero.modo === "amrap") {
    return `AMRAP · ${primero.tiempo_limite || "-"}${primero.rondas_objetivo ? ` · ${primero.rondas_objetivo} ${t("rutinas.rondas")}` : ""}`;
  }
  const tiempo =
    primero.tipo_tiempo_circuito === "duracion_ronda"
      ? primero.duracion_ronda
        ? ` · ${primero.duracion_ronda} ${t("rutinas.porRonda")}`
        : ""
      : primero.descanso_entre_rondas
        ? ` · ${t("rutinas.descanso")}: ${primero.descanso_entre_rondas}`
        : "";
  return `${t("rutinas.modoCircuito")} · ${primero.rondas_objetivo || "-"} ${t("rutinas.rondas")}${tiempo}`;
}

function descripcionCarga(item: RutinaEjercicio, t: TFn): string {
  if (item.porcentaje_rm === "0") return t("rutinas.pesoCorporalShort");
  if (item.porcentaje_rm) return `${item.porcentaje_rm}${t("rutinas.porcentajeRM")}`;
  if (item.peso) return `${item.peso} kg`;
  return "-";
}

function descripcionPrescripcion(item: RutinaEjercicio, t: TFn): string {
  if (item.tipo_prescripcion === "tiempo") return item.duracion || "-";
  return `${item.repeticiones || "-"} ${t("rutinas.repsShort")}`;
}

type RegistroEntrenamiento = {
  id: string;
  nombre_ejercicio: string | null;
  numero_serie: number | null;
  peso_kg: number | null;
  repeticiones: number | null;
  rpe: number | null;
  rir: number | null;
  rutina_ejercicio_id?: string | null;
  entrada_calor_id?: string | null;
  bloque_id?: string | null;
  rondas_realizadas?: number | null;
  tiempo_empleado_seg?: number | null;
  objetivo_logrado?: boolean | null;
};

type EjercicioAgrupado = {
  nombre: string;
  series: RegistroEntrenamiento[];
};

function agruparRegistrosPorEjercicio(registros: RegistroEntrenamiento[], ejercicioSinNombre: string = "Ejercicio"): EjercicioAgrupado[] {
  const grupos = new Map<string, RegistroEntrenamiento[]>();

  registros.forEach((item) => {
    const nombre = item.nombre_ejercicio || ejercicioSinNombre;
    const seriesActuales = grupos.get(nombre) || [];
    grupos.set(nombre, [...seriesActuales, item]);
  });

  return Array.from(grupos.entries()).map(([nombre, series]) => ({
    nombre,
    series: [...series].sort((a, b) => (a.numero_serie ?? 0) - (b.numero_serie ?? 0)),
  }));
}

// Formatea segundos como mm:ss (tiempo empleado en un bloque AMRAP/circuito).
function formatearTiempo(totalSegundos: number | null | undefined): string {
  const seg = Math.max(0, Math.floor(totalSegundos ?? 0));
  const minutos = Math.floor(seg / 60);
  const resto = seg % 60;
  return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

export default function VerRutinaModal({
  open,
  onClose,
  asignacionId,
  completada,
}: VerRutinaModalProps) {
  const { t } = useIdioma();
  const [loading, setLoading] = useState(false);
  const { formatearFechaCorta } = useFormatoFecha();
  const [rutina, setRutina] = useState<RutinaData | null>(null);
  const [ejercicios, setEjercicios] = useState<RutinaEjercicio[]>([]);
  const [registros, setRegistros] = useState<RegistroEntrenamiento[]>([]);

  useEffect(() => {
    if (!open || !asignacionId) return;

    let cancelled = false;

    async function cargarDatos() {
      setLoading(true);

      try {
        // Obtener datos de la asignacion + rutina
        const { data: asignacionData, error: asignacionError } = await supabase
          .from("rutina_asignaciones")
          .select(`
            id,
            rutina_id,
            completada,
            fecha_asignacion,
            fecha_completada,
            rutinas (
              id,
              nombre,
              objetivo,
              estructura
            )
          `)
          .eq("id", asignacionId)
          .single();

        if (asignacionError || !asignacionData) {
          console.error("Error cargando rutina:", asignacionError);
          setLoading(false);
          return;
        }

        const rutinaNormalizada = {
          ...asignacionData,
          rutinas: Array.isArray(asignacionData.rutinas)
            ? asignacionData.rutinas[0]
            : asignacionData.rutinas,
        } as RutinaData;

        if (cancelled) return;
        setRutina(rutinaNormalizada);

        // Obtener ejercicios planificados
        if (rutinaNormalizada.rutina_id) {
          const { data: ejerciciosData } = await supabase
            .from("rutina_ejercicios")
            .select("id, nombre_ejercicio, series, tipo_prescripcion, repeticiones, duracion, peso, porcentaje_rm, rir, descanso, observaciones, orden, tipo_configuracion, modo, tiempo_limite, rondas_objetivo, descanso_entre_rondas, tipo_tiempo_circuito, duracion_ronda, bloque_id, bloque_orden")
            .eq("rutina_id", rutinaNormalizada.rutina_id)
            .order("orden");

          if (!cancelled) {
            setEjercicios(ejerciciosData || []);
          }
        }

        // Si completada, obtener registros
        if (completada) {
          const { data: registrosData } = await supabase
            .from("registros_entrenamiento")
            .select("id, nombre_ejercicio, numero_serie, peso_kg, repeticiones, rpe, rir, rutina_ejercicio_id, entrada_calor_id, bloque_id, rondas_realizadas, tiempo_empleado_seg, objetivo_logrado")
            .eq("rutina_asignacion_id", asignacionId)
            .order("rutina_ejercicio_id", { ascending: true })
            .order("numero_serie", { ascending: true });

          if (!cancelled) {
            setRegistros(registrosData || []);
          }
        }
      } catch (error) {
        console.error("Error inesperado:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    cargarDatos();

    return () => {
      cancelled = true;
    };
  }, [open, asignacionId, completada]);

  if (!open) return null;

  // Los ejercicios simples se guardan con rutina_ejercicio_id; los bloques
  // (AMRAP/circuito/rondas) se guardan una sola vez con bloque_id y sin
  // rutina_ejercicio_id, por eso se separan en grupos distintos.
  const registrosEjercicios = registros.filter((r) => !!r.rutina_ejercicio_id);
  const registrosBloques = registros.filter((r) => !!r.bloque_id);

  const registrosAgrupados = agruparRegistrosPorEjercicio(registrosEjercicios, t("alumnos.ejercicioSinNombre"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
          <div>
            <p className="text-sm text-zinc-500">
              {completada ? t("alumno.etiquetaRutinaCompletada") : t("alumno.etiquetaRutinaPendiente")}
            </p>
            <h3 className="text-xl font-bold text-zinc-100 mt-1">
              🏋️ {rutina?.rutinas?.nombre || t("alumnos.rutinaSinNombre")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-48 rounded bg-zinc-800" />
              <div className="h-4 w-64 rounded bg-zinc-800" />
              <div className="h-4 w-56 rounded bg-zinc-800" />
              <div className="h-20 w-full rounded-xl bg-zinc-800" />
            </div>
          ) : rutina ? (
            <>
              {/* Info general */}
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">{t("alumno.estadoLabel")}</p>
                  <p className="text-sm text-zinc-200">
                    {completada ? t("rutinas.completada") : t("alumno.pendiente")}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 mb-1">{t("alumno.fechaAsignadaLabel")}</p>
                  <p className="text-sm text-zinc-200">
                    {formatearFechaCorta(rutina.fecha_asignacion) || t("common.sinFecha")}
                  </p>
                </div>

                {completada && rutina.fecha_completada && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">{t("alumno.fechaCompletadaLabel")}</p>
                    <p className="text-sm text-zinc-200">
                      {formatearFechaCorta(rutina.fecha_completada)}
                    </p>
                  </div>
                )}

                {rutina.rutinas?.objetivo && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">{t("rutinas.objetivo")}</p>
                    <p className="text-sm text-zinc-200">{rutina.rutinas.objetivo}</p>
                  </div>
                )}

                {rutina.rutinas?.estructura && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">{t("rutinas.estructura")}</p>
                    <p className="text-sm text-zinc-200">{rutina.rutinas.estructura}</p>
                  </div>
                )}
              </div>

              {/* Ejercicios */}
              <div>
                <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wide">
                  {t("alumno.ejerciciosLabel")}
                </p>

                {/* Vista pendiente: muestra lo planificado */}
                {!completada && ejercicios.length === 0 && (
                  <p className="text-sm text-zinc-500">{t("alumno.sinEjerciciosCargados")}</p>
                )}

                {!completada && ejercicios.length > 0 && (() => {
                  const { sueltos, bloques } = agruparBloques(ejercicios);
                  return (
                    <div className="space-y-3">
                      {sueltos.map((ej) => (
                        <div
                          key={ej.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                        >
                          <p className="font-semibold text-zinc-200">
                            {`${ej.orden ? `${ej.orden}. ` : ""}${ej.nombre_ejercicio}`}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-400">
                            {ej.series && <span>{ej.series} {t("alumnos.seriesPlural")}</span>}
                            {ej.tipo_prescripcion === "tiempo" && ej.duracion && (
                              <span>x {ej.duracion}</span>
                            )}
                            {ej.tipo_prescripcion !== "tiempo" && ej.repeticiones && (
                              <span>x {ej.repeticiones} {t("alumnos.tablaReps")}</span>
                            )}
                            {ej.peso && <span>| {ej.peso}</span>}
                            {ej.porcentaje_rm && <span>| {ej.porcentaje_rm}% RM</span>}
                            {ej.rir && <span>| RIR: {ej.rir}</span>}
                          </div>
                          {ej.descanso && (
                            <p className="text-xs text-zinc-500 mt-1">{t("rutinas.descansoEntreSeries")}: {ej.descanso}</p>
                          )}
                          {ej.observaciones && (
                            <p className="text-xs text-zinc-500 mt-1">{ej.observaciones}</p>
                          )}
                        </div>
                      ))}
                      {bloques.map((bloque) => (
                        <div
                          key={bloque[0]?.bloque_id || bloque[0]?.id}
                          className={`rounded-xl border p-4 ${bloque[0]?.modo === "amrap" ? "border-amber-500/30 bg-amber-500/5" : "border-cyan-500/30 bg-cyan-500/5"}`}
                        >
                          <p className={`font-semibold ${bloque[0]?.modo === "amrap" ? "text-amber-300" : "text-cyan-300"}`}>
                            {bloque[0]?.modo === "amrap" ? t("rutinas.modoAmrap") : t("rutinas.modoCircuito")}
                          </p>
                          <p className="mt-1 text-sm text-zinc-400">{descripcionBloque(bloque, t)}</p>
                          <div className="mt-3 space-y-2">
                            {bloque.map((ej, index) => (
                              <div key={ej.id} className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-zinc-200">{index + 1}. {ej.nombre_ejercicio}</span>
                                <span className="text-zinc-400">
                                  {descripcionPrescripcion(ej, t)} · {descripcionCarga(ej, t)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Vista completada: muestra registros reales */}
                {completada && registrosAgrupados.length === 0 && registrosBloques.length === 0 && ejercicios.length > 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                    <p className="text-sm text-zinc-400">
                      {t("alumno.sinRegistrosEntrenamiento")}
                    </p>
                  </div>
                )}

                {/* Vista completada: bloques AMRAP/circuito/rondas */}
                {completada && registrosBloques.length > 0 && (
                  <div className="space-y-3">
                    {registrosBloques.map((registro) => {
                      const ejerciciosDelBloque = ejercicios
                        .filter((ej) => ej.bloque_id === registro.bloque_id)
                        .sort(
                          (a, b) =>
                            Number(a.bloque_orden || 0) - Number(b.bloque_orden || 0)
                        );
                      const esAmrap = ejerciciosDelBloque[0]?.modo === "amrap";

                      return (
                        <div
                          key={registro.id}
                          className={`rounded-xl border p-4 ${
                            esAmrap
                              ? "border-amber-500/30 bg-amber-500/5"
                              : "border-cyan-500/30 bg-cyan-500/5"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <h4
                              className={`font-semibold ${
                                esAmrap ? "text-amber-300" : "text-cyan-300"
                              }`}
                            >
                              {esAmrap
                                ? t("rutinas.modoAmrap")
                                : t("rutinas.modoCircuito")}
                            </h4>

                            {registro.objetivo_logrado !== null &&
                              registro.objetivo_logrado !== undefined && (
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs ${
                                    registro.objetivo_logrado
                                      ? "border-emerald-700/60 bg-emerald-500/10 text-emerald-400"
                                      : "border-zinc-700 bg-zinc-800 text-zinc-400"
                                  }`}
                                >
                                  {registro.objetivo_logrado
                                    ? t("alumno.bloque.objetivoLogrado")
                                    : t("alumno.bloque.objetivoNoLogrado")}
                                </span>
                              )}
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-zinc-300">
                            <span>
                              {t("alumno.bloque.rondasLabel")}:{" "}
                              {registro.rondas_realizadas ?? "-"}
                            </span>
                            <span>
                              {t("alumno.bloque.tiempoLabel")}:{" "}
                              {formatearTiempo(registro.tiempo_empleado_seg)}
                            </span>
                            <span>
                              {t("alumno.bloque.rpeLabel")}: {registro.rpe ?? "-"}
                            </span>
                            <span>
                              {t("alumno.bloque.rirLabel")}: {registro.rir ?? "-"}
                            </span>
                          </div>

                          {ejerciciosDelBloque.length > 0 && (
                            <div className="mt-3 border-t border-zinc-800/60 pt-2">
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-400">
                                {ejerciciosDelBloque.map((ej) => (
                                  <span key={ej.id}>• {ej.nombre_ejercicio}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {completada && registrosAgrupados.length > 0 && (
                  <div className="space-y-4">
                    {registrosAgrupados.map((grupo) => (
                      <div
                        key={grupo.nombre}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-semibold text-zinc-200">{grupo.nombre}</h4>
                          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
                            {grupo.series.length} {grupo.series.length === 1 ? t("alumnos.serieSingular") : t("alumnos.seriesPlural")}
                          </span>
                        </div>

                        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
                          <div className="grid grid-cols-5 bg-zinc-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            <span>{t("alumnos.tablaSerie")}</span>
                            <span>{t("alumnos.tablaReps")}</span>
                            <span>{t("alumnos.tablaPeso")}</span>
                            <span>{t("alumnos.tablaRPE")}</span>
                            <span>{t("alumnos.tablaRIR")}</span>
                          </div>
                          <div className="divide-y divide-zinc-800">
                            {grupo.series.map((serie) => (
                              <div
                                key={serie.id}
                                className="grid grid-cols-5 px-3 py-3 text-sm text-zinc-200"
                              >
                                <span>{serie.numero_serie ?? "-"}</span>
                                <span>{serie.repeticiones ?? "-"}</span>
                                <span>
                                  {serie.peso_kg !== null && serie.peso_kg !== undefined
                                    ? `${serie.peso_kg} kg`
                                    : "-"}
                                </span>
                                <span>{serie.rpe ?? "-"}</span>
                                <span>{serie.rir ?? "-"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-zinc-400 text-sm">{t("alumno.noSePudoCargarRutina")}</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end shrink-0 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            {t("alumnos.modalCerrar")}
          </button>
        </div>
      </div>
    </div>
  );
}

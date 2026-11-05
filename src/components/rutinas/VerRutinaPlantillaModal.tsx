"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AsignarModal from "@/components/shared/AsignarModal";
import { useIdioma } from "@/lib/i18n-context";

type TFn = (key: string, params?: Record<string, string | number>) => string;

type VerRutinaPlantillaModalProps = {
  open: boolean;
  onClose: () => void;
  rutinaId: string;
  profesorId: string;
};

type RutinaData = {
  id: string;
  nombre: string;
  objetivo: string | null;
  estructura: string | null;
};

type EntradaCalorEjercicio = {
  id: string;
  nombre_ejercicio: string;
  series: number | null;
  tipo_prescripcion: string | null;
  repeticiones: string | null;
  duracion: string | null;
  peso: string | null;
  porcentaje_rm: string | null;
  orden: number | null;
  modo: string | null;
  tiempo_limite: string | null;
  rondas_objetivo: number | null;
  descanso_entre_rondas: string | null;
  tipo_tiempo_circuito: string | null;
  duracion_ronda: string | null;
  bloque_id: string | null;
  bloque_orden: number | null;
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
  modo: string | null;
  tiempo_limite: string | null;
  rondas_objetivo: number | null;
  descanso_entre_rondas: string | null;
  tipo_tiempo_circuito: string | null;
  duracion_ronda: string | null;
  bloque_id: string | null;
  bloque_orden: number | null;
};

// Helpers para agrupar y describir bloques AMRAP / Circuito
type BloqueItem = EntradaCalorEjercicio | RutinaEjercicio;

function esBloque(item: BloqueItem) {
  return (item.modo === "amrap" || item.modo === "circuito") && !!item.bloque_id;
}

function agruparBloques<T extends BloqueItem>(items: T[]): { sueltos: T[]; bloques: T[][] } {
  const sueltos: T[] = [];
  const porBloque = new Map<string, T[]>();
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

function descripcionBloque(bloque: BloqueItem[], t: TFn): string {
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

function descripcionCarga(item: BloqueItem, t: TFn): string {
  if (item.porcentaje_rm === "0") return t("rutinas.pesoCorporalShort");
  if (item.porcentaje_rm) return `${item.porcentaje_rm}${t("rutinas.porcentajeRM")}`;
  if (item.peso) return `${item.peso} kg`;
  return "-";
}

function descripcionPrescripcion(item: BloqueItem, t: TFn): string {
  if (item.tipo_prescripcion === "tiempo") return item.duracion || "-";
  return `${item.repeticiones || "-"} ${t("rutinas.repsShort")}`;
}

type Alumno = {
  id: string;
  nombre: string;
};

export default function VerRutinaPlantillaModal({
  open,
  onClose,
  rutinaId,
  profesorId,
}: VerRutinaPlantillaModalProps) {
  const [loading, setLoading] = useState(false);
  const [rutina, setRutina] = useState<RutinaData | null>(null);
  const [entradaCalor, setEntradaCalor] = useState<EntradaCalorEjercicio[]>([]);
  const [ejercicios, setEjercicios] = useState<RutinaEjercicio[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [mostrarAsignar, setMostrarAsignar] = useState(false);
  const { t } = useIdioma();

  useEffect(() => {
    if (!open || !rutinaId) return;

    let cancelled = false;

    async function cargarDatos() {
      setLoading(true);

      try {
        // 1. Cargar datos de la rutina
        const { data: rutinaData } = await supabase
          .from("rutinas")
          .select("id, nombre, objetivo, estructura")
          .eq("id", rutinaId)
          .single();

        if (cancelled) return;
        if (rutinaData) setRutina(rutinaData);

        // 2. Cargar entrada en calor
        const { data: entradaData } = await supabase
          .from("rutina_entrada_calor")
          .select("id, nombre_ejercicio, series, tipo_prescripcion, repeticiones, duracion, peso, porcentaje_rm, orden, modo, tiempo_limite, rondas_objetivo, descanso_entre_rondas, tipo_tiempo_circuito, duracion_ronda, bloque_id, bloque_orden")
          .eq("rutina_id", rutinaId)
          .order("orden", { ascending: true });

        if (!cancelled) {
          setEntradaCalor(entradaData || []);
        }

        // 3. Cargar ejercicios principales
        const { data: ejerciciosData } = await supabase
          .from("rutina_ejercicios")
          .select("id, nombre_ejercicio, series, tipo_prescripcion, repeticiones, duracion, peso, porcentaje_rm, rir, descanso, observaciones, orden, tipo_configuracion, modo, tiempo_limite, rondas_objetivo, descanso_entre_rondas, tipo_tiempo_circuito, duracion_ronda, bloque_id, bloque_orden")
          .eq("rutina_id", rutinaId)
          .order("orden", { ascending: true });

        if (!cancelled) {
          setEjercicios(ejerciciosData || []);
        }

        // 4. Cargar alumnos del profesor
        const { data: alumnosData } = await supabase
          .from("alumnos")
          .select("id, nombre")
          .eq("profesor_id", profesorId)
          .order("nombre");

        if (!cancelled) {
          setAlumnos(alumnosData || []);
        }
      } catch (error) {
        console.error("Error cargando datos de la rutina:", error);
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
  }, [open, rutinaId, profesorId]);

  async function handleAsignar(seleccionados: { id: string; nombre: string; fechaAsignacion?: string }[]) {
    const asignaciones = seleccionados.map((alumno) => ({
      alumno_id: alumno.id,
      rutina_id: rutinaId,
      fecha_asignacion: alumno.fechaAsignacion || new Date().toISOString().slice(0, 10),
      completada: false,
    }));

    const { error } = await supabase.from("rutina_asignaciones").insert(asignaciones);

    if (error) {
      throw new Error(error.message);
    }

    // Redirigir a /rutinas
    window.location.href = "/rutinas";
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
            <div>
              <p className="text-sm text-zinc-500">{t("rutinas.rutina")}</p>
              <h3 className="text-xl font-bold text-zinc-100 mt-1">
                🏋️ {rutina?.nombre || t("rutinas.cargando")}
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
                <div className="h-20 w-full rounded-xl bg-zinc-800" />
              </div>
            ) : (
              <>
                {/* Entrada en calor */}
                {entradaCalor.length > 0 && (() => {
                  const { sueltos, bloques } = agruparBloques(entradaCalor);
                  return (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wide">
                        🔥 {t("rutinas.entradaEnCalor")}
                      </p>
                      <div className="space-y-2">
                        {sueltos.map((ej) => (
                          <div
                            key={ej.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
                          >
                            <p className="font-semibold text-zinc-200 text-sm">
                              {ej.orden ? `${ej.orden}. ` : ""}{ej.nombre_ejercicio}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-400">
                              {ej.series && <span>{ej.series} {t("rutinas.series").toLowerCase()}</span>}
                              {ej.tipo_prescripcion === "tiempo" && ej.duracion && (
                                <span>| {ej.duracion}</span>
                              )}
                              {ej.tipo_prescripcion !== "tiempo" && ej.repeticiones && (
                                <span>| {ej.repeticiones} {t("rutinas.repsShort")}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {bloques.map((bloque) => (
                          <div
                            key={bloque[0]?.bloque_id || bloque[0]?.id}
                            className={`rounded-xl border p-3 ${bloque[0]?.modo === "amrap" ? "border-amber-500/30 bg-amber-500/5" : "border-cyan-500/30 bg-cyan-500/5"}`}
                          >
                            <p className={`font-semibold text-sm ${bloque[0]?.modo === "amrap" ? "text-amber-300" : "text-cyan-300"}`}>
                              {bloque[0]?.modo === "amrap" ? t("rutinas.modoAmrap") : t("rutinas.modoCircuito")}
                            </p>
                            <p className="text-xs text-zinc-400 mt-0.5">{descripcionBloque(bloque, t)}</p>
                            <div className="mt-2 space-y-1">
                              {bloque.map((ej, index) => (
                                <div key={ej.id} className="flex items-center justify-between gap-3 text-xs">
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
                    </div>
                  );
                })()}

                {/* Ejercicios principales */}
                {ejercicios.length > 0 && (() => {
                  const { sueltos, bloques } = agruparBloques(ejercicios);
                  return (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wide">
                        💪 {t("rutinas.ejerciciosPrincipales")}
                      </p>
                      <div className="space-y-2">
                        {sueltos.map((ej) => (
                          <div
                            key={ej.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
                          >
                            <p className="font-semibold text-zinc-200 text-sm">
                              {ej.orden ? `${ej.orden}. ` : ""}{ej.nombre_ejercicio}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                              {ej.series && <span>{ej.series} {t("rutinas.series").toLowerCase()}</span>}
                              {ej.repeticiones && <span>· {ej.repeticiones} {t("rutinas.repsShort")}</span>}
                              {ej.peso && <span>· {ej.peso}</span>}
                              {ej.porcentaje_rm && <span>· {ej.porcentaje_rm}{t("rutinas.porcentajeRM")}</span>}
                              {ej.rir && <span>· {t("rutinas.rir")}: {ej.rir}</span>}
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
                            className={`rounded-xl border p-3 ${bloque[0]?.modo === "amrap" ? "border-amber-500/30 bg-amber-500/5" : "border-cyan-500/30 bg-cyan-500/5"}`}
                          >
                            <p className={`font-semibold text-sm ${bloque[0]?.modo === "amrap" ? "text-amber-300" : "text-cyan-300"}`}>
                              {bloque[0]?.modo === "amrap" ? t("rutinas.modoAmrap") : t("rutinas.modoCircuito")}
                            </p>
                            <p className="text-xs text-zinc-400 mt-0.5">{descripcionBloque(bloque, t)}</p>
                            <div className="mt-2 space-y-1">
                              {bloque.map((ej, index) => (
                                <div key={ej.id} className="flex items-center justify-between gap-3 text-xs">
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
                    </div>
                  );
                })()}

                {/* Sin ejercicios */}
                {entradaCalor.length === 0 && ejercicios.length === 0 && (
                  <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-500">
                    <p className="text-sm">{t("rutinas.sinEjerciciosCargados")}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 flex gap-3 shrink-0 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              {t("rutinas.cerrar")}
            </button>
            <button
              type="button"
              onClick={() => setMostrarAsignar(true)}
              disabled={loading || !rutina}
              className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("rutinas.asignarAlumnos")}
            </button>
          </div>
        </div>
      </div>

      {/* AsignarModal */}
      {mostrarAsignar && (
        <AsignarModal
          tipo="alumnos"
          items={alumnos.map((a) => ({ id: a.id, nombre: a.nombre }))}
          onClose={() => setMostrarAsignar(false)}
          onConfirm={handleAsignar}
        />
      )}
    </>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";

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
  peso: string | null;
  porcentaje_rm: string | null;
  rir: string | null;
  descanso: string | null;
  observaciones: string | null;
  orden: number | null;
  tipo_configuracion: string | null;
};

type RegistroEntrenamiento = {
  id: string;
  nombre_ejercicio: string | null;
  numero_serie: number | null;
  peso_kg: number | null;
  repeticiones: number | null;
  rpe: number | null;
  rir: number | null;
};

type EjercicioAgrupado = {
  nombre: string;
  series: RegistroEntrenamiento[];
};

function agruparRegistrosPorEjercicio(registros: RegistroEntrenamiento[]): EjercicioAgrupado[] {
  const grupos = new Map<string, RegistroEntrenamiento[]>();

  registros.forEach((item) => {
    const nombre = item.nombre_ejercicio || "Ejercicio";
    const seriesActuales = grupos.get(nombre) || [];
    grupos.set(nombre, [...seriesActuales, item]);
  });

  return Array.from(grupos.entries()).map(([nombre, series]) => ({
    nombre,
    series: [...series].sort((a, b) => (a.numero_serie ?? 0) - (b.numero_serie ?? 0)),
  }));
}

export default function VerRutinaModal({
  open,
  onClose,
  asignacionId,
  completada,
}: VerRutinaModalProps) {
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
            .select("id, nombre_ejercicio, series, tipo_prescripcion, repeticiones, peso, porcentaje_rm, rir, descanso, observaciones, orden, tipo_configuracion")
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
            .select("id, nombre_ejercicio, numero_serie, peso_kg, repeticiones, rpe, rir")
            .eq("rutina_asignacion_id", asignacionId)
            .not("rutina_ejercicio_id", "is", null)
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

  const registrosAgrupados = agruparRegistrosPorEjercicio(registros);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
          <div>
            <p className="text-sm text-zinc-500">
              {completada ? "Rutina completada" : "Rutina pendiente"}
            </p>
            <h3 className="text-xl font-bold text-zinc-100 mt-1">
              🏋️ {rutina?.rutinas?.nombre || "Rutina"}
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
                  <p className="text-xs text-zinc-500 mb-1">Estado</p>
                  <p className="text-sm text-zinc-200">
                    {completada ? "Completada" : "Pendiente"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 mb-1">Fecha asignada</p>
                  <p className="text-sm text-zinc-200">
                    {formatearFechaCorta(rutina.fecha_asignacion) || "Sin fecha"}
                  </p>
                </div>

                {completada && rutina.fecha_completada && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Fecha completada</p>
                    <p className="text-sm text-zinc-200">
                      {formatearFechaCorta(rutina.fecha_completada)}
                    </p>
                  </div>
                )}

                {rutina.rutinas?.objetivo && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Objetivo</p>
                    <p className="text-sm text-zinc-200">{rutina.rutinas.objetivo}</p>
                  </div>
                )}

                {rutina.rutinas?.estructura && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Estructura</p>
                    <p className="text-sm text-zinc-200">{rutina.rutinas.estructura}</p>
                  </div>
                )}
              </div>

              {/* Ejercicios */}
              <div>
                <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wide">
                  Ejercicios
                </p>

                {/* Vista pendiente: muestra lo planificado */}
                {!completada && ejercicios.length === 0 && (
                  <p className="text-sm text-zinc-500">Sin ejercicios cargados.</p>
                )}

                {!completada && ejercicios.length > 0 && (
                  <div className="space-y-3">
                    {ejercicios.map((ej) => (
                      <div
                        key={ej.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                      >
                        <p className="font-semibold text-zinc-200">
                          {ej.orden ? `${ej.orden}. ` : ""}{ej.nombre_ejercicio}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-400">
                          {ej.series && <span>{ej.series} series</span>}
                          {ej.repeticiones && <span>x {ej.repeticiones} reps</span>}
                          {ej.peso && <span>| {ej.peso}</span>}
                          {ej.porcentaje_rm && <span>| {ej.porcentaje_rm}% RM</span>}
                          {ej.rir && <span>| RIR: {ej.rir}</span>}
                        </div>
                        {ej.descanso && (
                          <p className="text-xs text-zinc-500 mt-1">Descanso: {ej.descanso}</p>
                        )}
                        {ej.observaciones && (
                          <p className="text-xs text-zinc-500 mt-1">{ej.observaciones}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Vista completada: muestra registros reales */}
                {completada && registrosAgrupados.length === 0 && ejercicios.length > 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                    <p className="text-sm text-zinc-400">
                      Sin registros de entrenamiento guardados.
                    </p>
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
                            {grupo.series.length} {grupo.series.length === 1 ? "serie" : "series"}
                          </span>
                        </div>

                        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
                          <div className="grid grid-cols-5 bg-zinc-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            <span>Serie</span>
                            <span>Reps</span>
                            <span>Peso</span>
                            <span>RPE</span>
                            <span>RIR</span>
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
            <p className="text-zinc-400 text-sm">No se pudo cargar la informaci\u00f3n de la rutina.</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end shrink-0 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
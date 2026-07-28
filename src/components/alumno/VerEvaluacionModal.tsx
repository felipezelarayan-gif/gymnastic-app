"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import { useIdioma } from "@/lib/i18n-context";

type VerEvaluacionModalProps = {
  open: boolean;
  onClose: () => void;
  evaluacionId: string;
  subtipo: "rm" | "fms";
  completada?: boolean;
  permitirCargaAlumno?: boolean;
  vista?: "alumno" | "profesor";
};

type ResultadoRM = {
  id: string;
  ejercicio: string;
  peso_usado: number | null;
  repeticiones: number | null;
  rm_final: number | null;
};

type ResultadoFMS = {
  id: string;
  test_nombre: string;
  puntaje: number | null;
  puntaje_derecho: number | null;
  puntaje_izquierdo: number | null;
  observaciones: string | null;
};

type EvaluacionRM = {
  id: string;
  nombre?: string | null;
  fecha_realizacion: string | null;
  fecha_asignacion: string | null;
  observaciones: string | null;
  estado: string | null;
};

type EvaluacionFMS = {
  id: string;
  fecha_realizacion: string | null;
  fecha_asignacion: string | null;
  observaciones: string | null;
  estado: string | null;
  tests?: {
    test_nombre: string;
  }[];
};

export default function VerEvaluacionModal({
  open,
  onClose,
  evaluacionId,
  subtipo,
  completada = false,
  permitirCargaAlumno = false,
  vista = "alumno",
}: VerEvaluacionModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { formatearFechaCorta } = useFormatoFecha();
  const [evaluacion, setEvaluacion] = useState<EvaluacionRM | EvaluacionFMS | null>(null);
  const [resultadosRM, setResultadosRM] = useState<ResultadoRM[]>([]);
  const [resultadosFMS, setResultadosFMS] = useState<ResultadoFMS[]>([]);

  useEffect(() => {
    if (!open || !evaluacionId) return;

    let cancelled = false;

    async function cargarEvaluacion() {
      setLoading(true);

      try {
        if (subtipo === "rm") {
          const { data, error } = await supabase
            .from("evaluaciones_rm")
            .select(
              "id, nombre, fecha_realizacion, fecha_asignacion, observaciones, estado"
            )
            .eq("id", evaluacionId)
            .single();

          if (error || !data) {
            console.error("Error cargando evaluación RM:", error);
            setLoading(false);
            return;
          }

          if (!cancelled) {
            setEvaluacion(data as EvaluacionRM);
          }

          const { data: ejerciciosData } = await supabase
            .from("evaluaciones_rm_resultados")
            .select("id, peso_usado, repeticiones, rm_final, ejercicio:ejercicios(nombre)")
            .eq("evaluacion_rm_id", evaluacionId)
            .order("orden", { ascending: true });

          if (!cancelled) {
            const resultados = (ejerciciosData || []).map((r: any) => ({
              id: r.id,
              ejercicio: r.ejercicio?.nombre || "Ejercicio",
              peso_usado: r.peso_usado,
              repeticiones: r.repeticiones,
              rm_final: r.rm_final,
            }));
            setResultadosRM(resultados);
          }
        } else {
          const { data, error } = await supabase
            .from("evaluaciones_fms")
            .select("id, fecha_realizacion, fecha_asignacion, observaciones, estado")
            .eq("id", evaluacionId)
            .single();

          if (error || !data) {
            console.error("Error cargando evaluación FMS:", error);
            setLoading(false);
            return;
          }

          if (!cancelled) {
            setEvaluacion(data as EvaluacionFMS);
          }

          const { data: testsData } = await supabase
            .from("evaluaciones_fms_tests")
            .select("id, test_nombre, puntaje, puntaje_derecho, puntaje_izquierdo, observaciones")
            .eq("evaluacion_fms_id", evaluacionId)
            .order("created_at", { ascending: true });

          if (!cancelled) {
            setResultadosFMS((testsData || []) as ResultadoFMS[]);
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

    cargarEvaluacion();

    return () => {
      cancelled = true;
    };
  }, [open, evaluacionId, subtipo]);

  if (!open) return null;

  const esRM = subtipo === "rm";
  const esProfesor = vista === "profesor";
  const titulo = esRM ? "Evaluación RM" : "Evaluación FMS";
  const items = esRM
    ? resultadosRM.map((r) => r.ejercicio).filter(Boolean)
    : resultadosFMS.map((t) => t.test_nombre).filter(Boolean);

  function PUNTAJE_COLORS(puntaje: number | null) {
    if (puntaje === null) return "";
    if (puntaje === 0) return "bg-red-900/40 border-red-700 text-red-400";
    if (puntaje === 1) return "bg-orange-900/40 border-orange-700 text-orange-400";
    if (puntaje === 2) return "bg-yellow-900/40 border-yellow-700 text-yellow-400";
    return "bg-emerald-900/40 border-emerald-700 text-emerald-400";
  }

  function irARealizar() {
    router.push(`/evaluaciones/realizar/${subtipo}/${evaluacionId}`);
    onClose();
  }

  function irAModificar() {
    router.push(`/modificarEvaluacion?evaluacionId=${evaluacionId}&subtipo=${subtipo}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-xl font-bold text-zinc-100">{titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-32 rounded bg-zinc-800" />
              <div className="h-4 w-48 rounded bg-zinc-800" />
              <div className="h-4 w-40 rounded bg-zinc-800" />
              <div className="h-20 w-full rounded-xl bg-zinc-800" />
            </div>
          ) : evaluacion ? (
            <>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Tipo</p>
                  <p className="text-sm text-zinc-200">{esRM ? "Evaluación RM" : "Evaluación FMS"}</p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 mb-1">
                    {completada ? "Fecha completada" : "Fecha a realizar"}
                  </p>
                  <p className="text-sm text-zinc-200">
                    {formatearFechaCorta(
                      completada
                        ? evaluacion.fecha_realizacion
                        : (evaluacion as any).fecha_asignacion
                    ) || "Sin fecha"}
                  </p>
                </div>

                {evaluacion.observaciones && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Observaciones</p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{evaluacion.observaciones}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wide">
                  {esRM ? "Ejercicios" : "Tests"}
                </p>

                {!completada && items.length === 0 && (
                  <p className="text-sm text-zinc-500">Sin items cargados.</p>
                )}

                {!completada && items.length > 0 && (
                  <ul className="space-y-1">
                    {items.map((nombre, index) => (
                      <li key={index} className="text-sm text-zinc-300">
                        {index + 1}. {nombre}
                      </li>
                    ))}
                  </ul>
                )}

                {completada && esRM && resultadosRM.length > 0 && (
                  <div className="space-y-3">
                    {resultadosRM.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                      >
                        <p className="font-semibold text-zinc-200">{r.ejercicio}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-400">
                          <span>Peso: {r.peso_usado ?? "-"} kg</span>
                          <span>Reps: {r.repeticiones ?? "-"}</span>
                          <span className="text-emerald-400 font-semibold">
                            RM: {r.rm_final ?? "-"} kg
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {completada && !esRM && resultadosFMS.length > 0 && (
                  <div className="space-y-3">
                    {resultadosFMS.map((t) => {
                      const bilateral = t.puntaje_derecho !== null || t.puntaje_izquierdo !== null;
                      return (
                        <div
                          key={t.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-zinc-200">{t.test_nombre}</p>
                            {t.puntaje !== null && (
                              <span className={`shrink-0 text-sm font-bold px-3 py-1 rounded-full border ${PUNTAJE_COLORS(t.puntaje)}`}>
                                {t.puntaje}
                              </span>
                            )}
                          </div>
                          {bilateral && (
                            <div className="mt-2 flex gap-3 text-sm text-zinc-500">
                              <span>D: {t.puntaje_derecho ?? "-"}</span>
                              <span>I: {t.puntaje_izquierdo ?? "-"}</span>
                            </div>
                          )}
                          {t.observaciones && (
                            <p className="text-xs text-zinc-500 mt-2">{t.observaciones}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {completada && items.length === 0 && (
                  <p className="text-sm text-zinc-500">Sin resultados registrados.</p>
                )}
              </div>

              {!completada && !esProfesor && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  {permitirCargaAlumno ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-zinc-300">
                        Esta evaluación está lista para ser realizada. Podés cargar los resultados ahora.
                      </p>
                      <button
                        type="button"
                        onClick={irARealizar}
                        className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
                      >
                        Realizar evaluación
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-300">
                      Esta evaluación fue asignada para ser realizada por tu profesor. Podés ver los{" "}
                      {esRM ? "ejercicios" : "tests"}, pero no podés cargar resultados.
                    </p>
                  )}
                </div>
              )}

              {!completada && esProfesor && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-300">
                    <span className="font-semibold text-zinc-200">{items.length}</span>{" "}
                    {esRM ? "ejercicio" : "test"}
                    {items.length !== 1 ? "s" : ""} a evaluar.
                  </p>
                </div>
              )}

              {completada && esProfesor && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <button
                    type="button"
                    onClick={irAModificar}
                    className="w-full rounded-xl border border-amber-700 bg-amber-950/30 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:border-amber-500 hover:bg-amber-950/50 transition-colors"
                  >
                    Modificar resultados
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-zinc-400 text-sm">No se pudo cargar la información de la evaluación.</p>
          )}
        </div>

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
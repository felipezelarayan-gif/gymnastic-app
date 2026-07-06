"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type VerEvaluacionModalProps = {
  open: boolean;
  onClose: () => void;
  evaluacionId: string;
  subtipo: "rm" | "fms";
};

type EvaluacionRM = {
  id: string;
  nombre?: string | null;
  fecha_realizacion: string | null;
  observaciones: string | null;
  estado: string | null;
  resultados?: {
    ejercicio: {
      nombre: string;
    } | null;
  }[];
};

type EvaluacionFMS = {
  id: string;
  fecha_realizacion: string | null;
  observaciones: string | null;
  estado: string | null;
  tests?: {
    test_nombre: string;
  }[];
};

function formatearFecha(fecha: string | null) {
  if (!fecha) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(fecha));
}

export default function VerEvaluacionModal({
  open,
  onClose,
  evaluacionId,
  subtipo,
}: VerEvaluacionModalProps) {
  const [loading, setLoading] = useState(false);
  const [evaluacion, setEvaluacion] = useState<EvaluacionRM | EvaluacionFMS | null>(null);

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
              `
              id, nombre, fecha_realizacion, observaciones, estado,
              evaluaciones_rm_resultados (
                ejercicio:ejercicios (nombre)
              )
            `
            )
            .eq("id", evaluacionId)
            .single();

          if (error || !data) {
            console.error("Error cargando evaluación RM:", error);
            return;
          }

          if (!cancelled) {
            const resultadosNormalizados = (data as any).evaluaciones_rm_resultados?.map(
              (r: any) => ({
                ejercicio: Array.isArray(r.ejercicio) ? r.ejercicio[0] || null : r.ejercicio,
              })
            ) || [];

            setEvaluacion({
              ...data,
              resultados: resultadosNormalizados,
            } as EvaluacionRM);
          }
        } else {
          const { data, error } = await supabase
            .from("evaluaciones_fms")
            .select(
              `
              id, fecha_realizacion, observaciones, estado,
              evaluaciones_fms_tests (test_nombre)
            `
            )
            .eq("id", evaluacionId)
            .single();

          if (error || !data) {
            console.error("Error cargando evaluación FMS:", error);
            return;
          }

          if (!cancelled) {
            setEvaluacion({
              ...data,
              tests: (data as any).evaluaciones_fms_tests || [],
            } as EvaluacionFMS);
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
  const titulo = esRM ? "Evaluación RM" : "Evaluación FMS";
  const items = esRM
    ? (evaluacion as EvaluacionRM | null)?.resultados?.map((r) => r.ejercicio?.nombre).filter(Boolean) || []
    : (evaluacion as EvaluacionFMS | null)?.tests?.map((t) => t.test_nombre) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-zinc-100">{titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-zinc-400 text-sm">Cargando...</p>
        ) : evaluacion ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Tipo</p>
              <p className="text-sm text-zinc-200">{esRM ? "Evaluación RM" : "Evaluación FMS"}</p>
            </div>

            <div>
              <p className="text-xs text-zinc-500 mb-1">Fecha asignada</p>
              <p className="text-sm text-zinc-200">{formatearFecha(evaluacion.fecha_realizacion)}</p>
            </div>

            {evaluacion.observaciones && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Observaciones</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{evaluacion.observaciones}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-zinc-500 mb-2">
                {esRM ? "Ejercicios a evaluar" : "Tests a evaluar"}
              </p>
              {items.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin items cargados.</p>
              ) : (
                <ul className="space-y-1">
                  {items.map((nombre, index) => (
                    <li key={index} className="text-sm text-zinc-300">
                      {index + 1}. {nombre}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-300">
                Esta evaluación fue asignada para ser realizada por tu profesor. Podés ver los{" "}
                {esRM ? "ejercicios" : "tests"}, pero no podés cargar resultados.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-zinc-400 text-sm">No se pudo cargar la información de la evaluación.</p>
        )}

        <div className="mt-6 flex justify-end">
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
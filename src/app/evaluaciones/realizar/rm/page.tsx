"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";

type EvaluacionPendiente = {
  id: string;
  alumno_id: string;
  alumno_nombre: string;
  fecha_realizacion: string | null;
  observaciones: string | null;
  cantidad_ejercicios: number;
};

function formatearFecha(fecha: string | null) {
  if (!fecha) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(fecha));
}

export default function RealizarRM() {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  useEffect(() => {
    async function cargarEvaluacionesPendientes() {
      const { data: evaluacionesData, error: evaluacionesError } = await supabase
        .from("evaluaciones_rm")
        .select("id, alumno_id, fecha_realizacion, observaciones")
        .eq("estado", "pendiente")
        .is("deleted_at", null)
        .order("fecha_realizacion", { ascending: true });

      if (evaluacionesError) {
        alert(evaluacionesError.message);
        setLoading(false);
        return;
      }

      const evaluacionesBase = evaluacionesData || [];

      if (evaluacionesBase.length === 0) {
        setEvaluaciones([]);
        setLoading(false);
        return;
      }

      const alumnoIds = Array.from(
        new Set(evaluacionesBase.map((evaluacion) => evaluacion.alumno_id).filter(Boolean))
      );
      const evaluacionIds = evaluacionesBase.map((evaluacion) => evaluacion.id);

      const [{ data: alumnosData, error: alumnosError }, { data: resultadosData, error: resultadosError }] = await Promise.all([
        supabase.from("alumnos").select("id, nombre").in("id", alumnoIds),
        supabase.from("evaluaciones_rm_resultados").select("evaluacion_rm_id").in("evaluacion_rm_id", evaluacionIds),
      ]);

      if (alumnosError) {
        alert(alumnosError.message);
        setLoading(false);
        return;
      }

      if (resultadosError) {
        alert(resultadosError.message);
        setLoading(false);
        return;
      }

      const alumnosPorId = new Map((alumnosData || []).map((alumno) => [alumno.id, alumno.nombre]));
      const cantidadPorEvaluacion = new Map<string, number>();

      (resultadosData || []).forEach((resultado) => {
        cantidadPorEvaluacion.set(
          resultado.evaluacion_rm_id,
          (cantidadPorEvaluacion.get(resultado.evaluacion_rm_id) || 0) + 1
        );
      });

      setEvaluaciones(
        evaluacionesBase.map((evaluacion) => ({
          id: evaluacion.id,
          alumno_id: evaluacion.alumno_id,
          alumno_nombre: alumnosPorId.get(evaluacion.alumno_id) || "Alumno sin nombre",
          fecha_realizacion: evaluacion.fecha_realizacion,
          observaciones: evaluacion.observaciones,
          cantidad_ejercicios: cantidadPorEvaluacion.get(evaluacion.id) || 0,
        }))
      );

      setLoading(false);
    }

    cargarEvaluacionesPendientes();
  }, []);

  async function borrarEvaluacion(evaluacionId: string) {
    const confirmar = window.confirm(
      "⚠️ Esta acción eliminará permanentemente la evaluación RM y todos sus ejercicios asociados.\n\nEsta acción no se puede deshacer.\n\n¿Deseás continuar?"
    );

    if (!confirmar) return;

    setBorrandoId(evaluacionId);

    const { error: resultadosError } = await supabase
      .from("evaluaciones_rm_resultados")
      .delete()
      .eq("evaluacion_rm_id", evaluacionId);

    if (resultadosError) {
      alert(resultadosError.message);
      setBorrandoId(null);
      return;
    }

    const { error: evaluacionError } = await supabase
      .from("evaluaciones_rm")
      .delete()
      .eq("id", evaluacionId);

    if (evaluacionError) {
      alert(evaluacionError.message);
      setBorrandoId(null);
      return;
    }

    setEvaluaciones((prev) => prev.filter((evaluacion) => evaluacion.id !== evaluacionId));
    setBorrandoId(null);
  }

  if (loading) {
    return <main className="min-h-screen bg-zinc-950 text-white p-8">Cargando evaluaciones RM...</main>;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <BackButton />
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold">⚡ Evaluaciones RM pendientes</h1>
          <p className="text-zinc-400 mt-2">
            Elegí una evaluación pendiente para cargarla. Los ejercicios y el protocolo se cargan recién al entrar.
          </p>
        </header>

        {evaluaciones.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <p className="text-4xl mb-4">✅</p>
            <h2 className="text-xl font-bold">No hay evaluaciones RM pendientes</h2>
            <p className="text-zinc-400 mt-2">Cuando crees una evaluación RM, aparecerá en esta lista.</p>
            <Link
              href="/evaluaciones/crear/rm"
              className="inline-block mt-6 bg-white text-zinc-950 font-semibold px-5 py-2 rounded-lg hover:bg-zinc-200 transition"
            >
              Crear evaluación RM
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {evaluaciones.map((evaluacion) => (
              <div
                key={evaluacion.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Alumno</p>
                  <h2 className="text-lg font-semibold text-white">{evaluacion.alumno_nombre}</h2>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-zinc-400">
                    <span>Fecha: {formatearFecha(evaluacion.fecha_realizacion)}</span>
                    <span>•</span>
                    <span>{evaluacion.cantidad_ejercicios} ejercicios</span>
                  </div>
                  {evaluacion.observaciones && (
                    <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{evaluacion.observaciones}</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <Link
                    href={`/evaluaciones/realizar/rm/${evaluacion.id}`}
                    className="bg-white text-zinc-950 font-semibold px-5 py-3 rounded-lg hover:bg-zinc-200 transition text-center"
                  >
                    Realizar evaluación
                  </Link>
                  <button
                    type="button"
                    onClick={() => borrarEvaluacion(evaluacion.id)}
                    disabled={borrandoId === evaluacion.id}
                    title="Eliminar evaluación"
                    className="border border-red-900/60 text-red-400 font-semibold px-4 py-3 rounded-lg hover:bg-red-950/40 transition text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {borrandoId === evaluacion.id ? "⏳" : "🗑️"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
"use client";

import Link from "next/link";
import { formatearFechaCorta } from "@/lib/utils/formatearFecha";

type EvaluacionPendiente = {
  id: string;
  alumno_nombre: string;
  fecha_asignacion: string | null;
  observaciones: string | null;
  cantidad_items: number;
  label_items: string;
};

type Props = {
  evaluaciones: EvaluacionPendiente[];
  tipo: "rm" | "fms";
  borrandoId: string | null;
  emptyEmoji?: string;
  emptyTitulo?: string;
  onBorrar: (id: string) => void;
};

export default function EvaluacionPendienteList({
  evaluaciones,
  tipo,
  borrandoId,
  emptyEmoji = "✅",
  emptyTitulo = `No hay evaluaciones ${tipo.toUpperCase()} pendientes`,
  onBorrar,
}: Props) {
  if (evaluaciones.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-4xl mb-4">{emptyEmoji}</p>
        <h2 className="text-xl font-bold">{emptyTitulo}</h2>
        <p className="text-zinc-400 mt-2">Cuando crees una evaluación {tipo.toUpperCase()}, aparecerá en esta lista.</p>
        <Link
          href={`/evaluaciones/crear/${tipo}`}
          className="inline-block mt-6 bg-white text-zinc-950 font-semibold px-5 py-2 rounded-lg hover:bg-zinc-200 transition"
        >
          Crear evaluación {tipo.toUpperCase()}
        </Link>
      </div>
    );
  }

  return (
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
              <span>Fecha a realizar: {formatearFechaCorta(evaluacion.fecha_asignacion) || "Sin fecha"}</span>
              <span>•</span>
              <span>{evaluacion.cantidad_items} {evaluacion.label_items}</span>
            </div>
            {evaluacion.observaciones && (
              <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{evaluacion.observaciones}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link
              href={`/evaluaciones/realizar/${tipo}/${evaluacion.id}`}
              className="bg-white text-zinc-950 font-semibold px-5 py-3 rounded-lg hover:bg-zinc-200 transition text-center"
            >
              Realizar evaluación
            </Link>
            <button
              type="button"
              onClick={() => onBorrar(evaluacion.id)}
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
  );
}
"use client";

import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";

type DetalleEstadoAlumnoCard = {
  tipo: "rutina" | "evaluacion";
  subtipo?: string;
  nombre: string;
  fecha?: string | null;
  cantidad: number;
};

type EstadoAlumnoCardProps = {
  icono: string;
  titulo: string;
  descripcion: string;
  variante?: "verde" | "neutral";
  detalles?: DetalleEstadoAlumnoCard[];
};

export default function EstadoAlumnoCard({
  icono,
  titulo,
  descripcion,
  variante = "neutral",
  detalles,
}: EstadoAlumnoCardProps) {
  const estilos =
    variante === "verde"
      ? "bg-emerald-950/40 border-emerald-700/40"
      : "bg-zinc-900/40 border-zinc-800/60";

  const { formatearFechaCorta } = useFormatoFecha();

  return (
    <section className={`border rounded-3xl p-6 mb-5 ${estilos}`}>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl">{icono}</span>
        <div>
          <h2 className="text-2xl font-bold">{titulo}</h2>
          <p className="text-zinc-400 mt-1">{descripcion}</p>
        </div>
      </div>

      {detalles && detalles.length > 0 && (
        <div className="border-t border-zinc-800 pt-5 space-y-5">
          {detalles.map((detalle) => {
            const fecha = formatearFechaCorta(detalle.fecha);
            const etiquetaTipo =
              detalle.tipo === "rutina"
                ? detalle.cantidad === 1
                  ? "Rutina pendiente (1)"
                  : `Rutinas pendientes (${detalle.cantidad})`
                : detalle.cantidad === 1
                  ? "Evaluación pendiente (1)"
                  : `Evaluaciones pendientes (${detalle.cantidad})`;

            const iconoTipo = detalle.tipo === "rutina" ? "🏋️" : "📋";

            return (
              <div key={`${detalle.tipo}-${detalle.subtipo || "general"}-${detalle.nombre}`}>
                <p className="text-sm font-semibold text-zinc-300 mb-1">
                  {iconoTipo} {etiquetaTipo}
                </p>
                <p className="text-sm text-zinc-400 mb-1">
                  {detalle.tipo === "rutina" ? "Próxima rutina" : "Próxima evaluación"}
                </p>
                <p className="text-2xl font-bold leading-tight">{detalle.nombre}</p>
                {fecha && (
                  <p className="text-sm text-zinc-400 mt-1">
                    Fecha: {fecha}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

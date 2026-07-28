"use client";

import Link from "next/link";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import { useIdioma } from "@/lib/i18n-context";

type DetalleEstadoAlumnoCard = {
  tipo: "rutina" | "evaluacion";
  subtipo?: string;
  nombre: string;
  fecha?: string | null;
  cantidad: number;
  isOverdue?: boolean;
};

type EstadoAlumnoCardProps = {
  icono: string;
  titulo: string;
  descripcion: string;
  variante?: "verde" | "neutral";
  detalles?: DetalleEstadoAlumnoCard[];
  href?: string;
};

export default function EstadoAlumnoCard({
  icono,
  titulo,
  descripcion,
  variante = "neutral",
  detalles,
  href,
}: EstadoAlumnoCardProps) {
  const estilos =
    variante === "verde"
      ? "bg-emerald-950/40 border-emerald-700/40"
      : "bg-zinc-900/40 border-zinc-800/60";

  const { formatearFechaCorta } = useFormatoFecha();
  const { t } = useIdioma();

  const contenido = (
    <>
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl">{icono}</span>
        <div>
          <h2 className="text-xl font-semibold">{titulo}</h2>
          <p className="text-sm text-zinc-400 mt-0.5">{descripcion}</p>
        </div>
      </div>

      {detalles && detalles.length > 0 && (
        <div className="border-t border-zinc-800 pt-5 space-y-5">
          {detalles.map((detalle) => {
            const fecha = formatearFechaCorta(detalle.fecha);
            const etiquetaTipo =
              detalle.tipo === "rutina"
                ? detalle.cantidad === 1
                  ? t("alumno.rutinaPendienteSingular")
                  : t("alumno.rutinasPendientesCount", { count: detalle.cantidad })
                : detalle.cantidad === 1
                  ? t("alumno.evaluacionPendienteSingular")
                  : t("alumno.evaluacionesPendientesCount", { count: detalle.cantidad });

            const iconoTipo = detalle.tipo === "rutina" ? "🏋️" : "📋";

            return (
              <div key={`${detalle.tipo}-${detalle.subtipo || "general"}-${detalle.nombre}`}>
                <p className="text-xs font-semibold text-zinc-400 mb-0.5">
                  {iconoTipo} {etiquetaTipo}
                </p>
                <p className="text-lg font-bold leading-tight">{detalle.nombre}</p>
                {fecha && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {t("alumno.fecha")}: {fecha}
                    {detalle.isOverdue && (
                      <span className="text-red-400 ml-1 font-medium">{t("alumno.vencida")}</span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block border rounded-3xl p-6 mb-5 ${estilos} hover:bg-emerald-950/60 transition cursor-pointer`}>
        {contenido}
      </Link>
    );
  }

  return (
    <section className={`border rounded-3xl p-6 mb-5 ${estilos}`}>
    {contenido}
    </section>
  );
}

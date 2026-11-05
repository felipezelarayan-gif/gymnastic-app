import { parseFechaLocal } from "@/lib/utils/formatearFecha";
import type { PendienteAlumno } from "@/lib/alumno/obtenerPendientesAlumnos";

export type TraductorFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

/** Deja solo la parte YYYY-MM-DD de una fecha ISO. */
export function normalizarFecha(fecha?: string | null): string | null {
  if (!fecha) return null;
  return fecha.split("T")[0];
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local). */
export function hoyKey(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Timestamp para ordenar actividades; las que no tienen fecha van al final. */
export function obtenerTimestampActividad(actividad: PendienteAlumno): number {
  if (!actividad.fecha) return Number.MAX_SAFE_INTEGER;

  const timestamp =
    parseFechaLocal(actividad.fecha)?.getTime() ?? Number.MAX_SAFE_INTEGER;

  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

/** ¿La actividad está vencida respecto de la fecha indicada (YYYY-MM-DD)? */
export function esActividadVencida(
  actividad: PendienteAlumno,
  hoy: string,
): boolean {
  const fecha = normalizarFecha(actividad.fecha);
  return fecha !== null && fecha < hoy;
}

/**
 * Ordena por fecha ascendente y deja las vencidas primero.
 * Devuelve también los subconjuntos para no repetir los filtros.
 */
export function separarVencidas(
  actividades: PendienteAlumno[],
  hoy: string,
): { vencidas: PendienteAlumno[]; noVencidas: PendienteAlumno[] } {
  const ordenadas = [...actividades].sort(
    (a, b) => obtenerTimestampActividad(a) - obtenerTimestampActividad(b),
  );

  const vencidas: PendienteAlumno[] = [];
  const noVencidas: PendienteAlumno[] = [];

  for (const actividad of ordenadas) {
    if (esActividadVencida(actividad, hoy)) {
      vencidas.push(actividad);
    } else {
      noVencidas.push(actividad);
    }
  }

  return { vencidas, noVencidas };
}

/** Clave estable para usar en listas de React. */
export function claveActividad(actividad: PendienteAlumno): string {
  return `${actividad.tipo}-${actividad.subtipo || "general"}-${actividad.id}`;
}

export function obtenerIconoActividad(actividad: PendienteAlumno): string {
  return actividad.tipo === "rutina" ? "🏋️" : "📋";
}

export function obtenerHrefActividad(actividad: PendienteAlumno): string {
  if (actividad.tipo === "rutina") {
    return `/alumno/rutina/${actividad.id}`;
  }

  return actividad.href;
}

export function obtenerEtiquetaActividad(
  actividad: PendienteAlumno,
  t: TraductorFn,
): string {
  if (actividad.tipo === "rutina") return t("alumnos.etiquetaRutina");
  if (actividad.subtipo) {
    return `${t("evaluaciones.evaluacion")} ${actividad.subtipo.toUpperCase()}`;
  }
  return t("evaluaciones.evaluacion");
}

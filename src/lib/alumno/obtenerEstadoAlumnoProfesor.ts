/**
 * Determina el estado de un alumno para las vistas de profesor/admin/soporte.
 * 
 * Lógica:
 * - Si activoBD === false → "pausado" (🚫 Pausado, rojo)
 * - Si tiene asignaciones recientes (30 días) → "activo" (✅ Activo, verde)
 * - Si no → "inactivo" (⏸️ Inactivo, gris)
 */

export type EstadoAlumnoVista = "activo" | "inactivo" | "pausado";

export type EstadoAlumnoData = {
  estado: EstadoAlumnoVista;
  icono: string;
  label: string;
  colorClasses: string;
};

export function obtenerEstadoAlumnoProfesor(
  activoBD: boolean | null | undefined,
  tieneAsignacionesRecientes: boolean
): EstadoAlumnoData {
  // Si está pausado manualmente por el profesor
  if (activoBD === false) {
    return {
      estado: "pausado",
      icono: "🚫",
      label: "Pausado",
      colorClasses: "bg-red-500/10 text-red-400",
    };
  }

  // Si tiene actividad reciente
  if (tieneAsignacionesRecientes) {
    return {
      estado: "activo",
      icono: "✅",
      label: "Activo",
      colorClasses: "bg-emerald-500/10 text-emerald-400",
    };
  }

  // Sin actividad reciente
  return {
    estado: "inactivo",
    icono: "⏸️",
    label: "Inactivo",
    colorClasses: "bg-zinc-700 text-zinc-400",
  };
}
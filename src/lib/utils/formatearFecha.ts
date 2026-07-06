/**
 * Sistema centralizado de formateo de fechas
 * 
 * Formatos soportados:
 * - dd/mm/aa → 01/12/26
 * - dd/mm/aaaa → 01/12/2026
 * - mm/dd/aa → 12/01/26
 * - mm/dd/aaaa → 12/01/2026
 * - aaaa-mm-dd → 2026-12-01
 */

export type FormatoFecha = 
  | "dd/mm/aa" 
  | "dd/mm/aaaa" 
  | "mm/dd/aa" 
  | "mm/dd/aaaa" 
  | "aaaa-mm-dd";

const FORMATO_POR_DEFECTO: FormatoFecha = "dd/mm/aa";
const STORAGE_KEY = "formato_fecha";

/**
 * Parsea una fecha en formato YYYY-MM-DD sin problemas de UTC
 * Evita el error de new Date("2026-12-01") que puede interpretar como UTC
 */
export function parseFechaLocal(fecha: string | Date | null | undefined): Date | null {
  if (!fecha) return null;
  
  // Si ya es un Date, retornarlo
  if (fecha instanceof Date) {
    return isNaN(fecha.getTime()) ? null : fecha;
  }
  
  // Si es string en formato YYYY-MM-DD, parsearlo manualmente
  if (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [año, mes, dia] = fecha.split("-").map(Number);
    return new Date(año, mes - 1, dia);
  }
  
  // Para otros formatos, usar new Date
  const date = new Date(fecha);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Obtiene el formato de fecha guardado en localStorage
 */
export function obtenerFormatoFecha(): FormatoFecha {
  if (typeof window === "undefined") return FORMATO_POR_DEFECTO;
  
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado && esFormatoValido(guardado)) {
      return guardado as FormatoFecha;
    }
  } catch {
    // Si localStorage falla, usar el default
  }
  
  return FORMATO_POR_DEFECTO;
}

/**
 * Guarda el formato de fecha en localStorage
 */
export function guardarFormatoFecha(formato: FormatoFecha): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, formato);
  } catch {
    // Si localStorage falla, continuar silenciosamente
  }
}

/**
 * Verifica si un string es un formato válido
 */
function esFormatoValido(formato: string): formato is FormatoFecha {
  return [
    "dd/mm/aa",
    "dd/mm/aaaa", 
    "mm/dd/aa",
    "mm/dd/aaaa",
    "aaaa-mm-dd"
  ].includes(formato);
}

/**
 * Formatea una fecha según el formato especificado
 */
function formatearConFormato(
  fecha: Date,
  formato: FormatoFecha
): string {
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const año = fecha.getFullYear();
  const añoCorto = String(año).slice(-2);

  switch (formato) {
    case "dd/mm/aa":
      return `${dia}/${mes}/${añoCorto}`;
    case "dd/mm/aaaa":
      return `${dia}/${mes}/${año}`;
    case "mm/dd/aa":
      return `${mes}/${dia}/${añoCorto}`;
    case "mm/dd/aaaa":
      return `${mes}/${dia}/${año}`;
    case "aaaa-mm-dd":
      return `${año}-${mes}-${dia}`;
    default:
      return `${dia}/${mes}/${año}`;
  }
}

/**
 * Formatea una fecha corta (solo fecha, sin hora)
 * 
 * @param fecha - Fecha a formatear (puede ser string YYYY-MM-DD, Date, o null)
 * @param formato - Formato opcional (si no se especifica, usa el guardado en localStorage)
 * @returns Fecha formateada o string vacío si la fecha es inválida
 */
export function formatearFechaCorta(
  fecha: string | Date | null | undefined,
  formato?: FormatoFecha
): string {
  if (!fecha) return "";
  
  const date = parseFechaLocal(fecha);
  if (!date) return "";
  
  const formatoAUsar = formato || obtenerFormatoFecha();
  return formatearConFormato(date, formatoAUsar);
}

/**
 * Formatea una fecha con hora
 * 
 * @param fecha - Fecha a formatear
 * @param formato - Formato opcional (si no se especifica, usa el guardado en localStorage)
 * @returns Fecha y hora formateadas o string vacío si la fecha es inválida
 */
export function formatearFechaHora(
  fecha: string | Date | null | undefined,
  formato?: FormatoFecha
): string {
  if (!fecha) return "";
  
  const date = parseFechaLocal(fecha);
  if (!date) return "";
  
  const formatoAUsar = formato || obtenerFormatoFecha();
  const fechaFormateada = formatearConFormato(date, formatoAUsar);
  
  const horas = String(date.getHours()).padStart(2, "0");
  const minutos = String(date.getMinutes()).padStart(2, "0");
  
  return `${fechaFormateada} ${horas}:${minutos}`;
}

/**
 * Hook personalizado para usar el formato de fecha en componentes React
 * 
 * @returns Objeto con el formato actual y funciones para formatear
 * 
 * @example
 * const { formatearFechaCorta, formatearFechaHora, formato, cambiarFormato } = useFormatoFecha();
 */
export function useFormatoFecha() {
  // Este hook se implementará en un archivo separado para React
  // Por ahora retornamos las funciones base
  return {
    formatearFechaCorta,
    formatearFechaHora,
    obtenerFormatoFecha,
    guardarFormatoFecha,
  };
}
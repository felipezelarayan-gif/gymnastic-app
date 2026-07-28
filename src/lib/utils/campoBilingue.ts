import type { Idioma } from "@/lib/translations";

/**
 * Obtiene el valor de un campo bilingüe según el idioma del usuario.
 * 
 * @param row - El objeto que contiene los campos (ej: ejercicio, rutina)
 * @param campo - El nombre base del campo (ej: "nombre", "grupo_muscular")
 * @param idioma - El idioma del usuario ("es" | "en")
 * @returns El valor del campo en el idioma correspondiente, o un fallback
 */
export function campoBilingue<T extends Record<string, any>>(
  row: T,
  campo: string,
  idioma: Idioma,
): string {
  if (!row) return "";

  // Intentar con el idioma del usuario
  const valorIdioma = row[`${campo}_${idioma}`];
  if (valorIdioma && typeof valorIdioma === "string" && valorIdioma.trim()) {
    return valorIdioma;
  }

  // Fallback al otro idioma
  const otroIdioma = idioma === "es" ? "en" : "es";
  const valorOtro = row[`${campo}_${otroIdioma}`];
  if (valorOtro && typeof valorOtro === "string" && valorOtro.trim()) {
    return valorOtro;
  }

  // Fallback al campo original (datos viejos antes de la migración)
  const valorOriginal = row[campo];
  if (valorOriginal && typeof valorOriginal === "string") {
    return valorOriginal;
  }

  return "";
}
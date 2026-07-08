/**
 * Normaliza una relación de Supabase que puede venir como objeto, array o null.
 * Supabase a veces devuelve relaciones como `T` y otras veces como `T[]`.
 * Esta función unifica el comportamiento para siempre obtener un solo objeto o null.
 */
export function normalizarRelacion<T>(valor?: T | T[] | null): T | null {
  if (Array.isArray(valor)) return valor[0] || null;
  return valor || null;
}
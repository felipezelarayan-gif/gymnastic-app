"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FormatoFecha,
  formatearFechaCorta,
  formatearFechaHora,
  obtenerFormatoFecha,
  guardarFormatoFecha,
} from "./formatearFecha";

/**
 * Hook personalizado para usar el formato de fecha en componentes React
 * 
 * @returns Objeto con el formato actual y funciones para formatear
 * 
 * @example
 * const { formatearFechaCorta, formatearFechaHora, formato, cambiarFormato } = useFormatoFecha();
 * 
 * // En el componente:
 * <p>{formatearFechaCorta("2026-12-01")}</p>
 * // Muestra: 01/12/26 (o el formato configurado por el usuario)
 */
export function useFormatoFecha() {
  const [formato, setFormato] = useState<FormatoFecha>(obtenerFormatoFecha);
  const [mounted, setMounted] = useState(false);

  // Evitar problemas de hidratación en Next.js
  useEffect(() => {
    setMounted(true);
    setFormato(obtenerFormatoFecha());
  }, []);

  /**
   * Cambia el formato de fecha y lo guarda en localStorage
   */
  const cambiarFormato = useCallback((nuevoFormato: FormatoFecha) => {
    setFormato(nuevoFormato);
    guardarFormatoFecha(nuevoFormato);
  }, []);

  /**
   * Formatea una fecha corta usando el formato actual del usuario
   */
  const formatearCorta = useCallback(
    (fecha: string | Date | null | undefined) => {
      return formatearFechaCorta(fecha, formato);
    },
    [formato]
  );

  /**
   * Formatea una fecha con hora usando el formato actual del usuario
   */
  const formatearConHora = useCallback(
    (fecha: string | Date | null | undefined) => {
      return formatearFechaHora(fecha, formato);
    },
    [formato]
  );

  return {
    formato,
    cambiarFormato,
    formatearFechaCorta: formatearCorta,
    formatearFechaHora: formatearConHora,
    formatearFechaCortaConFormato: formatearFechaCorta,
    formatearFechaHoraConFormato: formatearFechaHora,
  };
}
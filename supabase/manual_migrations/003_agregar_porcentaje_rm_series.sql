-- ============================================================================
-- Migration: Agregar porcentaje_rm a rutina_ejercicio_series
-- Description: Agrega el campo porcentaje_rm a la tabla rutina_ejercicio_series
--              para permitir configurar series avanzadas con %RM además de peso fijo.
--
-- IMPORTANTE: Esta migración debe ejecutarse DESPUÉS de la migración v0.8.0
-- ============================================================================

-- Agregar columna porcentaje_rm si no existe
ALTER TABLE rutina_ejercicio_series
  ADD COLUMN IF NOT EXISTS porcentaje_rm text NULL;

-- Comentario: Este campo almacena el porcentaje de RM (ej: "50", "75", "0" para peso corporal)
-- Es mutuamente excluyente con el campo 'peso':
-- - Si porcentaje_rm tiene valor, peso debe ser NULL
-- - Si peso tiene valor, porcentaje_rm debe ser NULL
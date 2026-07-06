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
-- - Si peso tiene valor, porcentaje_rm debe ser NULL-- Agregar campo peso_corporal a ejercicios
ALTER TABLE ejercicios 
ADD COLUMN IF NOT EXISTS peso_corporal BOOLEAN DEFAULT FALSE;-- Normalización de Foreign Keys para rutinas e historial
-- Fecha: 2026-07-03
-- Objetivo:
-- - Las tablas de configuración eliminan sus hijos (CASCADE).
-- - Las tablas históricas conservan la información (SET NULL).

-- rutina_asignaciones -> rutinas
ALTER TABLE rutina_asignaciones
DROP CONSTRAINT rutina_asignaciones_rutina_id_fkey;

ALTER TABLE rutina_asignaciones
ADD CONSTRAINT rutina_asignaciones_rutina_id_fkey
FOREIGN KEY (rutina_id)
REFERENCES rutinas(id)
ON DELETE SET NULL;

-- registros_entrenamiento -> rutinas
ALTER TABLE registros_entrenamiento
DROP CONSTRAINT registros_entrenamiento_rutina_id_fkey;

ALTER TABLE registros_entrenamiento
ADD CONSTRAINT registros_entrenamiento_rutina_id_fkey
FOREIGN KEY (rutina_id)
REFERENCES rutinas(id)
ON DELETE SET NULL;

-- registros_entrenamiento -> rutina_asignaciones
ALTER TABLE registros_entrenamiento
DROP CONSTRAINT registros_entrenamiento_rutina_asignacion_id_fkey;

ALTER TABLE registros_entrenamiento
ADD CONSTRAINT registros_entrenamiento_rutina_asignacion_id_fkey
FOREIGN KEY (rutina_asignacion_id)
REFERENCES rutina_asignaciones(id)
ON DELETE SET NULL;

-- registros_entrenamiento -> rutina_ejercicios
ALTER TABLE registros_entrenamiento
DROP CONSTRAINT registros_entrenamiento_rutina_ejercicio_id_fkey;

ALTER TABLE registros_entrenamiento
ADD CONSTRAINT registros_entrenamiento_rutina_ejercicio_id_fkey
FOREIGN KEY (rutina_ejercicio_id)
REFERENCES rutina_ejercicios(id)
ON DELETE SET NULL;

-- rutina_ejercicio_series -> rutina_ejercicios
ALTER TABLE rutina_ejercicio_series
DROP CONSTRAINT rutina_ejercicio_series_rutina_ejercicio_id_fkey;

ALTER TABLE rutina_ejercicio_series
ADD CONSTRAINT rutina_ejercicio_series_rutina_ejercicio_id_fkey
FOREIGN KEY (rutina_ejercicio_id)
REFERENCES rutina_ejercicios(id)
ON DELETE CASCADE;

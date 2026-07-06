-- ============================================================================
-- Migration: Sincronizar producción con esquema local
-- Description: Agrega a producción las tablas y columnas que existen en local
--              pero no en producción.
--
-- Tabla nueva en producción: entrada_calor_completada
-- Columnas nuevas en producción:
--   - profiles: onboarding_completo, invitacion_pendiente
--   - rutinas: profesor_id
--   - rutina_ejercicios: tipo_configuracion
--   - rms_actuales: evaluacion_rm_id
--   - rms_historial: evaluacion_rm_id, evaluacion_rm_resultado_id
--   - rutina_ejercicio_series: porcentaje_rm
--   - ejercicios: peso_corporal
--
-- Idempotente: usa IF NOT EXISTS
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLA NUEVA: entrada_calor_completada
-- ============================================================================

CREATE TABLE IF NOT EXISTS entrada_calor_completada (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  asignacion_id uuid NOT NULL,
  item_index integer NOT NULL,
  completado boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT entrada_calor_completada_asignacion_id_item_index_key UNIQUE (asignacion_id, item_index)
);

-- Foreign key: entrada_calor_completada -> rutina_asignaciones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entrada_calor_completada_asignacion_id_fkey'
  ) THEN
    ALTER TABLE entrada_calor_completada
      ADD CONSTRAINT entrada_calor_completada_asignacion_id_fkey
      FOREIGN KEY (asignacion_id) REFERENCES rutina_asignaciones(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 2. COLUMNAS NUEVAS EN TABLAS EXISTENTES
-- ============================================================================

-- profiles: onboarding_completo, invitacion_pendiente
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completo boolean NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invitacion_pendiente boolean NULL DEFAULT true;

-- rutinas: profesor_id
ALTER TABLE rutinas
  ADD COLUMN IF NOT EXISTS profesor_id uuid NULL;

-- rutina_ejercicios: tipo_configuracion
ALTER TABLE rutina_ejercicios
  ADD COLUMN IF NOT EXISTS tipo_configuracion text NULL DEFAULT 'simple'::text;

-- rms_actuales: evaluacion_rm_id
ALTER TABLE rms_actuales
  ADD COLUMN IF NOT EXISTS evaluacion_rm_id uuid NULL;

-- rms_historial: evaluacion_rm_id, evaluacion_rm_resultado_id
ALTER TABLE rms_historial
  ADD COLUMN IF NOT EXISTS evaluacion_rm_id uuid NULL;

ALTER TABLE rms_historial
  ADD COLUMN IF NOT EXISTS evaluacion_rm_resultado_id uuid NULL;

-- rutina_ejercicio_series: porcentaje_rm
ALTER TABLE rutina_ejercicio_series
  ADD COLUMN IF NOT EXISTS porcentaje_rm text NULL;

-- ejercicios: peso_corporal
ALTER TABLE ejercicios
  ADD COLUMN IF NOT EXISTS peso_corporal BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 3. FOREIGN KEYS para las nuevas columnas
-- ============================================================================

-- rms_actuales.evaluacion_rm_id -> evaluaciones_rm.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rms_actuales_evaluacion_rm_id_fkey'
  ) THEN
    ALTER TABLE rms_actuales
      ADD CONSTRAINT rms_actuales_evaluacion_rm_id_fkey
      FOREIGN KEY (evaluacion_rm_id) REFERENCES evaluaciones_rm(id) ON DELETE SET NULL;
  END IF;
END $$;

-- rms_historial.evaluacion_rm_id -> evaluaciones_rm.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rms_historial_evaluacion_rm_id_fkey'
  ) THEN
    ALTER TABLE rms_historial
      ADD CONSTRAINT rms_historial_evaluacion_rm_id_fkey
      FOREIGN KEY (evaluacion_rm_id) REFERENCES evaluaciones_rm(id) ON DELETE SET NULL;
  END IF;
END $$;

-- rms_historial.evaluacion_rm_resultado_id -> evaluaciones_rm_resultados.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rms_historial_evaluacion_rm_resultado_id_fkey'
  ) THEN
    ALTER TABLE rms_historial
      ADD CONSTRAINT rms_historial_evaluacion_rm_resultado_id_fkey
      FOREIGN KEY (evaluacion_rm_resultado_id) REFERENCES evaluaciones_rm_resultados(id) ON DELETE SET NULL;
  END IF;
END $$;

-- rutinas.profesor_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rutinas_profesor_id_fkey'
  ) THEN
    ALTER TABLE rutinas
      ADD CONSTRAINT rutinas_profesor_id_fkey
      FOREIGN KEY (profesor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- 4. NORMALIZACIÓN DE FOREIGN KEYS (SET NULL para tablas históricas)
-- ============================================================================
-- Esto cambia las FK de CASCADE a SET NULL para preservar datos históricos

BEGIN;

-- rutina_asignaciones -> rutinas
ALTER TABLE IF EXISTS rutina_asignaciones
  DROP CONSTRAINT IF EXISTS rutina_asignaciones_rutina_id_fkey;

ALTER TABLE IF EXISTS rutina_asignaciones
  ADD CONSTRAINT rutina_asignaciones_rutina_id_fkey
  FOREIGN KEY (rutina_id)
  REFERENCES rutinas(id)
  ON DELETE SET NULL;

-- registros_entrenamiento -> rutinas
ALTER TABLE IF EXISTS registros_entrenamiento
  DROP CONSTRAINT IF EXISTS registros_entrenamiento_rutina_id_fkey;

ALTER TABLE IF EXISTS registros_entrenamiento
  ADD CONSTRAINT registros_entrenamiento_rutina_id_fkey
  FOREIGN KEY (rutina_id)
  REFERENCES rutinas(id)
  ON DELETE SET NULL;

-- registros_entrenamiento -> rutina_asignaciones
ALTER TABLE IF EXISTS registros_entrenamiento
  DROP CONSTRAINT IF EXISTS registros_entrenamiento_rutina_asignacion_id_fkey;

ALTER TABLE IF EXISTS registros_entrenamiento
  ADD CONSTRAINT registros_entrenamiento_rutina_asignacion_id_fkey
  FOREIGN KEY (rutina_asignacion_id)
  REFERENCES rutina_asignaciones(id)
  ON DELETE SET NULL;

-- registros_entrenamiento -> rutina_ejercicios
ALTER TABLE IF EXISTS registros_entrenamiento
  DROP CONSTRAINT IF EXISTS registros_entrenamiento_rutina_ejercicio_id_fkey;

ALTER TABLE IF EXISTS registros_entrenamiento
  ADD CONSTRAINT registros_entrenamiento_rutina_ejercicio_id_fkey
  FOREIGN KEY (rutina_ejercicio_id)
  REFERENCES rutina_ejercicios(id)
  ON DELETE SET NULL;

-- rutina_ejercicio_series -> rutina_ejercicios (mantiene CASCADE)
ALTER TABLE IF EXISTS rutina_ejercicio_series
  DROP CONSTRAINT IF EXISTS rutina_ejercicio_series_rutina_ejercicio_id_fkey;

ALTER TABLE IF EXISTS rutina_ejercicio_series
  ADD CONSTRAINT rutina_ejercicio_series_rutina_ejercicio_id_fkey
  FOREIGN KEY (rutina_ejercicio_id)
  REFERENCES rutina_ejercicios(id)
  ON DELETE CASCADE;

COMMIT;

-- ============================================================================
-- 5. ÍNDICES (mejora performance)
-- ============================================================================

-- Índice para búsquedas de entrada_calor_completada por asignación
CREATE INDEX IF NOT EXISTS idx_entrada_calor_asignacion
  ON entrada_calor_completada(asignacion_id);

-- Índice para búsquedas de rms_actuales por alumno y ejercicio
CREATE INDEX IF NOT EXISTS idx_rms_actuales_alumno_ejercicio
  ON rms_actuales(alumno_id, ejercicio_id);

-- Índice para búsquedas de rms_historial por alumno, rutina y asignación
CREATE INDEX IF NOT EXISTS idx_rms_historial_alumno_rutina_asignacion
  ON rms_historial(alumno_id, rutina_id, rutina_asignacion_id);

-- Índice para búsquedas de rms_historial por alumno, ejercicio y rm
CREATE INDEX IF NOT EXISTS idx_rms_historial_alumno_ejercicio_rm
  ON rms_historial(alumno_id, ejercicio_id, rm_calculado);

-- Índice para búsquedas de evaluaciones_rm por alumno
CREATE INDEX IF NOT EXISTS idx_evaluaciones_rm_alumno
  ON evaluaciones_rm(alumno_id);

-- Índice para búsquedas de evaluaciones_rm por profesor
CREATE INDEX IF NOT EXISTS idx_evaluaciones_rm_profesor
  ON evaluaciones_rm(profesor_id);

-- Índice para búsquedas de evaluaciones_rm por estado
CREATE INDEX IF NOT EXISTS idx_evaluaciones_rm_estado
  ON evaluaciones_rm(estado);

-- Índice para búsquedas de evaluaciones_fms por alumno
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fms_alumno
  ON evaluaciones_fms(alumno_id);

-- Índice para búsquedas de evaluaciones_fms por profesor
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fms_profesor
  ON evaluaciones_fms(profesor_id);

-- Índice para búsquedas de evaluaciones_fms por estado
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fms_estado
  ON evaluaciones_fms(estado);

-- Índice para búsquedas de evaluaciones_fms_tests por evaluacion
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fms_tests_eval
  ON evaluaciones_fms_tests(evaluacion_fms_id);

-- Índice para búsquedas de evaluaciones_rm_resultados por evaluacion
CREATE INDEX IF NOT EXISTS idx_evaluaciones_rm_resultados_eval
  ON evaluaciones_rm_resultados(evaluacion_rm_id);

-- Índice para búsquedas de evaluaciones_rm_resultados por ejercicio
CREATE INDEX IF NOT EXISTS idx_evaluaciones_rm_resultados_ejercicio
  ON evaluaciones_rm_resultados(ejercicio_id);

-- Índice para búsquedas parciales de evaluaciones_rm_resultados
CREATE INDEX IF NOT EXISTS idx_evaluaciones_rm_resultados_parcial
  ON evaluaciones_rm_resultados(evaluacion_rm_id, completado);

-- Índice para búsquedas de rutina_asignaciones por rutina
CREATE INDEX IF NOT EXISTS idx_asignaciones_rutina
  ON rutina_asignaciones(rutina_id);

-- Índice para búsquedas de rutina_asignaciones por alumno y fecha
CREATE INDEX IF NOT EXISTS idx_ra_alumno_fecha
  ON rutina_asignaciones(alumno_id, fecha_asignacion);

-- Índice para búsquedas de registros_entrenamiento por alumno y asignacion
CREATE INDEX IF NOT EXISTS idx_re_alumno_asignacion
  ON registros_entrenamiento(alumno_id, rutina_asignacion_id);

-- Índice para búsquedas de registros_entrenamiento por alumno, completado y fecha
CREATE INDEX IF NOT EXISTS idx_re_alumno_completado_created
  ON registros_entrenamiento(alumno_id, completado, created_at);

-- Índice para búsquedas de registros_entrenamiento por asignacion y ejercicio
CREATE INDEX IF NOT EXISTS idx_re_asignacion_ejercicio
  ON registros_entrenamiento(rutina_asignacion_id, rutina_ejercicio_id);

-- Índice para búsquedas de rutina_ejercicios por rutina y orden
CREATE INDEX IF NOT EXISTS idx_re_rutina_orden
  ON rutina_ejercicios(rutina_id, orden);

-- Índice para búsquedas de rutina_entrada_calor por rutina y orden
CREATE INDEX IF NOT EXISTS idx_rec_rutina_orden
  ON rutina_entrada_calor(rutina_id, orden);

-- Índice para búsquedas de registros_entrenamiento por alumno y asignacion (alternativo)
CREATE INDEX IF NOT EXISTS idx_registros_alumno_asignacion
  ON registros_entrenamiento(alumno_id, rutina_asignacion_id);

-- Índice para búsquedas de registros_entrenamiento por alumno y completado
CREATE INDEX IF NOT EXISTS idx_registros_alumno_completado
  ON registros_entrenamiento(alumno_id, completado);

-- Índice para búsquedas de registros_entrenamiento por ejercicio y asignacion
CREATE INDEX IF NOT EXISTS idx_registros_ejercicio_asignacion
  ON registros_entrenamiento(rutina_ejercicio_id, rutina_asignacion_id);

-- Índice para búsquedas de registros_entrenamiento por entrada_calor y asignacion
CREATE INDEX IF NOT EXISTS idx_registros_entrada_asignacion
  ON registros_entrenamiento(entrada_calor_id, rutina_asignacion_id);

-- Índice para búsquedas de rutina_ejercicio_series por ejercicio y serie
CREATE INDEX IF NOT EXISTS idx_res_ejercicio_serie
  ON rutina_ejercicio_series(rutina_ejercicio_id, numero_serie);

-- Índice único para rms_actuales por alumno y ejercicio
CREATE UNIQUE INDEX IF NOT EXISTS rms_actuales_alumno_id_ejercicio_id_key
  ON rms_actuales(alumno_id, ejercicio_id);

-- Índice único para alumnos por user_id
CREATE UNIQUE INDEX IF NOT EXISTS alumnos_user_id_unique
  ON alumnos(user_id);

-- ============================================================================
-- 6. QUERIES DE VERIFICACIÓN (comentadas)
-- ============================================================================

-- Verificar que entrada_calor_completada existe
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'entrada_calor_completada';

-- Verificar columnas nuevas
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE table_name IN ('profiles', 'rutinas', 'rutina_ejercicios', 'rms_actuales',
--                      'rms_historial', 'rutina_ejercicio_series', 'ejercicios')
--   AND column_name IN ('onboarding_completo', 'invitacion_pendiente', 'profesor_id',
--                       'tipo_configuracion', 'evaluacion_rm_id', 'evaluacion_rm_resultado_id',
--                       'porcentaje_rm', 'peso_corporal')
-- ORDER BY table_name, column_name;

-- Verificar índices creados
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY indexname;
-- ============================================================================
-- Migration: staging → v0.8.0
-- Description: Actualiza la estructura de staging agregando tablas nuevas y
--              columnas faltantes para acercarla a producción v0.8.0.
--              NO borra tablas, NO borra columnas, NO modifica datos.
--              NO toca RLS/policies.
--
-- Idempotente: usa IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
--              y bloques DO $$ para constraints.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. COLUMNAS FALTANTES EN TABLAS EXISTENTES
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

-- ============================================================================
-- 2. TABLAS NUEVAS
-- ============================================================================

-- 2.1 evaluacion_plantillas
CREATE TABLE IF NOT EXISTS evaluacion_plantillas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profesor_id uuid NULL,
  tipo text NOT NULL,
  nombre text NOT NULL,
  formato text NULL,
  modalidad text NOT NULL DEFAULT 'individual'::text,
  puede_cargar_alumno boolean NOT NULL DEFAULT false,
  observaciones text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  deleted_at timestamp with time zone NULL,
  PRIMARY KEY (id)
);

-- 2.2 evaluacion_plantilla_ejercicios
CREATE TABLE IF NOT EXISTS evaluacion_plantilla_ejercicios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plantilla_id uuid NOT NULL,
  ejercicio_id uuid NOT NULL,
  orden integer NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 2.3 evaluaciones_rm
CREATE TABLE IF NOT EXISTS evaluaciones_rm (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL,
  profesor_id uuid NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente'::text,
  asignada_al_alumno boolean NOT NULL DEFAULT false,
  puede_cargar_alumno boolean NOT NULL DEFAULT false,
  fecha_asignacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_realizacion timestamp with time zone NULL,
  cerrada_incompleta boolean NOT NULL DEFAULT false,
  observaciones text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone NULL,
  permitir_carga_alumno boolean NULL DEFAULT false,
  plantilla_id uuid NULL,
  nombre text NULL,
  formato text NULL,
  modalidad text NULL,
  PRIMARY KEY (id)
);

-- 2.4 evaluaciones_rm_resultados
CREATE TABLE IF NOT EXISTS evaluaciones_rm_resultados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  evaluacion_rm_id uuid NOT NULL,
  ejercicio_id uuid NOT NULL,
  metodo text NULL,
  peso_directo numeric NULL,
  intentos integer NULL,
  peso_usado numeric NULL,
  repeticiones integer NULL,
  formula text NULL DEFAULT 'epley'::text,
  rm_estimado numeric NULL,
  rm_final numeric NULL,
  completado boolean NOT NULL DEFAULT false,
  observaciones text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  protocolo jsonb NULL,
  progreso jsonb NULL,
  mejor_intento_numero integer NULL,
  actualizado_en timestamp without time zone NULL DEFAULT now(),
  orden integer NULL,
  PRIMARY KEY (id)
);

-- 2.5 evaluaciones_fms
CREATE TABLE IF NOT EXISTS evaluaciones_fms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL,
  profesor_id uuid NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente'::text,
  asignada_al_alumno boolean NOT NULL DEFAULT false,
  puede_cargar_alumno boolean NOT NULL DEFAULT false,
  fecha_asignacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_realizacion timestamp with time zone NULL,
  puntaje_total integer NULL DEFAULT 0,
  hay_dolor boolean NOT NULL DEFAULT false,
  hay_asimetrias boolean NOT NULL DEFAULT false,
  cerrada_incompleta boolean NOT NULL DEFAULT false,
  observaciones text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone NULL,
  permitir_carga_alumno boolean NULL DEFAULT false,
  PRIMARY KEY (id)
);

-- 2.6 evaluaciones_fms_tests
CREATE TABLE IF NOT EXISTS evaluaciones_fms_tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  evaluacion_fms_id uuid NOT NULL,
  test_nombre text NOT NULL,
  asignado boolean NOT NULL DEFAULT true,
  completado boolean NOT NULL DEFAULT false,
  puntaje integer NULL,
  puntaje_derecho integer NULL,
  puntaje_izquierdo integer NULL,
  dolor boolean NOT NULL DEFAULT false,
  asimetria boolean NOT NULL DEFAULT false,
  observaciones text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 2.7 rutina_ejercicio_series
CREATE TABLE IF NOT EXISTS rutina_ejercicio_series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rutina_ejercicio_id uuid NOT NULL,
  numero_serie integer NOT NULL,
  repeticiones text NULL,
  peso text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- ============================================================================
-- 3. FOREIGN KEYS (solo si no existen)
-- ============================================================================

-- evaluacion_plantillas.profesor_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluacion_plantillas_profesor_id_fkey'
  ) THEN
    ALTER TABLE evaluacion_plantillas
      ADD CONSTRAINT evaluacion_plantillas_profesor_id_fkey
      FOREIGN KEY (profesor_id) REFERENCES profiles(id);
  END IF;
END $$;

-- evaluacion_plantilla_ejercicios.plantilla_id -> evaluacion_plantillas.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluacion_plantilla_ejercicios_plantilla_id_fkey'
  ) THEN
    ALTER TABLE evaluacion_plantilla_ejercicios
      ADD CONSTRAINT evaluacion_plantilla_ejercicios_plantilla_id_fkey
      FOREIGN KEY (plantilla_id) REFERENCES evaluacion_plantillas(id);
  END IF;
END $$;

-- evaluacion_plantilla_ejercicios.ejercicio_id -> ejercicios.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluacion_plantilla_ejercicios_ejercicio_id_fkey'
  ) THEN
    ALTER TABLE evaluacion_plantilla_ejercicios
      ADD CONSTRAINT evaluacion_plantilla_ejercicios_ejercicio_id_fkey
      FOREIGN KEY (ejercicio_id) REFERENCES ejercicios(id);
  END IF;
END $$;

-- evaluaciones_rm.alumno_id -> alumnos.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_rm_alumno_id_fkey'
  ) THEN
    ALTER TABLE evaluaciones_rm
      ADD CONSTRAINT evaluaciones_rm_alumno_id_fkey
      FOREIGN KEY (alumno_id) REFERENCES alumnos(id);
  END IF;
END $$;

-- evaluaciones_rm.profesor_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_rm_profesor_id_fkey'
  ) THEN
    ALTER TABLE evaluaciones_rm
      ADD CONSTRAINT evaluaciones_rm_profesor_id_fkey
      FOREIGN KEY (profesor_id) REFERENCES profiles(id);
  END IF;
END $$;

-- evaluaciones_rm.plantilla_id -> evaluacion_plantillas.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_rm_plantilla_id_fkey'
  ) THEN
    ALTER TABLE evaluaciones_rm
      ADD CONSTRAINT evaluaciones_rm_plantilla_id_fkey
      FOREIGN KEY (plantilla_id) REFERENCES evaluacion_plantillas(id);
  END IF;
END $$;

-- evaluaciones_rm_resultados.evaluacion_rm_id -> evaluaciones_rm.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_rm_resultados_evaluacion_rm_id_fkey'
  ) THEN
    ALTER TABLE evaluaciones_rm_resultados
      ADD CONSTRAINT evaluaciones_rm_resultados_evaluacion_rm_id_fkey
      FOREIGN KEY (evaluacion_rm_id) REFERENCES evaluaciones_rm(id);
  END IF;
END $$;

-- evaluaciones_rm_resultados.ejercicio_id -> ejercicios.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_rm_resultados_ejercicio_id_fkey'
  ) THEN
    ALTER TABLE evaluaciones_rm_resultados
      ADD CONSTRAINT evaluaciones_rm_resultados_ejercicio_id_fkey
      FOREIGN KEY (ejercicio_id) REFERENCES ejercicios(id);
  END IF;
END $$;

-- evaluaciones_fms.alumno_id -> alumnos.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_fms_alumno_id_fkey'
  ) THEN
    ALTER TABLE evaluaciones_fms
      ADD CONSTRAINT evaluaciones_fms_alumno_id_fkey
      FOREIGN KEY (alumno_id) REFERENCES alumnos(id);
  END IF;
END $$;

-- evaluaciones_fms.profesor_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_fms_profesor_id_fkey'
  ) THEN
    ALTER TABLE evaluaciones_fms
      ADD CONSTRAINT evaluaciones_fms_profesor_id_fkey
      FOREIGN KEY (profesor_id) REFERENCES profiles(id);
  END IF;
END $$;

-- evaluaciones_fms_tests.evaluacion_fms_id -> evaluaciones_fms.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'evaluaciones_fms_tests_evaluacion_fms_id_fkey'
  ) THEN
    ALTER TABLE evaluaciones_fms_tests
      ADD CONSTRAINT evaluaciones_fms_tests_evaluacion_fms_id_fkey
      FOREIGN KEY (evaluacion_fms_id) REFERENCES evaluaciones_fms(id);
  END IF;
END $$;

-- rutina_ejercicio_series.rutina_ejercicio_id -> rutina_ejercicios.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rutina_ejercicio_series_rutina_ejercicio_id_fkey'
  ) THEN
    ALTER TABLE rutina_ejercicio_series
      ADD CONSTRAINT rutina_ejercicio_series_rutina_ejercicio_id_fkey
      FOREIGN KEY (rutina_ejercicio_id) REFERENCES rutina_ejercicios(id);
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- 4. QUERIES DE VERIFICACIÓN (comentados — ejecutar manualmente si se desea)
-- ============================================================================

-- 4.1 Listar tablas nuevas
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'evaluacion_plantillas',
--     'evaluacion_plantilla_ejercicios',
--     'evaluaciones_rm',
--     'evaluaciones_rm_resultados',
--     'evaluaciones_fms',
--     'evaluaciones_fms_tests',
--     'rutina_ejercicio_series'
--   )
-- ORDER BY table_name;

-- 4.2 Verificar columnas agregadas en tablas existentes
-- SELECT 'profiles' AS tabla, 'onboarding_completo' AS columna
-- WHERE EXISTS (SELECT 1 FROM information_schema.columns
--               WHERE table_name = 'profiles' AND column_name = 'onboarding_completo')
-- UNION ALL
-- SELECT 'profiles', 'invitacion_pendiente'
-- WHERE EXISTS (SELECT 1 FROM information_schema.columns
--               WHERE table_name = 'profiles' AND column_name = 'invitacion_pendiente')
-- UNION ALL
-- SELECT 'rutinas', 'profesor_id'
-- WHERE EXISTS (SELECT 1 FROM information_schema.columns
--               WHERE table_name = 'rutinas' AND column_name = 'profesor_id')
-- UNION ALL
-- SELECT 'rutina_ejercicios', 'tipo_configuracion'
-- WHERE EXISTS (SELECT 1 FROM information_schema.columns
--               WHERE table_name = 'rutina_ejercicios' AND column_name = 'tipo_configuracion')
-- UNION ALL
-- SELECT 'rms_actuales', 'evaluacion_rm_id'
-- WHERE EXISTS (SELECT 1 FROM information_schema.columns
--               WHERE table_name = 'rms_actuales' AND column_name = 'evaluacion_rm_id')
-- UNION ALL
-- SELECT 'rms_historial', 'evaluacion_rm_id'
-- WHERE EXISTS (SELECT 1 FROM information_schema.columns
--               WHERE table_name = 'rms_historial' AND column_name = 'evaluacion_rm_id')
-- UNION ALL
-- SELECT 'rms_historial', 'evaluacion_rm_resultado_id'
-- WHERE EXISTS (SELECT 1 FROM information_schema.columns
--               WHERE table_name = 'rms_historial' AND column_name = 'evaluacion_rm_resultado_id');

-- 4.3 Conteo de registros en tablas nuevas
-- SELECT 'evaluacion_plantillas' AS tabla, COUNT(*) AS cantidad FROM evaluacion_plantillas
-- UNION ALL
-- SELECT 'evaluacion_plantilla_ejercicios', COUNT(*) FROM evaluacion_plantilla_ejercicios
-- UNION ALL
-- SELECT 'evaluaciones_rm', COUNT(*) FROM evaluaciones_rm
-- UNION ALL
-- SELECT 'evaluaciones_rm_resultados', COUNT(*) FROM evaluaciones_rm_resultados
-- UNION ALL
-- SELECT 'evaluaciones_fms', COUNT(*) FROM evaluaciones_fms
-- UNION ALL
-- SELECT 'evaluaciones_fms_tests', COUNT(*) FROM evaluaciones_fms_tests
-- UNION ALL
-- SELECT 'rutina_ejercicio_series', COUNT(*) FROM rutina_ejercicio_series;
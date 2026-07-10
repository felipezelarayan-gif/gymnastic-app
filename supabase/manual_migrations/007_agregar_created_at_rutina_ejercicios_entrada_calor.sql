-- ============================================================================
-- Migration: Agregar created_at a rutina_ejercicios y rutina_entrada_calor
-- Description: Agrega la columna created_at a las tablas rutina_ejercicios y
--              rutina_entrada_calor para permitir auditoría y consistencia
--              con el resto del schema.
--
-- Motivo: La función editarRutinaParaAlumno en AlumnoRutinasProfesor.tsx
--         consulta created_at al duplicar rutinas, pero estas tablas no
--         tenían esa columna, provocando el error:
--         "column rutina_ejercicios.created_at does not exist"
--
-- Idempotente: usa IF NOT EXISTS
-- ============================================================================

BEGIN;

-- rutina_ejercicios: created_at
ALTER TABLE rutina_ejercicios
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NULL DEFAULT now();

-- rutina_entrada_calor: created_at
ALTER TABLE rutina_entrada_calor
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NULL DEFAULT now();

COMMIT;

-- ============================================================================
-- VERIFICACIÓN (opcional — ejecutar manualmente si se desea)
-- ============================================================================

-- SELECT 'rutina_ejercicios' AS tabla, column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'rutina_ejercicios' AND column_name = 'created_at'
-- UNION ALL
-- SELECT 'rutina_entrada_calor', column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'rutina_entrada_calor' AND column_name = 'created_at';
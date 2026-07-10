-- ============================================================================
-- Migration: Agregar índices de performance
-- Description: Optimiza las consultas más frecuentes de la aplicación
-- ============================================================================

-- Habilitar extensión pg_trgm para búsqueda por ILIKE
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. rutinas: Búsqueda por profesor + ordenamiento por fecha
CREATE INDEX IF NOT EXISTS idx_rutinas_profesor_created_at 
ON rutinas(profesor_id, created_at DESC);

-- 2. rutinas: Filtro por objetivo
CREATE INDEX IF NOT EXISTS idx_rutinas_profesor_objetivo 
ON rutinas(profesor_id, objetivo) 
WHERE objetivo IS NOT NULL;

-- 3. rutinas: Filtro por estructura
CREATE INDEX IF NOT EXISTS idx_rutinas_profesor_estructura 
ON rutinas(profesor_id, estructura) 
WHERE estructura IS NOT NULL;

-- 4. rutinas: Búsqueda por nombre (ILIKE)
CREATE INDEX IF NOT EXISTS idx_rutinas_nombre_trgm 
ON rutinas USING GIN (nombre gin_trgm_ops);

-- 5. rutina_ejercicios: Carga de ejercicios de una rutina
CREATE INDEX IF NOT EXISTS idx_rutina_ejercicios_rutina_orden 
ON rutina_ejercicios(rutina_id, orden);

-- 6. rutina_entrada_calor: Carga de entrada en calor
CREATE INDEX IF NOT EXISTS idx_rutina_entrada_calor_rutina_orden 
ON rutina_entrada_calor(rutina_id, orden);

-- 7. rutina_ejercicio_series: Carga de series por ejercicio
CREATE INDEX IF NOT EXISTS idx_rutina_ejercicio_series_ejercicio 
ON rutina_ejercicio_series(rutina_ejercicio_id, numero_serie);

-- 8. rutina_asignaciones: Búsqueda por rutina
CREATE INDEX IF NOT EXISTS idx_rutina_asignaciones_rutina 
ON rutina_asignaciones(rutina_id);

-- 9. rutina_asignaciones: Búsqueda por alumno
CREATE INDEX IF NOT EXISTS idx_rutina_asignaciones_alumno 
ON rutina_asignaciones(alumno_id);

-- 10. alumnos: Búsqueda por profesor
CREATE INDEX IF NOT EXISTS idx_alumnos_profesor_nombre 
ON alumnos(profesor_id, nombre);

-- 11. alumnos: Búsqueda por nombre (ILIKE)
CREATE INDEX IF NOT EXISTS idx_alumnos_nombre_trgm 
ON alumnos USING GIN (
  (COALESCE(nombre, '') || ' ' || COALESCE(apellido, '')) gin_trgm_ops
);

-- 12. registros_entrenamiento: Búsqueda por asignación
CREATE INDEX IF NOT EXISTS idx_registros_entrenamiento_asignacion 
ON registros_entrenamiento(rutina_asignacion_id);
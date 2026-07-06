-- Normalización de Foreign Keys para rutinas e historial
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

-- Registros de bloques AMRAP / circuito.
-- Un bloque (varios rutina_ejercicios con el mismo bloque_id) se completa como
-- una sola unidad: se guarda un único registro con las rondas realizadas en el
-- tiempo empleado. Estos registros NO generan RM (rm_calculado queda NULL).
ALTER TABLE registros_entrenamiento
  ADD COLUMN IF NOT EXISTS bloque_id uuid NULL,
  ADD COLUMN IF NOT EXISTS rondas_realizadas integer NULL,
  ADD COLUMN IF NOT EXISTS tiempo_empleado_seg integer NULL,
  ADD COLUMN IF NOT EXISTS objetivo_logrado boolean NULL;

ALTER TABLE registros_entrenamiento
  DROP CONSTRAINT IF EXISTS registros_entrenamiento_rondas_realizadas_check;

ALTER TABLE registros_entrenamiento
  ADD CONSTRAINT registros_entrenamiento_rondas_realizadas_check
  CHECK (rondas_realizadas IS NULL OR rondas_realizadas >= 0);

ALTER TABLE registros_entrenamiento
  DROP CONSTRAINT IF EXISTS registros_entrenamiento_tiempo_empleado_seg_check;

ALTER TABLE registros_entrenamiento
  ADD CONSTRAINT registros_entrenamiento_tiempo_empleado_seg_check
  CHECK (tiempo_empleado_seg IS NULL OR tiempo_empleado_seg >= 0);

CREATE INDEX IF NOT EXISTS idx_registros_entrenamiento_bloque
  ON registros_entrenamiento(bloque_id);

COMMENT ON COLUMN registros_entrenamiento.bloque_id IS
  'Agrupa el registro único de un bloque AMRAP o circuito (rutina_ejercicios.bloque_id).';
COMMENT ON COLUMN registros_entrenamiento.rondas_realizadas IS
  'Rondas ingresadas manualmente por el alumno al finalizar un bloque AMRAP o circuito.';
COMMENT ON COLUMN registros_entrenamiento.tiempo_empleado_seg IS
  'Segundos transcurridos desde que el alumno inició el bloque hasta finalizar o cortar.';
COMMENT ON COLUMN registros_entrenamiento.objetivo_logrado IS
  'True cuando rondas_realizadas alcanza rondas_objetivo del bloque.';

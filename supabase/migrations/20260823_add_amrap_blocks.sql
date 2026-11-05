-- Agrupa varios rutina_ejercicios en un único bloque AMRAP sin romper
-- los registros históricos que apuntan a cada ejercicio.
ALTER TABLE rutina_ejercicios
  ADD COLUMN IF NOT EXISTS bloque_id uuid NULL,
  ADD COLUMN IF NOT EXISTS bloque_orden integer NULL;

CREATE INDEX IF NOT EXISTS idx_rutina_ejercicios_bloque
  ON rutina_ejercicios(bloque_id, bloque_orden);

COMMENT ON COLUMN rutina_ejercicios.bloque_id IS
  'Identificador compartido por los ejercicios que forman un bloque AMRAP.';

COMMENT ON COLUMN rutina_ejercicios.bloque_orden IS
  'Orden del ejercicio dentro de su bloque AMRAP.';

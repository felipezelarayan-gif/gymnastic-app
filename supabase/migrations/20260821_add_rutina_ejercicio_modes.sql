-- Support explicit exercise modes while preserving existing routines.
ALTER TABLE rutina_ejercicios
  ADD COLUMN IF NOT EXISTS modo text NOT NULL DEFAULT 'ejercicio',
  ADD COLUMN IF NOT EXISTS tiempo_limite text NULL,
  ADD COLUMN IF NOT EXISTS rondas_objetivo integer NULL,
  ADD COLUMN IF NOT EXISTS descanso_entre_rondas text NULL;

UPDATE rutina_ejercicios
SET modo = 'ejercicio'
WHERE modo IS NULL;

ALTER TABLE rutina_ejercicios
  DROP CONSTRAINT IF EXISTS rutina_ejercicios_modo_check;

ALTER TABLE rutina_ejercicios
  ADD CONSTRAINT rutina_ejercicios_modo_check
  CHECK (modo IN ('ejercicio', 'amrap', 'circuito'));

CREATE INDEX IF NOT EXISTS idx_rutina_ejercicios_modo
  ON rutina_ejercicios(rutina_id, modo);
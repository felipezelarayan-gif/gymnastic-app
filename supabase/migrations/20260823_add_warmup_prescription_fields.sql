ALTER TABLE rutina_entrada_calor
  ADD COLUMN IF NOT EXISTS peso text NULL,
  ADD COLUMN IF NOT EXISTS porcentaje_rm text NULL,
  ADD COLUMN IF NOT EXISTS rir text NULL,
  ADD COLUMN IF NOT EXISTS descanso text NULL,
  ADD COLUMN IF NOT EXISTS tipo_configuracion text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS modo text NOT NULL DEFAULT 'ejercicio',
  ADD COLUMN IF NOT EXISTS tiempo_limite text NULL,
  ADD COLUMN IF NOT EXISTS rondas_objetivo integer NULL,
  ADD COLUMN IF NOT EXISTS descanso_entre_rondas text NULL,
  ADD COLUMN IF NOT EXISTS bloque_id uuid NULL,
  ADD COLUMN IF NOT EXISTS bloque_orden integer NULL;

ALTER TABLE rutina_entrada_calor
  DROP CONSTRAINT IF EXISTS rutina_entrada_calor_tipo_configuracion_check;

ALTER TABLE rutina_entrada_calor
  ADD CONSTRAINT rutina_entrada_calor_tipo_configuracion_check
  CHECK (tipo_configuracion IN ('simple', 'avanzado'));

CREATE TABLE IF NOT EXISTS rutina_entrada_calor_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rutina_entrada_calor_id uuid NOT NULL REFERENCES rutina_entrada_calor(id) ON DELETE CASCADE,
  numero_serie integer NOT NULL,
  repeticiones text NULL,
  peso text NULL,
  porcentaje_rm text NULL,
  UNIQUE (rutina_entrada_calor_id, numero_serie)
);

CREATE INDEX IF NOT EXISTS idx_rutina_entrada_calor_series_entrada
  ON rutina_entrada_calor_series(rutina_entrada_calor_id, numero_serie);

CREATE INDEX IF NOT EXISTS idx_rutina_entrada_calor_bloque
  ON rutina_entrada_calor(bloque_id, bloque_orden);

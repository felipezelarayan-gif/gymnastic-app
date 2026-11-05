ALTER TABLE rutina_ejercicio_series
  ADD COLUMN IF NOT EXISTS tipo_prescripcion text NOT NULL DEFAULT 'repeticiones',
  ADD COLUMN IF NOT EXISTS duracion text NULL;

ALTER TABLE rutina_ejercicio_series
  DROP CONSTRAINT IF EXISTS rutina_ejercicio_series_tipo_prescripcion_check;

ALTER TABLE rutina_ejercicio_series
  ADD CONSTRAINT rutina_ejercicio_series_tipo_prescripcion_check
  CHECK (tipo_prescripcion IN ('repeticiones', 'tiempo'));

ALTER TABLE rutina_ejercicio_series
  ADD COLUMN IF NOT EXISTS tipo_carga text NOT NULL DEFAULT 'peso_fijo';

ALTER TABLE rutina_ejercicio_series
  DROP CONSTRAINT IF EXISTS rutina_ejercicio_series_tipo_carga_check;

ALTER TABLE rutina_ejercicio_series
  ADD CONSTRAINT rutina_ejercicio_series_tipo_carga_check
  CHECK (tipo_carga IN ('peso_fijo', 'porcentaje_rm', 'peso_corporal'));

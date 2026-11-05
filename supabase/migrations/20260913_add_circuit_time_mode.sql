ALTER TABLE rutina_ejercicios
  ADD COLUMN IF NOT EXISTS tipo_tiempo_circuito text NULL,
  ADD COLUMN IF NOT EXISTS duracion_ronda text NULL;

ALTER TABLE rutina_entrada_calor
  ADD COLUMN IF NOT EXISTS tipo_tiempo_circuito text NULL,
  ADD COLUMN IF NOT EXISTS duracion_ronda text NULL;

ALTER TABLE rutina_ejercicios
  DROP CONSTRAINT IF EXISTS rutina_ejercicios_tipo_tiempo_circuito_check;

ALTER TABLE rutina_ejercicios
  ADD CONSTRAINT rutina_ejercicios_tipo_tiempo_circuito_check
  CHECK (tipo_tiempo_circuito IS NULL OR tipo_tiempo_circuito IN ('descanso_entre_rondas', 'duracion_ronda'));

ALTER TABLE rutina_entrada_calor
  DROP CONSTRAINT IF EXISTS rutina_entrada_calor_tipo_tiempo_circuito_check;

ALTER TABLE rutina_entrada_calor
  ADD CONSTRAINT rutina_entrada_calor_tipo_tiempo_circuito_check
  CHECK (tipo_tiempo_circuito IS NULL OR tipo_tiempo_circuito IN ('descanso_entre_rondas', 'duracion_ronda'));

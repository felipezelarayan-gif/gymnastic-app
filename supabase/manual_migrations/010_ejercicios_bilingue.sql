-- Agregar columnas bilingües a la tabla ejercicios
ALTER TABLE ejercicios 
  ADD COLUMN IF NOT EXISTS nombre_es TEXT,
  ADD COLUMN IF NOT EXISTS nombre_en TEXT,
  ADD COLUMN IF NOT EXISTS grupo_muscular_es TEXT,
  ADD COLUMN IF NOT EXISTS grupo_muscular_en TEXT;

-- Migrar datos existentes: nombre → nombre_es, grupo_muscular → grupo_muscular_es
UPDATE ejercicios SET nombre_es = nombre WHERE nombre_es IS NULL AND nombre IS NOT NULL;
UPDATE ejercicios SET grupo_muscular_es = grupo_muscular WHERE grupo_muscular_es IS NULL AND grupo_muscular IS NOT NULL;
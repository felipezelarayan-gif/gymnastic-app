-- Agregar campo peso_corporal a ejercicios
ALTER TABLE ejercicios 
ADD COLUMN IF NOT EXISTS peso_corporal BOOLEAN DEFAULT FALSE;
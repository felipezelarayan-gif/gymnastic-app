-- Migration: Agregar columna idioma a profiles
-- Description: Permite guardar la preferencia de idioma del usuario (es/en)
-- Idempotente: usa IF NOT EXISTS

BEGIN;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS idioma text NULL DEFAULT 'es';

COMMIT;
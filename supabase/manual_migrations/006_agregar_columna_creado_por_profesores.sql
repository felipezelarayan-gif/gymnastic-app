-- Agregar columna para registrar quién creó cada profesor
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Comentario para documentación
COMMENT ON COLUMN profiles.creado_por IS 'ID del administrador que creó este profesor (solo para rol=profe)';

-- Índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_creado_por ON profiles(creado_por) WHERE rol = 'profe';
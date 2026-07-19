-- ============================================================================
-- Migration: Agregar policy UPDATE para profesores en mensajes_soporte
-- Description: Permite que los profesores marquen como leídos los mensajes
--              donde destinatario_rol = 'profe' y el remitente sea alumno suyo.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "profes marcan leido sus mensajes" ON mensajes_soporte;
CREATE POLICY "profes marcan leido sus mensajes" ON mensajes_soporte
  FOR UPDATE
  TO public
  USING (
    destinatario_rol = 'profe' AND
    EXISTS (
      SELECT 1
      FROM alumnos a
      WHERE a.user_id = mensajes_soporte.remitente_id
        AND a.profesor_id = auth.uid()
    )
  )
  WITH CHECK (
    destinatario_rol = 'profe' AND
    EXISTS (
      SELECT 1
      FROM alumnos a
      WHERE a.user_id = mensajes_soporte.remitente_id
        AND a.profesor_id = auth.uid()
    )
  );

COMMIT;
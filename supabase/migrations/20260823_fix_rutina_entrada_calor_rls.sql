-- Permite que el profesor propietario de una rutina gestione su entrada en calor.
-- La tabla permanece protegida por RLS; el acceso se valida contra rutinas.profesor_id.

ALTER TABLE rutina_entrada_calor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profe gestiona entrada calor" ON rutina_entrada_calor;
DROP POLICY IF EXISTS "profesor propietario gestiona entrada calor" ON rutina_entrada_calor;

CREATE POLICY "profesor propietario gestiona entrada calor"
  ON rutina_entrada_calor
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM rutinas
      WHERE rutinas.id = rutina_entrada_calor.rutina_id
        AND rutinas.profesor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM rutinas
      WHERE rutinas.id = rutina_entrada_calor.rutina_id
        AND rutinas.profesor_id = auth.uid()
    )
  );

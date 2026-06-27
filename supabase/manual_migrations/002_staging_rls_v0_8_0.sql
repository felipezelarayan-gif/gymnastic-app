-- ============================================================================
-- Migration: staging RLS/policies → v0.8.0
-- Description: Activa RLS y crea policies en staging para igualar producción
--              v0.8.0. NO modifica datos, NO borra tablas, NO toca producción.
--
-- Idempotente: usa DROP POLICY IF EXISTS + CREATE POLICY en cada policy.
-- ============================================================================

-- NOTA: Verificar que existe la función public.es_profe() antes de ejecutar.
-- Si no existe, crearla o ajustar las policies que la usan.
-- SELECT proname FROM pg_proc WHERE proname = 'es_profe' AND pronamespace = 'public'::regnamespace;

BEGIN;

-- ============================================================================
-- 1. ACTIVAR RLS EN TABLAS QUE PRODUCCIÓN TIENE CON RLS ACTIVO
--    (No se activa en: alumno_rm, ejercicios, entrada_calor_completada)
-- ============================================================================

ALTER TABLE IF EXISTS alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evaluacion_plantilla_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evaluacion_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evaluaciones_fms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evaluaciones_fms_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evaluaciones_rm ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evaluaciones_rm_resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS registros_entrenamiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rms_actuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rms_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rutina_asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rutina_ejercicio_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rutina_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rutina_entrada_calor ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rutinas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. POLICIES — alumnos
-- ============================================================================

DROP POLICY IF EXISTS "alumno ve su propio registro" ON alumnos;
CREATE POLICY "alumno ve su propio registro" ON alumnos
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "alumnos update own profile" ON alumnos;
CREATE POLICY "alumnos update own profile" ON alumnos
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "profe borra sus alumnos" ON alumnos;
CREATE POLICY "profe borra sus alumnos" ON alumnos
  FOR DELETE
  TO authenticated
  USING (profesor_id = auth.uid());

DROP POLICY IF EXISTS "profe crea sus alumnos" ON alumnos;
CREATE POLICY "profe crea sus alumnos" ON alumnos
  FOR INSERT
  TO authenticated
  WITH CHECK (profesor_id = auth.uid());

DROP POLICY IF EXISTS "profe edita sus alumnos" ON alumnos;
CREATE POLICY "profe edita sus alumnos" ON alumnos
  FOR UPDATE
  TO authenticated
  USING (profesor_id = auth.uid())
  WITH CHECK (profesor_id = auth.uid());

DROP POLICY IF EXISTS "profe ve sus alumnos" ON alumnos;
CREATE POLICY "profe ve sus alumnos" ON alumnos
  FOR SELECT
  TO authenticated
  USING (profesor_id = auth.uid());

-- ============================================================================
-- 3. POLICIES — evaluacion_plantilla_ejercicios
-- ============================================================================

DROP POLICY IF EXISTS "Alumnos pueden ver ejercicios de plantillas asignadas" ON evaluacion_plantilla_ejercicios;
CREATE POLICY "Alumnos pueden ver ejercicios de plantillas asignadas" ON evaluacion_plantilla_ejercicios
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM evaluacion_plantillas p
      JOIN evaluaciones_rm er ON er.plantilla_id = p.id
      JOIN alumnos a ON a.id = er.alumno_id
      WHERE p.id = evaluacion_plantilla_ejercicios.plantilla_id
        AND a.user_id = auth.uid()
        AND er.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Profesores pueden crear ejercicios de sus plantillas" ON evaluacion_plantilla_ejercicios;
CREATE POLICY "Profesores pueden crear ejercicios de sus plantillas" ON evaluacion_plantilla_ejercicios
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM evaluacion_plantillas p
      WHERE p.id = evaluacion_plantilla_ejercicios.plantilla_id
        AND p.profesor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Profesores pueden ver ejercicios de sus plantillas" ON evaluacion_plantilla_ejercicios;
CREATE POLICY "Profesores pueden ver ejercicios de sus plantillas" ON evaluacion_plantilla_ejercicios
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM evaluacion_plantillas p
      WHERE p.id = evaluacion_plantilla_ejercicios.plantilla_id
        AND p.profesor_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. POLICIES — evaluacion_plantillas
-- ============================================================================

DROP POLICY IF EXISTS "Alumnos pueden ver plantillas de sus evaluaciones RM" ON evaluacion_plantillas;
CREATE POLICY "Alumnos pueden ver plantillas de sus evaluaciones RM" ON evaluacion_plantillas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM evaluaciones_rm er
      JOIN alumnos a ON a.id = er.alumno_id
      WHERE er.plantilla_id = evaluacion_plantillas.id
        AND a.user_id = auth.uid()
        AND er.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Profesores pueden actualizar sus plantillas" ON evaluacion_plantillas;
CREATE POLICY "Profesores pueden actualizar sus plantillas" ON evaluacion_plantillas
  FOR UPDATE
  TO public
  USING (auth.uid() = profesor_id)
  WITH CHECK (auth.uid() = profesor_id);

DROP POLICY IF EXISTS "Profesores pueden crear plantillas" ON evaluacion_plantillas;
CREATE POLICY "Profesores pueden crear plantillas" ON evaluacion_plantillas
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = profesor_id);

DROP POLICY IF EXISTS "Profesores pueden ver plantillas" ON evaluacion_plantillas;
CREATE POLICY "Profesores pueden ver plantillas" ON evaluacion_plantillas
  FOR SELECT
  TO public
  USING (auth.uid() = profesor_id);

-- ============================================================================
-- 5. POLICIES — evaluaciones_fms
-- ============================================================================

DROP POLICY IF EXISTS "Alumnos pueden actualizar FMS autorizado" ON evaluaciones_fms;
CREATE POLICY "Alumnos pueden actualizar FMS autorizado" ON evaluaciones_fms
  FOR UPDATE
  TO authenticated
  USING (
    puede_cargar_alumno = true
    AND EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = evaluaciones_fms.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    puede_cargar_alumno = true
    AND EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = evaluaciones_fms.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Alumnos pueden ver sus evaluaciones FMS" ON evaluaciones_fms;
CREATE POLICY "Alumnos pueden ver sus evaluaciones FMS" ON evaluaciones_fms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = evaluaciones_fms.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Profes pueden gestionar evaluaciones FMS" ON evaluaciones_fms;
CREATE POLICY "Profes pueden gestionar evaluaciones FMS" ON evaluaciones_fms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.rol = 'profe' OR profiles.es_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.rol = 'profe' OR profiles.es_admin = true)
    )
  );

-- ============================================================================
-- 6. POLICIES — evaluaciones_fms_tests
-- ============================================================================

DROP POLICY IF EXISTS "Alumnos pueden cargar tests FMS autorizados" ON evaluaciones_fms_tests;
CREATE POLICY "Alumnos pueden cargar tests FMS autorizados" ON evaluaciones_fms_tests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM evaluaciones_fms ef
      JOIN alumnos a ON a.id = ef.alumno_id
      WHERE ef.id = evaluaciones_fms_tests.evaluacion_fms_id
        AND a.user_id = auth.uid()
        AND ef.puede_cargar_alumno = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM evaluaciones_fms ef
      JOIN alumnos a ON a.id = ef.alumno_id
      WHERE ef.id = evaluaciones_fms_tests.evaluacion_fms_id
        AND a.user_id = auth.uid()
        AND ef.puede_cargar_alumno = true
    )
  );

DROP POLICY IF EXISTS "Alumnos pueden ver tests FMS propios" ON evaluaciones_fms_tests;
CREATE POLICY "Alumnos pueden ver tests FMS propios" ON evaluaciones_fms_tests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM evaluaciones_fms ef
      JOIN alumnos a ON a.id = ef.alumno_id
      WHERE ef.id = evaluaciones_fms_tests.evaluacion_fms_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Profes pueden gestionar tests FMS" ON evaluaciones_fms_tests;
CREATE POLICY "Profes pueden gestionar tests FMS" ON evaluaciones_fms_tests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.rol = 'profe' OR profiles.es_admin = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.rol = 'profe' OR profiles.es_admin = true)
    )
  );

-- ============================================================================
-- 7. POLICIES — evaluaciones_rm
-- ============================================================================

DROP POLICY IF EXISTS "Alumnos pueden actualizar RM autorizado" ON evaluaciones_rm;
CREATE POLICY "Alumnos pueden actualizar RM autorizado" ON evaluaciones_rm
  FOR UPDATE
  TO authenticated
  USING (
    puede_cargar_alumno = true
    AND EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = evaluaciones_rm.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    puede_cargar_alumno = true
    AND EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = evaluaciones_rm.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Alumnos pueden ver sus evaluaciones RM" ON evaluaciones_rm;
CREATE POLICY "Alumnos pueden ver sus evaluaciones RM" ON evaluaciones_rm
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = evaluaciones_rm.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Profes gestionan sus evaluaciones RM" ON evaluaciones_rm;
CREATE POLICY "Profes gestionan sus evaluaciones RM" ON evaluaciones_rm
  FOR ALL
  TO authenticated
  USING (profesor_id = auth.uid())
  WITH CHECK (profesor_id = auth.uid());

-- ============================================================================
-- 8. POLICIES — evaluaciones_rm_resultados
-- ============================================================================

DROP POLICY IF EXISTS "Alumnos pueden cargar resultados RM autorizados" ON evaluaciones_rm_resultados;
CREATE POLICY "Alumnos pueden cargar resultados RM autorizados" ON evaluaciones_rm_resultados
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM evaluaciones_rm er
      JOIN alumnos a ON a.id = er.alumno_id
      WHERE er.id = evaluaciones_rm_resultados.evaluacion_rm_id
        AND a.user_id = auth.uid()
        AND er.puede_cargar_alumno = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM evaluaciones_rm er
      JOIN alumnos a ON a.id = er.alumno_id
      WHERE er.id = evaluaciones_rm_resultados.evaluacion_rm_id
        AND a.user_id = auth.uid()
        AND er.puede_cargar_alumno = true
    )
  );

DROP POLICY IF EXISTS "Alumnos pueden ver resultados RM propios" ON evaluaciones_rm_resultados;
CREATE POLICY "Alumnos pueden ver resultados RM propios" ON evaluaciones_rm_resultados
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM evaluaciones_rm er
      JOIN alumnos a ON a.id = er.alumno_id
      WHERE er.id = evaluaciones_rm_resultados.evaluacion_rm_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Profes gestionan resultados de sus evaluaciones RM" ON evaluaciones_rm_resultados;
CREATE POLICY "Profes gestionan resultados de sus evaluaciones RM" ON evaluaciones_rm_resultados
  FOR ALL
  TO authenticated
  USING (
    evaluacion_rm_id IN (
      SELECT evaluaciones_rm.id
      FROM evaluaciones_rm
      WHERE evaluaciones_rm.profesor_id = auth.uid()
    )
  )
  WITH CHECK (
    evaluacion_rm_id IN (
      SELECT evaluaciones_rm.id
      FROM evaluaciones_rm
      WHERE evaluaciones_rm.profesor_id = auth.uid()
    )
  );

-- ============================================================================
-- 9. POLICIES — profiles
-- ============================================================================

DROP POLICY IF EXISTS "profe puede ver profiles" ON profiles;
CREATE POLICY "profe puede ver profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (es_profe());

DROP POLICY IF EXISTS "usuario actualiza su propio profile" ON profiles;
CREATE POLICY "usuario actualiza su propio profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "usuario ve su propio profile" ON profiles;
CREATE POLICY "usuario ve su propio profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ============================================================================
-- 10. POLICIES — registros_entrenamiento
-- ============================================================================

DROP POLICY IF EXISTS "Profes pueden borrar registros_entrenamiento" ON registros_entrenamiento;
CREATE POLICY "Profes pueden borrar registros_entrenamiento" ON registros_entrenamiento
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'profe'
    )
  );

DROP POLICY IF EXISTS "alumno borra sus registros de entrenamiento" ON registros_entrenamiento;
CREATE POLICY "alumno borra sus registros de entrenamiento" ON registros_entrenamiento
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = registros_entrenamiento.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumno crea sus registros de entrenamiento" ON registros_entrenamiento;
CREATE POLICY "alumno crea sus registros de entrenamiento" ON registros_entrenamiento
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = registros_entrenamiento.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumno ve sus registros de entrenamiento" ON registros_entrenamiento;
CREATE POLICY "alumno ve sus registros de entrenamiento" ON registros_entrenamiento
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = registros_entrenamiento.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profe ve registros de entrenamiento" ON registros_entrenamiento;
CREATE POLICY "profe ve registros de entrenamiento" ON registros_entrenamiento
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'profe'
    )
  );

DROP POLICY IF EXISTS "profes y admins crean registros de entrenamiento" ON registros_entrenamiento;
CREATE POLICY "profes y admins crean registros de entrenamiento" ON registros_entrenamiento
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = ANY (ARRAY['profe', 'profesor', 'admin', 'soporte'])
    )
  );

-- ============================================================================
-- 11. POLICIES — rms_actuales
-- ============================================================================

DROP POLICY IF EXISTS "Profes pueden borrar rms_actuales" ON rms_actuales;
CREATE POLICY "Profes pueden borrar rms_actuales" ON rms_actuales
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'profe'
    )
  );

DROP POLICY IF EXISTS "alumno actualiza sus rms actuales" ON rms_actuales;
CREATE POLICY "alumno actualiza sus rms actuales" ON rms_actuales
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = rms_actuales.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = rms_actuales.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumno borra sus rms actuales" ON rms_actuales;
CREATE POLICY "alumno borra sus rms actuales" ON rms_actuales
  FOR DELETE
  TO authenticated
  USING (
    alumno_id IN (
      SELECT a.id
      FROM alumnos a
      WHERE a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumno crea sus rms actuales" ON rms_actuales;
CREATE POLICY "alumno crea sus rms actuales" ON rms_actuales
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = rms_actuales.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumno ve sus rms actuales" ON rms_actuales;
CREATE POLICY "alumno ve sus rms actuales" ON rms_actuales
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = rms_actuales.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profe actualiza rms actuales" ON rms_actuales;
CREATE POLICY "profe actualiza rms actuales" ON rms_actuales
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.rol = 'profe'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.rol = 'profe'
    )
  );

DROP POLICY IF EXISTS "profe borra rms actuales" ON rms_actuales;
CREATE POLICY "profe borra rms actuales" ON rms_actuales
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.rol = 'profe'
    )
  );

DROP POLICY IF EXISTS "profe crea rms actuales" ON rms_actuales;
CREATE POLICY "profe crea rms actuales" ON rms_actuales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.rol = 'profe'
    )
  );

DROP POLICY IF EXISTS "profe ve rms actuales" ON rms_actuales;
CREATE POLICY "profe ve rms actuales" ON rms_actuales
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.rol = 'profe'
    )
  );

-- ============================================================================
-- 12. POLICIES — rms_historial
-- ============================================================================

DROP POLICY IF EXISTS "Profes pueden borrar rms_historial" ON rms_historial;
CREATE POLICY "Profes pueden borrar rms_historial" ON rms_historial
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'profe'
    )
  );

DROP POLICY IF EXISTS "alumno borra su historial rm" ON rms_historial;
CREATE POLICY "alumno borra su historial rm" ON rms_historial
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM alumnos a
      WHERE a.id = rms_historial.alumno_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumno crea historial rm" ON rms_historial;
CREATE POLICY "alumno crea historial rm" ON rms_historial
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = rms_historial.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumno ve su historial rm" ON rms_historial;
CREATE POLICY "alumno ve su historial rm" ON rms_historial
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM alumnos a
      WHERE a.id = rms_historial.alumno_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profe crea rms historial" ON rms_historial;
CREATE POLICY "profe crea rms historial" ON rms_historial
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'profe'
    )
  );

DROP POLICY IF EXISTS "profe ve historial rm" ON rms_historial;
CREATE POLICY "profe ve historial rm" ON rms_historial
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.rol = 'profe'
    )
  );

-- ============================================================================
-- 13. POLICIES — rutina_asignaciones
-- ============================================================================

DROP POLICY IF EXISTS "Alumno puede actualizar sus propias asignaciones" ON rutina_asignaciones;
CREATE POLICY "Alumno puede actualizar sus propias asignaciones" ON rutina_asignaciones
  FOR UPDATE
  TO authenticated
  USING (
    alumno_id IN (
      SELECT alumnos.id
      FROM alumnos
      WHERE alumnos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    alumno_id IN (
      SELECT alumnos.id
      FROM alumnos
      WHERE alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumno ve sus asignaciones" ON rutina_asignaciones;
CREATE POLICY "alumno ve sus asignaciones" ON rutina_asignaciones
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM alumnos
      WHERE alumnos.id = rutina_asignaciones.alumno_id
        AND alumnos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profe gestiona sus asignaciones" ON rutina_asignaciones;
CREATE POLICY "profe gestiona sus asignaciones" ON rutina_asignaciones
  FOR ALL
  TO authenticated
  USING (
    alumno_id IN (
      SELECT alumnos.id
      FROM alumnos
      WHERE alumnos.profesor_id = auth.uid()
    )
  )
  WITH CHECK (
    alumno_id IN (
      SELECT alumnos.id
      FROM alumnos
      WHERE alumnos.profesor_id = auth.uid()
    )
  );

-- ============================================================================
-- 14. POLICIES — rutina_ejercicio_series
-- ============================================================================

DROP POLICY IF EXISTS "alumno ve series de sus rutinas" ON rutina_ejercicio_series;
CREATE POLICY "alumno ve series de sus rutinas" ON rutina_ejercicio_series
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM rutina_ejercicios re
      JOIN rutina_asignaciones ra ON ra.rutina_id = re.rutina_id
      JOIN alumnos a ON a.id = ra.alumno_id
      WHERE re.id = rutina_ejercicio_series.rutina_ejercicio_id
        AND ra.activa = true
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profe gestiona rutina_ejercicio_series" ON rutina_ejercicio_series;
CREATE POLICY "profe gestiona rutina_ejercicio_series" ON rutina_ejercicio_series
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'profe'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'profe'
    )
  );

-- ============================================================================
-- 15. POLICIES — rutina_ejercicios
-- ============================================================================

DROP POLICY IF EXISTS "Permitir lectura rutina_ejercicios a autenticados" ON rutina_ejercicios;
CREATE POLICY "Permitir lectura rutina_ejercicios a autenticados" ON rutina_ejercicios
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "alumno ve ejercicios de sus rutinas" ON rutina_ejercicios;
CREATE POLICY "alumno ve ejercicios de sus rutinas" ON rutina_ejercicios
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM rutina_asignaciones ra
      JOIN alumnos a ON a.id = ra.alumno_id
      WHERE ra.rutina_id = rutina_ejercicios.rutina_id
        AND ra.activa = true
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profe gestiona rutina_ejercicios" ON rutina_ejercicios;
CREATE POLICY "profe gestiona rutina_ejercicios" ON rutina_ejercicios
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'profe'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'profe'
    )
  );

-- ============================================================================
-- 16. POLICIES — rutina_entrada_calor
-- ============================================================================

DROP POLICY IF EXISTS "alumno ve entrada en calor de sus rutinas" ON rutina_entrada_calor;
CREATE POLICY "alumno ve entrada en calor de sus rutinas" ON rutina_entrada_calor
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM rutina_asignaciones ra
      JOIN alumnos a ON a.id = ra.alumno_id
      WHERE ra.rutina_id = rutina_entrada_calor.rutina_id
        AND ra.activa = true
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profe gestiona entrada calor" ON rutina_entrada_calor;
CREATE POLICY "profe gestiona entrada calor" ON rutina_entrada_calor
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'profe'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.rol = 'profe'
    )
  );

-- ============================================================================
-- 17. POLICIES — rutinas
-- ============================================================================

DROP POLICY IF EXISTS "Alumnos pueden ver rutinas asignadas" ON rutinas;
CREATE POLICY "Alumnos pueden ver rutinas asignadas" ON rutinas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM rutina_asignaciones ra
      JOIN alumnos a ON a.id = ra.alumno_id
      WHERE ra.rutina_id = rutinas.id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "alumno ve sus rutinas asignadas" ON rutinas;
CREATE POLICY "alumno ve sus rutinas asignadas" ON rutinas
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM rutina_asignaciones ra
      JOIN alumnos a ON a.id = ra.alumno_id
      WHERE ra.rutina_id = rutinas.id
        AND ra.activa = true
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profe gestiona sus rutinas" ON rutinas;
CREATE POLICY "profe gestiona sus rutinas" ON rutinas
  FOR ALL
  TO authenticated
  USING (profesor_id = auth.uid())
  WITH CHECK (profesor_id = auth.uid());

COMMIT;

-- ============================================================================
-- 18. QUERIES DE VERIFICACIÓN (comentados — ejecutar manualmente si se desea)
-- ============================================================================

-- 18.1 Tablas con RLS activo
-- SELECT tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND rowsecurity = true
-- ORDER BY tablename;

-- 18.2 Listar policies por tabla (nombre, comando, definición usando, definición con check)
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- 18.3 Cantidad de policies por tabla
-- SELECT
--   tablename,
--   COUNT(*) AS cantidad_policies
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY tablename
-- ORDER BY tablename;

-- 18.4 Cantidad total de policies
-- SELECT COUNT(*) AS total_policies
-- FROM pg_policies
-- WHERE schemaname = 'public';
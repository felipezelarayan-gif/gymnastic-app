-- Índices de performance para las páginas /alumno, /alumno/rutina, /alumno/rutina/planificacion y /alumnos.
-- Estas tablas se consultan filtrando por alumno_id (y estado/origen/fecha) y sólo tenían la PK.

-- rms_historial: usado por obtenerRMsActualesAlumnoBase (mejor RM del alumno).
CREATE INDEX IF NOT EXISTS idx_rms_historial_alumno_origen_fecha
  ON rms_historial (alumno_id, origen, fecha DESC);

-- evaluaciones_rm / evaluaciones_fms: usadas por obtenerPendientesAlumno y obtenerMetricasResumen.
CREATE INDEX IF NOT EXISTS idx_evaluaciones_rm_alumno_estado
  ON evaluaciones_rm (alumno_id, estado);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_fms_alumno_estado
  ON evaluaciones_fms (alumno_id, estado);

-- rutina_asignaciones: conteos de pendientes/completadas por alumno.
CREATE INDEX IF NOT EXISTS idx_rutina_asignaciones_alumno_completada
  ON rutina_asignaciones (alumno_id, completada);

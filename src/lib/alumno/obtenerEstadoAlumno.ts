import type { ResumenPendientesAlumno } from "./obtenerPendientesAlumnos";

export type EstadoAlumno =
  | "bienvenido"
  | "rutina"
  | "evaluacion"
  | "rutina-evaluacion"
  | "sin-pendientes";

export type DatosEstadoAlumno = {
  pendientes: ResumenPendientesAlumno;
  tieneHistorial: boolean;
};

function hoyKey(): string {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type DetalleEstadoAlumno = {
  tipo: "rutina" | "evaluacion";
  subtipo?: string;
  nombre: string;
  fecha?: string | null;
  cantidad: number;
  puedeCargarAlumno?: boolean | null;
  isOverdue?: boolean;
};

export type EstadoAlumnoCardData = {
  estado: EstadoAlumno;
  icono: string;
  titulo: string;
  descripcion: string;
  detalles?: DetalleEstadoAlumno[];
  variante: "neutral" | "verde";
};

export function obtenerEstadoAlumno({
  pendientes,
  tieneHistorial,
}: DatosEstadoAlumno): EstadoAlumnoCardData {
  function obtenerMasProxima<T extends { fecha?: string | null }>(items: T[]) {
    return [...items].sort((a, b) => {
      const fechaA = a.fecha ? new Date(a.fecha).getTime() : Number.POSITIVE_INFINITY;
      const fechaB = b.fecha ? new Date(b.fecha).getTime() : Number.POSITIVE_INFINITY;

      return fechaA - fechaB;
    })[0];
  }

  const cantidadRutinasPendientes = pendientes.rutinasPendientes.length;
  const cantidadEvaluacionesPendientes = pendientes.evaluacionesPendientes.length;

  const rutinaPendiente = obtenerMasProxima(pendientes.rutinasPendientes);
  const evaluacionPendiente = obtenerMasProxima(pendientes.evaluacionesPendientes);

  const hoy = hoyKey();
  const esVencida = (fecha?: string | null) => {
    if (!fecha) return false;
    return fecha.split("T")[0] < hoy;
  };

  const detallesRutinas = rutinaPendiente
    ? [
        {
          tipo: "rutina" as const,
          nombre: rutinaPendiente.nombre,
          fecha: rutinaPendiente.fecha,
          cantidad: cantidadRutinasPendientes,
          isOverdue: esVencida(rutinaPendiente.fecha),
        },
      ]
    : [];

  const detallesEvaluaciones = evaluacionPendiente
    ? [
        {
          tipo: "evaluacion" as const,
          subtipo: evaluacionPendiente.subtipo,
          nombre: evaluacionPendiente.nombre,
          fecha: evaluacionPendiente.fecha,
          cantidad: cantidadEvaluacionesPendientes,
          puedeCargarAlumno: evaluacionPendiente.puedeCargarAlumno,
          isOverdue: esVencida(evaluacionPendiente.fecha),
        },
      ]
    : [];

  const tieneRutinasPendientes = cantidadRutinasPendientes > 0;
  const tieneEvaluacionesPendientes = cantidadEvaluacionesPendientes > 0;

  const evaluacionesSoloProfesor = pendientes.evaluacionesPendientes.filter(
    (evaluacion) => evaluacion.puedeCargarAlumno === false
  );
  const evaluacionesAlumno = pendientes.evaluacionesPendientes.filter(
    (evaluacion) => evaluacion.puedeCargarAlumno === true
  );

  if (tieneRutinasPendientes && tieneEvaluacionesPendientes) {
    const descripcion = evaluacionesSoloProfesor.length > 0
      ? "Tenés actividades pendientes. Algunas evaluaciones las completa tu profesor."
      : "Tenés actividades pendientes.";

    // Mostrar solo la más cercana entre todas las pendientes
    const masCercana = obtenerMasProxima([
      ...pendientes.rutinasPendientes,
      ...pendientes.evaluacionesPendientes,
    ]);

    const detalle = masCercana ? [{
      tipo: (masCercana.tipo === "rutina" ? "rutina" : "evaluacion") as "rutina" | "evaluacion",
      subtipo: masCercana.subtipo,
      nombre: masCercana.nombre,
      fecha: masCercana.fecha,
      cantidad: masCercana.tipo === "rutina" ? cantidadRutinasPendientes : cantidadEvaluacionesPendientes,
      puedeCargarAlumno: masCercana.tipo === "evaluacion" ? (masCercana as any).puedeCargarAlumno : undefined,
      isOverdue: esVencida(masCercana.fecha),
    }] : [];

    return {
      estado: "rutina-evaluacion",
      icono: "💪",
      titulo: "Tenés actividades pendientes",
      descripcion,
      detalles: detalle,
      variante: "verde",
    };
  }

  if (tieneRutinasPendientes) {
    return {
      estado: "rutina",
      icono: "💪",
      titulo: "Tenés una rutina pendiente",
      descripcion: "Tu profesor ya dejó una rutina lista para completar.",
      detalles: detallesRutinas.length > 0 ? detallesRutinas : undefined,
      variante: "verde",
    };
  }

  if (tieneEvaluacionesPendientes) {
    const descripcion = evaluacionesAlumno.length === 0
      ? "Hay evaluaciones asignadas que completará tu profesor."
      : evaluacionesSoloProfesor.length > 0
        ? "Hay evaluaciones asignadas. Algunas las completás vos y otras las completa tu profesor."
        : "Hay una evaluación esperando ser completada desde tu cuenta.";

    return {
      estado: "evaluacion",
      icono: "📋",
      titulo: "Tenés evaluaciones pendientes",
      descripcion,
      detalles: detallesEvaluaciones.length > 0 ? detallesEvaluaciones : undefined,
      variante: "verde",
    };
  }

  if (!tieneHistorial) {
    return {
      estado: "bienvenido",
      icono: "👋",
      titulo: "Bienvenido",
      descripcion:
        "Todavía no tenés rutinas ni evaluaciones asignadas. Cuando tu profesor cargue una actividad, la vas a ver acá.",
      variante: "neutral",
    };
  }

  return {
    estado: "sin-pendientes",
    icono: "✅",
    titulo: "Todo al día",
    descripcion:
      "No tenés rutinas ni evaluaciones pendientes por el momento.",
    variante: "verde",
  };
}
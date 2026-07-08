"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUnsavedChanges } from "@/lib/unsaved-changes-context";
import { borrarRutina as borrarRutinaLib } from "@/lib/rutinas/borrarRutina";
import { guardarRutina } from "@/lib/rutinas/guardarRutina";
import { eliminarAsignacion } from "@/lib/rutinas/eliminarAsignacion";
import { getRolCached } from "@/lib/rol-cache";
import CrearEjercicioModal from "@/components/ejercicios/CrearEjercicioModal";
import EjercicioHistorialModal from "@/components/ejercicios/EjercicioHistorialModal";
import SelectorTiempo from "@/components/ui/SelectorTiempo";
import {
  getEjerciciosBasicosCached,
  invalidarEjerciciosCache,
} from "@/lib/ejercicios-cache";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import AsignarModal from "@/components/shared/AsignarModal";

type TipoPrescripcion = "repeticiones" | "tiempo";

type TipoConfiguracionSeries = "simple" | "avanzado";

type EstadoElemento = "sinCambios" | "nuevo" | "editado" | "eliminado";

type Rutina = {
  id: string;
  nombre: string;
  descripcion?: string;
  objetivo?: string;
  estructura?: string;
  entrada_calor?: string;
  _estado?: EstadoElemento;
};

type Ejercicio = {
  id: string;
  nombre: string;
  grupo_muscular?: string;
};

type RutinaEjercicio = {
  _localId: string;
  id?: string;
  rutina_id: string;
  ejercicio_id?: string | null;
  nombre_ejercicio: string;
  series?: number | null;
  tipo_prescripcion?: TipoPrescripcion | null;
  repeticiones?: string | null;
  duracion?: string | null;
  peso?: string | null;
  descanso?: string | null;
  rir?: string | null;
  porcentaje_rm?: string | null;
  observaciones?: string | null;
  orden?: number | null;
  tipo_configuracion?: TipoConfiguracionSeries | null;
  _estado: EstadoElemento;
};

type RutinaEjercicioSerie = {
  _localId: string;
  id?: string;
  rutina_ejercicio_id?: string;
  numero_serie: number;
  repeticiones?: string | null;
  peso?: string | null;
  porcentaje_rm?: string | null;
  _estado: EstadoElemento;
};

type EntradaCalorEjercicio = {
  _localId: string;
  id?: string;
  rutina_id: string;
  ejercicio_id?: string | null;
  nombre_ejercicio: string;
  series?: number | null;
  tipo_prescripcion?: TipoPrescripcion | null;
  duracion?: string | null;
  repeticiones?: string | null;
  observaciones?: string | null;
  orden?: number | null;
  _estado: EstadoElemento;
};

type Alumno = {
  id: string;
  nombre: string;
  apellido?: string;
  email?: string;
};

type Asignacion = {
  _localId: string;
  id?: string;
  alumno_id: string;
  rutina_id: string;
  fecha_asignacion?: string | null;
  alumnos?: {
    nombre: string;
    apellido?: string;
    email?: string;
  };
  _estado: EstadoElemento;
};

const porcentajesRM = Array.from({ length: 21 }, (_, index) => index * 5);
const opcionesRIR = Array.from({ length: 6 }, (_, index) => index);
const opcionesSeries = ["1", "2", "3", "4", "5", "custom"];

function textoPrescripcion(item: {
  tipo_prescripcion?: string | null;
  repeticiones?: string | null;
  duracion?: string | null;
}) {
  if (item.tipo_prescripcion === "tiempo") {
    return item.duracion ? `Duración: ${item.duracion}` : "Duración: -";
  }
  return item.repeticiones ? `Reps: ${item.repeticiones}` : "Reps: -";
}

export default function RutinaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [rutina, setRutina] = useState<Rutina | null>(null);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [rutinaEjercicios, setRutinaEjercicios] = useState<RutinaEjercicio[]>([]);
  const [ejercicioArrastrandoId, setEjercicioArrastrandoId] = useState<string | null>(null);
  const [seriesPorEjercicio, setSeriesPorEjercicio] = useState<Record<string, RutinaEjercicioSerie[]>>({});
  const [entradaCalorEjercicios, setEntradaCalorEjercicios] = useState<EntradaCalorEjercicio[]>([]);
  const [entradaArrastrandoId, setEntradaArrastrandoId] = useState<string | null>(null);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [profesorId, setProfesorId] = useState<string | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [hayCambios, setHayCambios] = useState(false);

  const [mostrarEditarRutina, setMostrarEditarRutina] = useState(false);
  const [mostrarEjercicioPrincipal, setMostrarEjercicioPrincipal] = useState(false);
  const [mostrarEntradaCalor, setMostrarEntradaCalor] = useState(false);
  const [mostrarCrearEjercicio, setMostrarCrearEjercicio] = useState(false);
  const [mostrarModalAsignar, setMostrarModalAsignar] = useState(false);
  const [mostrarAsignacionesModal, setMostrarAsignacionesModal] = useState(false);

  const [ejercicioEditandoId, setEjercicioEditandoId] = useState<string | null>(null);
  const [entradaEditandoId, setEntradaEditandoId] = useState<string | null>(null);

  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editObjetivo, setEditObjetivo] = useState("");
  const [editEstructura, setEditEstructura] = useState("");
  const [editEntradaCalorTexto, setEditEntradaCalorTexto] = useState("");

  const [ejercicioId, setEjercicioId] = useState("");
  const [nombreEjercicio, setNombreEjercicio] = useState("");
  const [series, setSeries] = useState("3");
  const [seriesCustom, setSeriesCustom] = useState("");
  const [tipoPrescripcion, setTipoPrescripcion] = useState<TipoPrescripcion>("repeticiones");
  const [repeticiones, setRepeticiones] = useState("");
  const [duracion, setDuracion] = useState("");
  const [peso, setPeso] = useState("");
  const [porcentajeRm, setPorcentajeRm] = useState("");
  const [rir, setRir] = useState("");
  const [descanso, setDescanso] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [tipoConfiguracionSeries, setTipoConfiguracionSeries] = useState<TipoConfiguracionSeries>("simple");
  const [seriesAvanzadas, setSeriesAvanzadas] = useState<RutinaEjercicioSerie[]>([
    { _localId: crypto.randomUUID(), id: crypto.randomUUID(), numero_serie: 1, repeticiones: "", peso: "", _estado: "nuevo" },
    { _localId: crypto.randomUUID(), id: crypto.randomUUID(), numero_serie: 2, repeticiones: "", peso: "", _estado: "nuevo" },
    { _localId: crypto.randomUUID(), id: crypto.randomUUID(), numero_serie: 3, repeticiones: "", peso: "", _estado: "nuevo" },
  ]);

  const [entradaEjercicioId, setEntradaEjercicioId] = useState("");
  const [entradaNombreEjercicio, setEntradaNombreEjercicio] = useState("");
  const [entradaSeries, setEntradaSeries] = useState("1");
  const [entradaSeriesCustom, setEntradaSeriesCustom] = useState("");
  const [entradaTipoPrescripcion, setEntradaTipoPrescripcion] = useState<TipoPrescripcion>("repeticiones");
  const [entradaDuracion, setEntradaDuracion] = useState("");
  const [entradaRepeticiones, setEntradaRepeticiones] = useState("");
  const [entradaObservaciones, setEntradaObservaciones] = useState("");

  const [mostrarHistorialEjercicio, setMostrarHistorialEjercicio] = useState(false);
  const [accionCargando, setAccionCargando] = useState<string | null>(null);
  const [mostrarConfirmarSalida, setMostrarConfirmarSalida] = useState(false);
  const [salidaPendiente, setSalidaPendiente] = useState<string | null>(null);

  function BotonCargando({ texto }: { texto: string }) {
    return (
      <span className="inline-flex items-center justify-center gap-2">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {texto}
      </span>
    );
  }

  const { setHasUnsavedChanges } = useUnsavedChanges();
  const [historialEjercicioId, setHistorialEjercicioId] = useState<string | null>(null);
  const [historialNombreEjercicio, setHistorialNombreEjercicio] = useState("");
  const { formatearFechaCorta } = useFormatoFecha();

  // Detectar cambios pendientes (excluye asignaciones, que se guardan en vivo)
  useEffect(() => {
    const hayCambiosEnRutina = rutina?._estado !== "sinCambios";
    const hayCambiosEnEjercicios = rutinaEjercicios.some((e) => e._estado !== "sinCambios");
    const hayCambiosEnEntrada = entradaCalorEjercicios.some((e) => e._estado !== "sinCambios");

    setHayCambios(!!(hayCambiosEnRutina || hayCambiosEnEjercicios || hayCambiosEnEntrada));
  }, [rutina, rutinaEjercicios, entradaCalorEjercicios]);

  // Sincronizar hayCambios con el contexto global
  useEffect(() => {
    setHasUnsavedChanges(hayCambios);
  }, [hayCambios, setHasUnsavedChanges]);

  // Prevenir navegación sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hayCambios) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hayCambios]);

  useEffect(() => {
    verificarPermiso();
  }, [id]);

  async function verificarPermiso() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const rol = await getRolCached(sessionData.session.user.id);

    if (rol !== "profe") {
      window.location.href = "/alumno";
      return;
    }

    const profesorActualId = sessionData.session.user.id;
    setProfesorId(profesorActualId);

    await Promise.all([
      cargarRutina(profesorActualId),
      cargarEjercicios(),
      cargarEntradaCalor(),
      cargarRutinaEjercicios(),
      cargarAlumnos(profesorActualId),
      cargarAsignaciones(),
    ]);

    setLoading(false);
  }

  async function cargarRutina(profesorId?: string) {
    let query = supabase
      .from("rutinas")
      .select("id,nombre,descripcion,objetivo,estructura,entrada_calor")
      .eq("id", id);

    if (profesorId) {
      query = query.eq("profesor_id", profesorId);
    }

    const { data, error } = await query.single();

    if (error) {
      alert(error.message);
      return;
    }

    setRutina({
      ...data,
      _estado: "sinCambios",
    });
    setEditNombre(data.nombre || "");
    setEditDescripcion(data.descripcion || "");
    setEditObjetivo(data.objetivo || "");
    setEditEstructura(data.estructura || "");
    setEditEntradaCalorTexto(data.entrada_calor || "");
  }

  async function cargarEjercicios() {
    const data = await getEjerciciosBasicosCached();
    setEjercicios(
      (data || []).map((ejercicio) => ({
        id: ejercicio.id,
        nombre: ejercicio.nombre,
        grupo_muscular: ejercicio.grupo_muscular ?? undefined,
      }))
    );
  }

  async function cargarEntradaCalor() {
    const { data, error } = await supabase
      .from("rutina_entrada_calor")
      .select("id,rutina_id,ejercicio_id,nombre_ejercicio,series,tipo_prescripcion,duracion,repeticiones,observaciones,orden")
      .eq("rutina_id", id)
      .order("orden", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const datosConEstado = (data || []).map((item) => ({
      ...item,
      _localId: item.id,
      _estado: "sinCambios" as EstadoElemento,
    }));

    setEntradaCalorEjercicios(datosConEstado);
  }

  async function cargarRutinaEjercicios() {
    const { data, error } = await supabase
      .from("rutina_ejercicios")
      .select("id,rutina_id,ejercicio_id,nombre_ejercicio,series,tipo_prescripcion,repeticiones,duracion,peso,descanso,rir,porcentaje_rm,observaciones,orden,tipo_configuracion")
      .eq("rutina_id", id)
      .order("orden", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const ejerciciosData = (data || []) as RutinaEjercicio[];
    const ejerciciosConEstado = ejerciciosData.map((item) => ({
      ...item,
      _localId: item.id || crypto.randomUUID(),
      _estado: "sinCambios" as EstadoElemento,
    }));

    setRutinaEjercicios(ejerciciosConEstado);

    const ejerciciosAvanzadosIds = ejerciciosData
      .filter((item) => item.tipo_configuracion === "avanzado")
      .map((item) => item.id);

    if (ejerciciosAvanzadosIds.length === 0) {
      setSeriesPorEjercicio({});
      return;
    }

    const { data: seriesData, error: seriesError } = await supabase
      .from("rutina_ejercicio_series")
      .select("id,rutina_ejercicio_id,numero_serie,repeticiones,peso,porcentaje_rm")
      .in("rutina_ejercicio_id", ejerciciosAvanzadosIds)
      .order("numero_serie", { ascending: true });

    if (seriesError) {
      alert(seriesError.message);
      return;
    }

    const agrupadas = ((seriesData || []) as RutinaEjercicioSerie[]).reduce<Record<string, RutinaEjercicioSerie[]>>(
      (acc, serie) => {
        if (!serie.rutina_ejercicio_id) return acc;
        acc[serie.rutina_ejercicio_id] = acc[serie.rutina_ejercicio_id] || [];
        acc[serie.rutina_ejercicio_id].push({
          ...serie,
          _localId: serie.id || crypto.randomUUID(),
          _estado: "sinCambios" as EstadoElemento,
        });
        return acc;
      },
      {}
    );

    setSeriesPorEjercicio(agrupadas);
  }

  async function cargarAlumnos(profesorId?: string) {
    let query = supabase
      .from("alumnos")
      .select("id,nombre,apellido,email,profesor_id")
      .order("nombre");

    if (profesorId) {
      query = query.eq("profesor_id", profesorId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      return;
    }

    setAlumnos(data || []);
  }

  async function cargarAsignaciones(profesorIdActual?: string) {
    if (profesorIdActual) {
      const { data: rutinaPropia, error: rutinaPropiaError } = await supabase
        .from("rutinas")
        .select("id")
        .eq("id", id)
        .eq("profesor_id", profesorIdActual)
        .maybeSingle();

      if (rutinaPropiaError) {
        alert(rutinaPropiaError.message);
        return;
      }

      if (!rutinaPropia) {
        setAsignaciones([]);
        return;
      }
    }
    const { data, error } = await supabase
      .from("rutina_asignaciones")
      .select(`
        id,
        alumno_id,
        rutina_id,
        fecha_asignacion,
        alumnos (
          nombre,
          apellido,
          email
        )
      `)
      .eq("rutina_id", id)
      .eq("activa", true);

    if (error) {
      alert(error.message);
      return;
    }

    const normalizadas = (data || []).map((item) => ({
      ...item,
      alumnos: Array.isArray(item.alumnos) ? item.alumnos[0] : item.alumnos,
      _localId: item.id || crypto.randomUUID(),
      _estado: "sinCambios" as EstadoElemento,
    })) as Asignacion[];

    setAsignaciones(normalizadas);
  }

  // Función para guardar todos los cambios
  async function guardarCambios(): Promise<boolean> {
    if (guardando || !hayCambios) {
      return false;
    }
    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      return false;
    }

    setGuardando(true);
    try {
      // Guardar todos los cambios en una sola llamada
      const resultado = await guardarRutina({
        supabase,
        rutinaId: id,
        profesorId,
        rutina: {
          nombre: rutina?.nombre || "",
          descripcion: rutina?.descripcion,
          objetivo: rutina?.objetivo,
          estructura: rutina?.estructura,
          entrada_calor: rutina?.entrada_calor,
        },
        ejercicios: rutinaEjercicios,
        seriesPorEjercicio,
        entradaCalorEjercicios,
        asignaciones,
      });

      if (!resultado.ok) {
        throw new Error(resultado.error);
      }

      // Recargar todos los datos desde Supabase para garantizar sincronización
      await Promise.all([
        cargarRutina(profesorId),
        cargarEntradaCalor(),
        cargarRutinaEjercicios(),
        cargarAsignaciones(profesorId),
      ]);

      alert("Cambios guardados exitosamente");
      return true;
    } catch (error) {
      console.error("Error al guardar:", error);
      alert(`Error al guardar: ${error instanceof Error ? error.message : "Error desconocido"}`);
      return false;
    } finally {
      setGuardando(false);
    }
  }

  function descartarCambios() {
    const confirmar = confirm(
      "¿Descartar todos los cambios? Se perderán todas las modificaciones no guardadas."
    );

    if (!confirmar) return;

    // Recargar datos originales
    if (profesorId) {
      cargarRutina(profesorId);
      cargarEntradaCalor();
      cargarRutinaEjercicios();
      cargarAsignaciones();
    }

    limpiarFormularioEjercicio();
    limpiarFormularioEntrada();
    setMostrarEditarRutina(false);
    setMostrarEntradaCalor(false);
    setMostrarEjercicioPrincipal(false);
  }

  function guardarEdicionRutina() {
    if (!editNombre.trim()) {
      alert("Ingresá un nombre.");
      return;
    }

    setRutina((prev) =>
      prev
        ? {
            ...prev,
            nombre: editNombre,
            descripcion: editDescripcion,
            objetivo: editObjetivo,
            estructura: editEstructura,
            entrada_calor: editEntradaCalorTexto,
            _estado: prev._estado === "sinCambios" ? "editado" : prev._estado,
          }
        : null
    );

    setMostrarEditarRutina(false);
  }

  async function borrarRutina() {
    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      return;
    }
    setAccionCargando("borrar-rutina");
    try {
      const result = await borrarRutinaLib({
        supabase,
        rutinaId: id,
        profesorId,
        onConfirm: (pendientes, completadas) =>
          confirm(
            `Esta rutina tiene:\n\n` +
              `• ${pendientes} asignación(es) pendiente(s)\n` +
              `• ${completadas} asignación(es) completada(s)\n\n` +
              `Las asignaciones pendientes serán eliminadas.\n` +
              `Las asignaciones completadas permanecerán disponibles en el historial del alumno.\n\n` +
              `¿Deseás continuar?`
          ),
      });
      if (!result.ok) {
        if (result.error !== "Operación cancelada por el usuario.") {
          alert(result.error);
        }
        return;
      }
      window.location.href = "/rutinas";
    } catch (error) {
      console.error("Error general al borrar rutina:", error);
      alert("Error al borrar la rutina. Por favor, intentá de nuevo.");
    } finally {
      setAccionCargando(null);
    }
  }

  function abrirAgregarEntradaCalor() {
    setEntradaEditandoId(null);
    limpiarFormularioEntrada();
    setMostrarEntradaCalor(true);
  }

  function abrirEditarEntradaCalor(item: EntradaCalorEjercicio) {
    const seriesTexto = item.series ? String(item.series) : "1";

    setEntradaEditandoId(item._localId);
    setEntradaEjercicioId(item.ejercicio_id || "");
    setEntradaNombreEjercicio(item.nombre_ejercicio || "");

    if (item.series && item.series > 5) {
      setEntradaSeries("custom");
      setEntradaSeriesCustom(String(item.series));
    } else {
      setEntradaSeries(seriesTexto);
      setEntradaSeriesCustom("");
    }

    setEntradaTipoPrescripcion((item.tipo_prescripcion as TipoPrescripcion) || "repeticiones");
    setEntradaDuracion(item.duracion || "");
    setEntradaRepeticiones(item.repeticiones || "");
    setEntradaObservaciones(item.observaciones || "");
    setMostrarEntradaCalor(true);
  }

  function guardarEntradaCalor() {
    if (!entradaNombreEjercicio.trim()) {
      alert("Ingresá o seleccioná un ejercicio.");
      return;
    }

    const seriesFinal = entradaSeries === "custom" ? entradaSeriesCustom : entradaSeries;

    const payload = {
      rutina_id: id,
      ejercicio_id: entradaEjercicioId || null,
      nombre_ejercicio: entradaNombreEjercicio,
      series: seriesFinal ? Number(seriesFinal) : null,
      tipo_prescripcion: entradaTipoPrescripcion,
      duracion: entradaTipoPrescripcion === "tiempo" ? entradaDuracion : "",
      repeticiones: entradaTipoPrescripcion === "repeticiones" ? entradaRepeticiones : "",
      observaciones: entradaObservaciones,
      orden: entradaCalorEjercicios.length + 1,
    };

    if (entradaEditandoId) {
      // Actualizar en estado local
      setEntradaCalorEjercicios((prev) =>
        prev.map((e) =>
          e._localId === entradaEditandoId
            ? { ...e, ...payload, _estado: e._estado === "sinCambios" ? "editado" : e._estado }
            : e
        )
      );
    } else {
      // Crear en estado local
      const nuevaEntrada: EntradaCalorEjercicio = {
        _localId: crypto.randomUUID(),
        id: crypto.randomUUID(),
        ...payload,
        _estado: "nuevo",
      };
      setEntradaCalorEjercicios((prev) => [...prev, nuevaEntrada]);
    }

    limpiarFormularioEntrada();
    setMostrarEntradaCalor(false);
  }

  function borrarEntradaCalor(entradaId: string) {
    const confirmar = confirm("¿Seguro que querés borrar este ejercicio de la entrada en calor?");
    if (!confirmar) return;

    setAccionCargando(`borrar-entrada-${entradaId}`);
    try {
      const entrada = entradaCalorEjercicios.find((e) => e._localId === entradaId);

      if (entrada) {
        if (entrada._estado === "nuevo") {
          // Si es nuevo, eliminar directamente del array
          setEntradaCalorEjercicios((prev) => prev.filter((e) => e._localId !== entradaId));
        } else {
          // Si provenía de la BD, marcar como eliminado
          setEntradaCalorEjercicios((prev) =>
            prev.map((e) => (e._localId === entradaId ? { ...e, _estado: "eliminado" } : e))
          );
        }
      }
    } finally {
      setAccionCargando(null);
    }
  }

  async function cambiarOrdenEntradaCalor(entradaId: string, nuevoOrden: number) {
    const entradasOrdenadas = [...entradaCalorEjercicios]
      .filter((e) => e._estado !== "eliminado")
      .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

    const entradaMovida = entradasOrdenadas.find((item) => item._localId === entradaId);

    if (!entradaMovida) return;

    const restantes = entradasOrdenadas.filter((item) => item._localId !== entradaId);
    restantes.splice(nuevoOrden - 1, 0, entradaMovida);

    const entradasReordenadas = restantes.map((item, index) => ({
      ...item,
      orden: index + 1,
      _estado: item._estado === "sinCambios" ? "editado" : item._estado,
    }));

    setEntradaCalorEjercicios((prev) => {
      const eliminadas = prev.filter((e) => e._estado === "eliminado");
      return [...eliminadas, ...entradasReordenadas].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
    });
  }

  async function soltarEntradaSobre(destinoId: string) {
    if (!entradaArrastrandoId || entradaArrastrandoId === destinoId) {
      setEntradaArrastrandoId(null);
      return;
    }

    const entradasOrdenadas = [...entradaCalorEjercicios]
      .filter((e) => e._estado !== "eliminado")
      .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

    const indiceDestino = entradasOrdenadas.findIndex((item) => item._localId === destinoId);

    if (indiceDestino === -1) {
      setEntradaArrastrandoId(null);
      return;
    }

    await cambiarOrdenEntradaCalor(entradaArrastrandoId, indiceDestino + 1);
    setEntradaArrastrandoId(null);
  }

  function cancelarArrastreEntrada() {
    setEntradaArrastrandoId(null);
  }

  function cantidadSeriesPrincipal() {
    const seriesFinal = series === "custom" ? seriesCustom : series;
    const cantidad = Number(seriesFinal || 0);
    return Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 0;
  }

  function crearSeriesAvanzadas(cantidad: number, existentes: RutinaEjercicioSerie[] = []): RutinaEjercicioSerie[] {
    return Array.from({ length: cantidad }, (_, index) => {
      const numeroSerie = index + 1;
      const existente = existentes.find((serie) => serie.numero_serie === numeroSerie);

      return {
        _localId: existente?._localId || crypto.randomUUID(),
        numero_serie: numeroSerie,
        repeticiones: existente?.repeticiones || "",
        peso: existente?.peso || "",
        porcentaje_rm: existente?.porcentaje_rm || "",
        _estado: existente?._estado || "nuevo",
      };
    });
  }

  function actualizarCantidadSeriesAvanzadas(nuevaCantidad: number) {
    if (!Number.isFinite(nuevaCantidad) || nuevaCantidad <= 0) {
      setSeriesAvanzadas([]);
      return;
    }

    setSeriesAvanzadas((actuales) => crearSeriesAvanzadas(nuevaCantidad, actuales));
  }

  function actualizarSerieAvanzada(
    numeroSerie: number,
    campo: "repeticiones" | "peso" | "porcentaje_rm",
    valor: string
  ) {
    setSeriesAvanzadas((actuales) =>
      actuales.map((serie) => {
        if (serie.numero_serie !== numeroSerie) return serie;

        const actualizado = { ...serie, [campo]: valor };

        // Mutuamente excluyente: si ingresa peso, limpia %RM y viceversa
        if (campo === "peso" && valor.trim()) {
          actualizado.porcentaje_rm = "";
        } else if (campo === "porcentaje_rm" && valor !== "") {
          actualizado.peso = "";
        }

        return actualizado;
      })
    );
  }

  function abrirAgregarEjercicioPrincipal() {
    setEjercicioEditandoId(null);
    limpiarFormularioEjercicio();
    setSeriesAvanzadas(crearSeriesAvanzadas(3));
    setMostrarEjercicioPrincipal(true);
  }

  async function abrirEditarEjercicioPrincipal(item: RutinaEjercicio) {
    const seriesTexto = item.series ? String(item.series) : "3";

    setEjercicioEditandoId(item._localId);
    setEjercicioId(item.ejercicio_id || "");
    setNombreEjercicio(item.nombre_ejercicio || "");

    if (item.series && item.series > 5) {
      setSeries("custom");
      setSeriesCustom(String(item.series));
    } else {
      setSeries(seriesTexto);
      setSeriesCustom("");
    }

    setTipoPrescripcion((item.tipo_prescripcion as TipoPrescripcion) || "repeticiones");
    setRepeticiones(item.repeticiones || "");
    setDuracion(item.duracion || "");
    setPeso(item.peso || "");
    setPorcentajeRm(item.porcentaje_rm || "");
    setRir(item.rir || "");
    setDescanso(item.descanso || "");
    setObservaciones(item.observaciones || "");

    const tipoConfiguracion = item.tipo_configuracion === "avanzado" ? "avanzado" : "simple";
    setTipoConfiguracionSeries(tipoConfiguracion);

    if (tipoConfiguracion === "avanzado") {
      const { data: seriesData, error: seriesError } = await supabase
        .from("rutina_ejercicio_series")
        .select("id,rutina_ejercicio_id,numero_serie,repeticiones,peso,porcentaje_rm")
        .eq("rutina_ejercicio_id", item.id)
        .order("numero_serie", { ascending: true });

      if (seriesError) {
        alert(seriesError.message);
        return;
      }

      const cantidadSeries = item.series || Number(seriesTexto || 0) || 1;
      const seriesConEstado = (seriesData || []).map((serie) => ({
        ...serie,
        _localId: serie.id || crypto.randomUUID(),
        _estado: "sinCambios" as EstadoElemento,
      }));
      setSeriesAvanzadas(crearSeriesAvanzadas(cantidadSeries, seriesConEstado));
    } else {
      const cantidadSeries = item.series || Number(seriesTexto || 0) || 1;
      setSeriesAvanzadas(crearSeriesAvanzadas(cantidadSeries));
    }

    setMostrarEjercicioPrincipal(true);
  }

  function guardarEjercicioPrincipal() {
    if (!ejercicioId) {
      alert("Seleccioná un ejercicio del banco.");
      return;
    }

    const seriesFinal = series === "custom" ? seriesCustom : series;
    const cantidadSeries = Number(seriesFinal || 0);

    if (!cantidadSeries || cantidadSeries <= 0) {
      alert("Ingresá una cantidad de series válida.");
      return;
    }

    if (tipoConfiguracionSeries === "avanzado") {
      const seriesIncompletas = seriesAvanzadas.some(
        (serie) => !serie.repeticiones?.trim() || (!serie.peso?.trim() && !serie.porcentaje_rm?.trim())
      );

      if (seriesIncompletas) {
        alert("Completá repeticiones y peso/%RM en cada serie.");
        return;
      }
    }

    const payload = {
      rutina_id: id,
      ejercicio_id: ejercicioId || null,
      nombre_ejercicio: ejercicios.find((e) => e.id === ejercicioId)?.nombre || "",
      series: seriesFinal ? Number(seriesFinal) : null,
      tipo_prescripcion: tipoConfiguracionSeries === "avanzado" ? "repeticiones" : tipoPrescripcion,
      repeticiones: tipoConfiguracionSeries === "avanzado" ? "" : tipoPrescripcion === "repeticiones" ? repeticiones : "",
      duracion: tipoConfiguracionSeries === "avanzado" ? "" : tipoPrescripcion === "tiempo" ? duracion : "",
      peso: tipoConfiguracionSeries === "avanzado" ? "" : peso,
      porcentaje_rm: tipoConfiguracionSeries === "avanzado" ? "" : porcentajeRm,
      rir,
      descanso,
      observaciones,
      orden: rutinaEjercicios.filter((e) => e._estado !== "eliminado").length + 1,
      tipo_configuracion: tipoConfiguracionSeries,
    };

    if (ejercicioEditandoId) {
      // Actualizar en estado local
      setRutinaEjercicios((prev) =>
        prev.map((e) =>
          e._localId === ejercicioEditandoId
            ? { ...e, ...payload, _estado: e._estado === "sinCambios" ? "editado" : e._estado }
            : e
        )
      );

      // Actualizar series
      setSeriesPorEjercicio((prev) => ({
        ...prev,
        [ejercicioEditandoId]: tipoConfiguracionSeries === "avanzado" ? [...seriesAvanzadas] : [],
      }));
    } else {
      // Crear en estado local
      const nuevoEjercicio: RutinaEjercicio = {
        _localId: crypto.randomUUID(),
        id: crypto.randomUUID(),
        ...payload,
        _estado: "nuevo",
      };
      setRutinaEjercicios((prev) => [...prev, nuevoEjercicio]);

      // Guardar series si es configuración avanzada
      if (tipoConfiguracionSeries === "avanzado") {
        setSeriesPorEjercicio((prev) => ({
          ...prev,
          [nuevoEjercicio._localId]: [...seriesAvanzadas],
        }));
      }
    }

    limpiarFormularioEjercicio();
    setMostrarEjercicioPrincipal(false);
  }

  async function cambiarOrdenEjercicio(rutinaEjercicioId: string, nuevoOrden: number) {
    const ejerciciosOrdenados = [...rutinaEjercicios]
      .filter((e) => e._estado !== "eliminado")
      .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

    const ejercicioMovido = ejerciciosOrdenados.find((item) => item._localId === rutinaEjercicioId);

    if (!ejercicioMovido) return;

    const restantes = ejerciciosOrdenados.filter((item) => item._localId !== rutinaEjercicioId);
    restantes.splice(nuevoOrden - 1, 0, ejercicioMovido);

    const ejerciciosReordenados = restantes.map((item, index) => ({
      ...item,
      orden: index + 1,
      _estado: item._estado === "sinCambios" ? "editado" : item._estado,
    }));

    setRutinaEjercicios((prev) => {
      const eliminados = prev.filter((e) => e._estado === "eliminado");
      return [...eliminados, ...ejerciciosReordenados].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
    });
  }

  async function soltarEjercicioSobre(destinoId: string) {
    if (!ejercicioArrastrandoId || ejercicioArrastrandoId === destinoId) {
      setEjercicioArrastrandoId(null);
      return;
    }

    const ejerciciosOrdenados = [...rutinaEjercicios]
      .filter((e) => e._estado !== "eliminado")
      .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));

    const indiceDestino = ejerciciosOrdenados.findIndex((item) => item._localId === destinoId);

    if (indiceDestino === -1) {
      setEjercicioArrastrandoId(null);
      return;
    }

    await cambiarOrdenEjercicio(ejercicioArrastrandoId, indiceDestino + 1);
    setEjercicioArrastrandoId(null);
  }

  function cancelarArrastreEjercicio() {
    setEjercicioArrastrandoId(null);
  }

  function borrarEjercicioPrincipal(rutinaEjercicioId: string) {
    const confirmar = confirm("¿Seguro que querés borrar este ejercicio de la rutina?");
    if (!confirmar) return;

    setAccionCargando(`borrar-ejercicio-${rutinaEjercicioId}`);
    try {
      const ejercicio = rutinaEjercicios.find((e) => e._localId === rutinaEjercicioId);

      if (ejercicio) {
        if (ejercicio._estado === "nuevo") {
          // Si es nuevo, eliminar directamente del array
          setRutinaEjercicios((prev) => prev.filter((e) => e._localId !== rutinaEjercicioId));
        } else {
          // Si provenía de la BD, marcar como eliminado
          setRutinaEjercicios((prev) =>
            prev.map((e) => (e._localId === rutinaEjercicioId ? { ...e, _estado: "eliminado" } : e))
          );
        }
      }
    } finally {
      setAccionCargando(null);
    }
  }

  async function asignarAlumno(alumnosSeleccionados: { id: string; nombre: string; fechaAsignacion?: string }[]) {
    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      return;
    }

    setAccionCargando("asignar-alumno");
    try {
      // Validar que la rutina pertenece al profesor
      const { data: rutinaPropia, error: rutinaError } = await supabase
        .from("rutinas")
        .select("id")
        .eq("id", id)
        .eq("profesor_id", profesorId)
        .maybeSingle();

      if (rutinaError || !rutinaPropia) {
        alert("No tenés permiso para asignar esta rutina.");
        return;
      }

      // Crear todas las asignaciones en batch
      const asignaciones = alumnosSeleccionados.map((alumno) => ({
        alumno_id: alumno.id,
        rutina_id: id,
        fecha_asignacion: alumno.fechaAsignacion || new Date().toISOString().slice(0, 10),
        activa: true,
      }));

      const { error: insertError } = await supabase
        .from("rutina_asignaciones")
        .insert(asignaciones);

      if (insertError) {
        alert(insertError.message);
        return;
      }

      // Recargar asignaciones desde Supabase (datos frescos)
      await cargarAsignaciones(profesorId);
    } finally {
      setAccionCargando(null);
    }
  }

  async function quitarAsignacion(asignacionId: string) {
    const confirmar = confirm("¿Querés quitar esta rutina del alumno?");
    if (!confirmar) return;

    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      return;
    }

    setAccionCargando(`quitar-asignacion-${asignacionId}`);
    try {
      const asignacion = asignaciones.find((a) => a._localId === asignacionId);

      if (!asignacion) return;

      if (asignacion._estado === "nuevo" || !asignacion.id) {
        // Si nunca se persistió, solo quitarla del estado local
        setAsignaciones((prev) => prev.filter((a) => a._localId !== asignacionId));
      } else {
        // Si ya estaba en BD, usar eliminarAsignacion (borra en cascada: registros, historial, etc.)
        const resultado = await eliminarAsignacion({
          supabase,
          asignacionId: asignacion.id,
        });

        if (!resultado.ok) {
          alert(resultado.error || "Error al quitar la asignación");
          return;
        }

        // Recargar asignaciones desde Supabase (datos frescos)
        await cargarAsignaciones(profesorId);
      }
    } finally {
      setAccionCargando(null);
    }
  }

  function limpiarFormularioEjercicio() {
    setEjercicioId("");
    setNombreEjercicio("");
    setSeries("3");
    setSeriesCustom("");
    setTipoPrescripcion("repeticiones");
    setRepeticiones("");
    setDuracion("");
    setPeso("");
    setPorcentajeRm("");
    setRir("");
    setDescanso("");
    setObservaciones("");
    setTipoConfiguracionSeries("simple");
    setSeriesAvanzadas(crearSeriesAvanzadas(3));
    setEjercicioEditandoId(null);
  }

  function limpiarFormularioEntrada() {
    setEntradaEjercicioId("");
    setEntradaNombreEjercicio("");
    setEntradaSeries("1");
    setEntradaSeriesCustom("");
    setEntradaTipoPrescripcion("repeticiones");
    setEntradaDuracion("");
    setEntradaRepeticiones("");
    setEntradaObservaciones("");
    setEntradaEditandoId(null);
  }

  function seleccionarEjercicioPrincipal(idSeleccionado: string) {
    if (idSeleccionado === "crear_nuevo") {
      setMostrarCrearEjercicio(true);
      return;
    }

    setEjercicioId(idSeleccionado);
    const ejercicio = ejercicios.find((item) => item.id === idSeleccionado);
    setNombreEjercicio(ejercicio?.nombre || "");
  }

  function seleccionarEjercicioEntrada(idSeleccionado: string) {
    setEntradaEjercicioId(idSeleccionado);
    const ejercicio = ejercicios.find((item) => item.id === idSeleccionado);
    setEntradaNombreEjercicio(ejercicio?.nombre || "");
  }

  function abrirHistorialEjercicio() {
    const alumnoIdUrl = new URLSearchParams(window.location.search).get("alumnoId");

    if (!alumnoIdUrl) {
      alert("Abrí esta rutina desde el perfil de un alumno para ver su historial.");
      return;
    }

    if (!ejercicioId) {
      alert("Seleccioná un ejercicio primero.");
      return;
    }

    const ejercicio = ejercicios.find((item) => item.id === ejercicioId);

    setHistorialEjercicioId(ejercicioId);
    setHistorialNombreEjercicio(ejercicio?.nombre || "Ejercicio");
    setMostrarHistorialEjercicio(true);
  }

  function cambiarPeso(valor: string) {
    setPeso(valor);
    if (valor.trim()) setPorcentajeRm("");
  }

  function cambiarPorcentajeRm(valor: string) {
    setPorcentajeRm(valor);
    if (valor !== "") setPeso("");
  }

  function intentarSalir(destino: string) {
    if (hayCambios) {
      setSalidaPendiente(destino);
      setMostrarConfirmarSalida(true);
      return;
    }

    window.location.href = destino;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando rutina...
      </main>
    );
  }

  if (!rutina) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Rutina no encontrada.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => intentarSalir("/rutinas")}
          className="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 transition"
        >
          ← Atrás
        </button>

        {/* Botón flotante de guardar cambios */}
        {hayCambios && (
          <div className="fixed top-24 left-4 right-4 z-50 flex flex-col gap-3 md:top-auto md:left-auto md:right-6 md:bottom-6 md:w-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
              <p className="text-sm text-zinc-300 mb-3">Tenés cambios sin guardar</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={descartarCambios}
                  disabled={guardando}
                  className="px-4 py-2 text-sm border border-zinc-700 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={guardarCambios}
                  disabled={guardando}
                  className="px-4 py-2 text-sm bg-emerald-500 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardando ? <BotonCargando texto="Guardando..." /> : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] mt-6 items-stretch">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 min-h-[220px] flex flex-col">
            <div>
              <h1 className="text-3xl font-bold">{rutina.nombre}</h1>

              <div className="flex flex-wrap gap-2 mt-3">
                {rutina.objetivo && (
                  <span className="text-sm rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1">
                    {rutina.objetivo}
                  </span>
                )}

                {rutina.estructura && (
                  <span className="text-sm rounded-full bg-zinc-800 text-zinc-300 px-3 py-1">
                    {rutina.estructura}
                  </span>
                )}
              </div>

              {rutina.descripcion && (
                <p className="text-zinc-400 mt-3">{rutina.descripcion}</p>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setMostrarEditarRutina(true)}
                disabled={accionCargando !== null}
                className="rounded-xl border border-zinc-700 px-4 py-3 text-sm hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Editar rutina
              </button>

              <button
                type="button"
                onClick={borrarRutina}
                disabled={accionCargando !== null}
                className="rounded-xl border border-red-800 px-4 py-3 text-sm text-red-400 hover:bg-red-950 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {accionCargando === "borrar-rutina" ? <BotonCargando texto="Borrando..." /> : "Borrar rutina"}
              </button>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col min-h-[220px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Alumnos</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {asignaciones.filter((a) => a._estado !== "eliminado").length === 0
                    ? "Sin alumnos asignados"
                    : `${asignaciones.filter((a) => a._estado !== "eliminado").length} ${asignaciones.filter((a) => a._estado !== "eliminado").length === 1 ? "alumno asignado" : "alumnos asignados"}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMostrarModalAsignar(true)}
                disabled={accionCargando !== null || alumnos.length === 0}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                + Asignar
              </button>
            </div>

            <div className="mt-4 max-h-[120px] overflow-hidden">
              {asignaciones.filter((a) => a._estado !== "eliminado").length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                  No hay alumnos asignados.
                </div>
              ) : (
                <div className="space-y-2">
                  {asignaciones
                    .filter((a) => a._estado !== "eliminado")
                    .slice(0, 2)
                    .map((asignacion) => (
                      <div
                        key={asignacion._localId}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {asignacion.alumnos?.nombre} {asignacion.alumnos?.apellido}
                              {asignacion.fecha_asignacion && (
                                <span className="ml-2 text-sm font-normal text-zinc-500">
                                  {formatearFechaCorta(asignacion.fecha_asignacion)}
                                </span>
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => quitarAsignacion(asignacion._localId)}
                            disabled={accionCargando !== null}
                            className="text-red-400 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {accionCargando === `quitar-asignacion-${asignacion._localId}` ? <BotonCargando texto="Quitando..." /> : "Quitar"}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {asignaciones.filter((a) => a._estado !== "eliminado").length > 0 && (
              <button
                type="button"
                onClick={() => setMostrarAsignacionesModal(true)}
                className="mt-4 self-end text-sm text-emerald-400 hover:text-emerald-300"
              >
                Ver todas las asignaciones
              </button>
            )}
          </div>
        </section>

        {mostrarAsignacionesModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-lg max-h-[85vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-6 pb-4">
                <div>
                  <h2 className="text-2xl font-bold">Asignaciones</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {asignaciones.filter((a) => a._estado !== "eliminado").length}{" "}
                    {asignaciones.filter((a) => a._estado !== "eliminado").length === 1 ? "alumno asignado" : "alumnos asignados"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarAsignacionesModal(false)}
                  disabled={accionCargando !== null}
                  className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cerrar
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {asignaciones.filter((a) => a._estado !== "eliminado").length === 0 ? (
                  <p className="text-zinc-400">No hay alumnos asignados.</p>
                ) : (
                  <div className="space-y-3">
                    {asignaciones
                      .filter((a) => a._estado !== "eliminado")
                      .map((asignacion) => (
                        <div
                          key={asignacion._localId}
                          className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">
                                {asignacion.alumnos?.nombre} {asignacion.alumnos?.apellido}
                                {asignacion.fecha_asignacion && (
                                  <span className="ml-2 text-sm font-normal text-zinc-500">
                                    {formatearFechaCorta(asignacion.fecha_asignacion)}
                                  </span>
                                )}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => quitarAsignacion(asignacion._localId)}
                              disabled={accionCargando !== null}
                              className="text-red-400 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {accionCargando === `quitar-asignacion-${asignacion._localId}` ? <BotonCargando texto="Quitando..." /> : "Quitar"}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">Entrada en calor</h2>

            <button
              type="button"
              onClick={abrirAgregarEntradaCalor}
              disabled={accionCargando !== null}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              + Agregar ejercicio
            </button>
          </div>

          {rutina.entrada_calor && (
            <p className="text-zinc-400 whitespace-pre-wrap mb-4">
              {rutina.entrada_calor}
            </p>
          )}

          {entradaCalorEjercicios.filter((e) => e._estado !== "eliminado").length === 0 ? (
            <p className="text-zinc-500">Sin ejercicios de entrada en calor.</p>
          ) : (
            <div className="space-y-3">
              {entradaCalorEjercicios
                .filter((e) => e._estado !== "eliminado")
                .map((item) => (
                  <div
                    key={item._localId}
                    draggable
                    onDragStart={() => setEntradaArrastrandoId(item._localId)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => soltarEntradaSobre(item._localId)}
                    onDragEnd={cancelarArrastreEntrada}
                    className={`border rounded-xl p-4 transition ${
                      entradaArrastrandoId === item._localId
                        ? "border-emerald-500 bg-emerald-500/10 opacity-70"
                        : "border-zinc-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {item.nombre_ejercicio}
                        </h3>

                        <p className="text-zinc-400 mt-1">
                          {item.series || "-"} series · {textoPrescripcion(item)}
                        </p>

                        {item.observaciones && (
                          <p className="text-zinc-500 mt-3 whitespace-pre-wrap">
                            {item.observaciones}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          title="Mantener y arrastrar para ordenar"
                          className="cursor-grab select-none rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-400 active:cursor-grabbing"
                        >
                          ⋮⋮
                        </span>

                        <button
                          type="button"
                          onClick={() => abrirEditarEntradaCalor(item)}
                          disabled={accionCargando !== null}
                          className="text-zinc-300 text-sm hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => borrarEntradaCalor(item._localId)}
                          disabled={accionCargando !== null}
                          className="text-red-400 text-sm hover:text-red-300 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {accionCargando === `borrar-entrada-${item._localId}` ? <BotonCargando texto="Borrando..." /> : "Borrar"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Ejercicios principales</h2>

              <button
                type="button"
                onClick={abrirAgregarEjercicioPrincipal}
                disabled={accionCargando !== null}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                + Agregar
              </button>
            </div>

            {rutinaEjercicios.filter((e) => e._estado !== "eliminado").length === 0 ? (
              <p className="text-zinc-400">
                Todavía no hay ejercicios cargados.
              </p>
            ) : (
              <div className="space-y-3">
                {rutinaEjercicios
                  .filter((e) => e._estado !== "eliminado")
                  .map((item) => (
                    <div
                      key={item._localId}
                      draggable
                      onDragStart={() => setEjercicioArrastrandoId(item._localId)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => soltarEjercicioSobre(item._localId)}
                      onDragEnd={cancelarArrastreEjercicio}
                      className={`border rounded-xl p-4 transition ${
                        ejercicioArrastrandoId === item._localId
                          ? "border-emerald-500 bg-emerald-500/10 opacity-70"
                          : "border-zinc-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {item.nombre_ejercicio}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-zinc-400">
                              {item.series || "-"} series · {item.tipo_configuracion === "avanzado" ? "Serie por serie" : textoPrescripcion(item)}
                            </p>

                            <span className={`rounded-full px-2 py-0.5 text-xs ${
                              item.tipo_configuracion === "avanzado"
                                ? "bg-blue-500/10 text-blue-300"
                                : "bg-zinc-800 text-zinc-300"
                            }`}>
                              {item.tipo_configuracion === "avanzado" ? "Avanzado" : "Simple"}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3 text-sm">
                            {item.peso && (
                              <span className="rounded-full bg-zinc-800 px-3 py-1">
                                Peso: {item.peso}
                              </span>
                            )}

                            {item.porcentaje_rm && (
                              <span className="rounded-full bg-zinc-800 px-3 py-1">
                                {item.porcentaje_rm === "0"
                                  ? "%RM: Peso corporal"
                                  : `%RM: ${item.porcentaje_rm}%`}
                              </span>
                            )}

                            {item.rir && (
                              <span className="rounded-full bg-zinc-800 px-3 py-1">
                                RIR: {item.rir}
                              </span>
                            )}

                            {item.descanso && (
                              <span className="rounded-full bg-zinc-800 px-3 py-1">
                                Descanso entre series: {item.descanso}
                              </span>
                            )}
                          </div>

                          {item.observaciones && (
                            <p className="text-zinc-500 mt-3 whitespace-pre-wrap">
                              {item.observaciones}
                            </p>
                          )}
                          {item.tipo_configuracion === "avanzado" && (
                            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                              <p className="text-xs font-semibold text-zinc-400 mb-2">Series configuradas</p>

                              <div className="space-y-1 text-sm text-zinc-300">
                                {(seriesPorEjercicio[item._localId] || []).map((serie) => (
                                  <div key={serie._localId} className="flex justify-between gap-3">
                                    <span>Serie {serie.numero_serie}</span>
                                    <span>
                                      {serie.repeticiones || "-"} reps ·
                                      {serie.porcentaje_rm ? (
                                        <span className="text-emerald-400">
                                          {serie.porcentaje_rm === "0" ? " Peso corporal" : ` ${serie.porcentaje_rm}% RM`}
                                        </span>
                                      ) : (
                                        <span> {serie.peso || "-"} kg</span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            title="Mantener y arrastrar para ordenar"
                            className="cursor-grab select-none rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-400 active:cursor-grabbing"
                          >
                            ⋮⋮
                          </span>

                          <button
                            type="button"
                            onClick={() => abrirEditarEjercicioPrincipal(item)}
                            disabled={accionCargando !== null}
                            className="text-zinc-300 text-sm hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => borrarEjercicioPrincipal(item._localId)}
                            disabled={accionCargando !== null}
                            className="text-red-400 text-sm hover:text-red-300 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {accionCargando === `borrar-ejercicio-${item._localId}` ? <BotonCargando texto="Borrando..." /> : "Borrar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
        </section>

        {mostrarEditarRutina && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">Editar rutina</h2>

              <div className="space-y-3">
                <input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                  placeholder="Nombre"
                />

                <input
                  value={editObjetivo}
                  onChange={(e) => setEditObjetivo(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                  placeholder="Objetivo"
                />

                <input
                  value={editEstructura}
                  onChange={(e) => setEditEstructura(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                  placeholder="Estructura"
                />

                <textarea
                  value={editEntradaCalorTexto}
                  onChange={(e) => setEditEntradaCalorTexto(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 min-h-24"
                  placeholder="Notas generales de entrada en calor"
                />

                <textarea
                  value={editDescripcion}
                  onChange={(e) => setEditDescripcion(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 min-h-28"
                  placeholder="Descripción"
                />
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setMostrarEditarRutina(false)}
                  disabled={accionCargando !== null}
                  className="flex-1 border border-zinc-700 rounded-xl py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarEdicionRutina}
                  disabled={accionCargando !== null}
                  className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {accionCargando === "guardar-rutina" ? <BotonCargando texto="Guardando..." /> : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarEntradaCalor && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">
                {entradaEditandoId ? "Editar entrada en calor" : "Agregar entrada en calor"}
              </h2>

              <div className="space-y-3">
                <select
                  value={entradaEjercicioId}
                  onChange={(e) => seleccionarEjercicioEntrada(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                >
                  <option value="">Seleccionar del banco de ejercicios</option>

                  {ejercicios.map((ejercicio) => (
                    <option key={ejercicio.id} value={ejercicio.id}>
                      {ejercicio.nombre}
                    </option>
                  ))}
                </select>

                <input
                  value={entradaNombreEjercicio}
                  onChange={(e) => setEntradaNombreEjercicio(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                  placeholder="Nombre del ejercicio"
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={entradaSeries}
                    onChange={(e) => setEntradaSeries(e.target.value)}
                    className="w-full bg-zinc-800 rounded-xl p-3"
                  >
                    <option value="">Series</option>
                    {opcionesSeries.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion === "custom" ? "Custom" : opcion}
                      </option>
                    ))}
                  </select>

                  {entradaSeries === "custom" && (
                    <input
                      type="number"
                      value={entradaSeriesCustom}
                      onChange={(e) => setEntradaSeriesCustom(e.target.value)}
                      className="w-full bg-zinc-800 rounded-xl p-3"
                      placeholder="Series custom"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 rounded-xl bg-zinc-800 p-3">
                    <input
                      type="checkbox"
                      checked={entradaTipoPrescripcion === "repeticiones"}
                      onChange={() => {
                        setEntradaTipoPrescripcion("repeticiones");
                        setEntradaDuracion("");
                      }}
                    />
                    <span>Por repeticiones</span>
                  </label>

                  <label className="flex items-center gap-2 rounded-xl bg-zinc-800 p-3">
                    <input
                      type="checkbox"
                      checked={entradaTipoPrescripcion === "tiempo"}
                      onChange={() => {
                        setEntradaTipoPrescripcion("tiempo");
                        setEntradaRepeticiones("");
                      }}
                    />
                    <span>Por tiempo</span>
                  </label>
                </div>

                {entradaTipoPrescripcion === "repeticiones" && (
                  <input
                    value={entradaRepeticiones}
                    onChange={(e) => setEntradaRepeticiones(e.target.value)}
                    className="w-full bg-zinc-800 rounded-xl p-3"
                    placeholder="Reps"
                  />
                )}

                {entradaTipoPrescripcion === "tiempo" && (
                  <SelectorTiempo
                    value={entradaDuracion}
                    onChange={setEntradaDuracion}
                    label="Duración"
                  />
                )}

                <textarea
                  value={entradaObservaciones}
                  onChange={(e) => setEntradaObservaciones(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 min-h-24"
                  placeholder="Observaciones"
                />
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    limpiarFormularioEntrada();
                    setMostrarEntradaCalor(false);
                  }}
                  disabled={accionCargando !== null}
                  className="flex-1 border border-zinc-700 rounded-xl py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarEntradaCalor}
                  disabled={accionCargando !== null}
                  className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {accionCargando === "guardar-entrada" ? <BotonCargando texto="Guardando..." /> : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarEjercicioPrincipal && (
          <div className="fixed inset-0 bg-black/60 overflow-y-auto p-4 z-50">
            <div className="flex min-h-full items-start justify-center py-4">
              <div className="w-full max-w-lg max-h-[90vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col">
                <div className="p-6 pb-4">
                  <h2 className="text-2xl font-bold">
                    {ejercicioEditandoId ? "Editar ejercicio" : "Agregar ejercicio"}
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-4">
                  <div className="space-y-3">
                    <select
                      value={ejercicioId}
                      onChange={(e) => seleccionarEjercicioPrincipal(e.target.value)}
                      className="w-full bg-zinc-800 rounded-xl p-3"
                    >
                      <option value="">Seleccionar del banco de ejercicios</option>

                      {ejercicios.map((ejercicio) => (
                        <option key={ejercicio.id} value={ejercicio.id}>
                          {ejercicio.nombre}
                        </option>
                      ))}
                      <option value="crear_nuevo">
                        + Crear nuevo ejercicio
                      </option>
                    </select>
                    <button
                      type="button"
                      onClick={abrirHistorialEjercicio}
                      disabled={!ejercicioId}
                      className="w-full rounded-xl border border-blue-700 px-3 py-3 text-sm text-blue-300 hover:bg-blue-950 disabled:opacity-50"
                    >
                      Ver historial del ejercicio
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={series}
                        onChange={(e) => {
                          setSeries(e.target.value);
                          const nuevaCantidad = e.target.value === "custom" ? Number(seriesCustom || 0) : Number(e.target.value || 0);
                          actualizarCantidadSeriesAvanzadas(nuevaCantidad);
                        }}
                        className="w-full bg-zinc-800 rounded-xl p-3"
                      >
                        <option value="">Series</option>
                        {opcionesSeries.map((opcion) => (
                          <option key={opcion} value={opcion}>
                            {opcion === "custom" ? "Custom" : opcion}
                          </option>
                        ))}
                      </select>

                      {series === "custom" && (
                        <input
                          type="number"
                          value={seriesCustom}
                          onChange={(e) => {
                            setSeriesCustom(e.target.value);
                            actualizarCantidadSeriesAvanzadas(Number(e.target.value || 0));
                          }}
                          className="w-full bg-zinc-800 rounded-xl p-3"
                          placeholder="Series custom"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTipoConfiguracionSeries("simple")}
                        className={`rounded-xl border p-3 text-left ${
                          tipoConfiguracionSeries === "simple"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                            : "border-zinc-700 bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        <p className="font-semibold">Simple</p>
                        <p className="text-xs text-zinc-400 mt-1">Todas las series iguales</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTipoConfiguracionSeries("avanzado");
                          actualizarCantidadSeriesAvanzadas(cantidadSeriesPrincipal() || 1);
                        }}
                        className={`rounded-xl border p-3 text-left ${
                          tipoConfiguracionSeries === "avanzado"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                            : "border-zinc-700 bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        <p className="font-semibold">Serie por serie</p>
                        <p className="text-xs text-zinc-400 mt-1">Reps y peso diferentes</p>
                      </button>
                    </div>

                    {tipoConfiguracionSeries === "simple" && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-2 rounded-xl bg-zinc-800 p-3">
                            <input
                              type="checkbox"
                              checked={tipoPrescripcion === "repeticiones"}
                              onChange={() => {
                                setTipoPrescripcion("repeticiones");
                                setDuracion("");
                              }}
                            />
                            <span>Por repeticiones</span>
                          </label>

                          <label className="flex items-center gap-2 rounded-xl bg-zinc-800 p-3">
                            <input
                              type="checkbox"
                              checked={tipoPrescripcion === "tiempo"}
                              onChange={() => {
                                setTipoPrescripcion("tiempo");
                                setRepeticiones("");
                              }}
                            />
                            <span>Por tiempo</span>
                          </label>
                        </div>

                        {tipoPrescripcion === "repeticiones" && (
                          <input
                            value={repeticiones}
                            onChange={(e) => setRepeticiones(e.target.value)}
                            className="w-full bg-zinc-800 rounded-xl p-3"
                            placeholder="Reps"
                          />
                        )}

                        {tipoPrescripcion === "tiempo" && (
                          <SelectorTiempo
                            value={duracion}
                            onChange={setDuracion}
                            label="Duración"
                          />
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          {!porcentajeRm && (
                            <input
                              value={peso}
                              onChange={(e) => cambiarPeso(e.target.value)}
                              className="w-full bg-zinc-800 rounded-xl p-3"
                              placeholder="Peso"
                            />
                          )}

                          {!peso && (
                            <select
                              value={porcentajeRm}
                              onChange={(e) => cambiarPorcentajeRm(e.target.value)}
                              className="w-full bg-zinc-800 rounded-xl p-3"
                            >
                              <option value="">%RM</option>

                              {porcentajesRM.map((valor) => (
                                <option key={valor} value={String(valor)}>
                                  {valor === 0 ? "0 - Peso corporal" : `${valor}%`}
                                </option>
                              ))}
                            </select>
                          )}

                          <select
                            value={rir}
                            onChange={(e) => setRir(e.target.value)}
                            className="w-full bg-zinc-800 rounded-xl p-3"
                          >
                            <option value="">RIR</option>
                            {opcionesRIR.map((valor) => (
                              <option key={valor} value={String(valor)}>
                                {valor}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
                          <SelectorTiempo
                            value={descanso}
                            onChange={setDescanso}
                            label="Descanso entre series"
                            compacto
                          />
                        </div>
                      </>
                    )}

                    {tipoConfiguracionSeries === "avanzado" && (
                      <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
                        <p className="text-sm font-semibold text-zinc-300">Configurar cada serie</p>

                        <div className="grid grid-cols-[64px_110px_110px_110px] gap-2 px-1 text-xs font-semibold text-zinc-500">
                          <span></span>
                          <span>Reps</span>
                          <span>Peso</span>
                          <span>%RM</span>
                        </div>

                        {seriesAvanzadas.map((serie) => (
                          <div key={serie._localId} className="grid grid-cols-[64px_110px_110px_110px] gap-2 items-center">
                            <span className="text-sm text-zinc-400">Serie {serie.numero_serie}</span>

                            <input
                              type="number"
                              value={serie.repeticiones || ""}
                              onChange={(e) => actualizarSerieAvanzada(serie.numero_serie, "repeticiones", e.target.value)}
                              className="h-12 w-full bg-zinc-800 rounded-xl px-3"
                              placeholder="Reps"
                            />

                            <input
                              type="number"
                              value={serie.peso || ""}
                              onChange={(e) => actualizarSerieAvanzada(serie.numero_serie, "peso", e.target.value)}
                              disabled={Boolean(serie.porcentaje_rm)}
                              className="h-12 w-full bg-zinc-800 rounded-xl px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                              placeholder="Peso"
                            />

                            <select
                              value={serie.porcentaje_rm || ""}
                              onChange={(e) => actualizarSerieAvanzada(serie.numero_serie, "porcentaje_rm", e.target.value)}
                              disabled={Boolean(serie.peso)}
                              className="h-12 w-full bg-zinc-800 rounded-xl px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <option value="">%RM</option>
                              {porcentajesRM.map((valor) => (
                                <option key={valor} value={String(valor)}>
                                  {valor === 0 ? "0 - Peso corporal" : `${valor}%`}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}

                        <div className="pt-2">
                          <select
                            value={rir}
                            onChange={(e) => setRir(e.target.value)}
                            className="w-full bg-zinc-800 rounded-xl p-3"
                          >
                            <option value="">RIR general</option>
                            {opcionesRIR.map((valor) => (
                              <option key={valor} value={String(valor)}>
                                {valor}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
                          <SelectorTiempo
                            value={descanso}
                            onChange={setDescanso}
                            label="Descanso general"
                            compacto
                          />
                        </div>
                      </div>
                    )}

                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      className="w-full bg-zinc-800 rounded-xl p-3 min-h-24"
                      placeholder="Observaciones"
                    />
                  </div>
                </div>
                <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-6 pt-4">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        limpiarFormularioEjercicio();
                        setMostrarEjercicioPrincipal(false);
                      }}
                      disabled={accionCargando !== null}
                      className="flex-1 border border-zinc-700 rounded-xl py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={guardarEjercicioPrincipal}
                      disabled={accionCargando !== null}
                      className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {accionCargando === "guardar-ejercicio" ? <BotonCargando texto="Guardando..." /> : "Guardar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {mostrarConfirmarSalida && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
              <h2 className="text-xl font-bold">Hay cambios sin guardar</h2>

              <p className="mt-3 text-sm text-zinc-400">
                Si salís ahora, se perderán los cambios que todavía no guardaste.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarConfirmarSalida(false);
                    setSalidaPendiente(null);
                  }}
                  className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold hover:bg-zinc-800"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const destino = salidaPendiente || "/rutinas";
                    setMostrarConfirmarSalida(false);
                    setSalidaPendiente(null);
                    window.location.href = destino;
                  }}
                  className="rounded-xl border border-red-800 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-950"
                >
                  Salir sin guardar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const ok = await guardarCambios();
                    if (!ok) {
                      return;
                    }
                    const destino = salidaPendiente || "/rutinas";
                    setMostrarConfirmarSalida(false);
                    setSalidaPendiente(null);
                    window.location.href = destino;
                  }}
                  disabled={accionCargando !== null}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {accionCargando === "guardar-rutina" ? <BotonCargando texto="Guardando..." /> : "Guardar y salir"}
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarModalAsignar && (
          <AsignarModal
            tipo="alumnos"
            items={alumnos.map((alumno) => ({
              id: alumno.id,
              nombre: `${alumno.nombre} ${alumno.apellido || ""}`.trim(),
            }))}
            onClose={() => setMostrarModalAsignar(false)}
            onConfirm={asignarAlumno}
          />
        )}
      </div>
            <EjercicioHistorialModal
              abierto={mostrarHistorialEjercicio}
              alumnoId={new URLSearchParams(window.location.search).get("alumnoId")}
              ejercicioId={historialEjercicioId}
              nombreEjercicio={historialNombreEjercicio}
              onCerrar={() => setMostrarHistorialEjercicio(false)}
            />
            <CrearEjercicioModal
        abierto={mostrarCrearEjercicio}
        onCerrar={() => setMostrarCrearEjercicio(false)}
        onCreado={async (ejercicio) => {
          invalidarEjerciciosCache();
          await cargarEjercicios();
          setEjercicioId(ejercicio.id);
          setNombreEjercicio(ejercicio.nombre);
        }}
      />
    </main>
  );
}
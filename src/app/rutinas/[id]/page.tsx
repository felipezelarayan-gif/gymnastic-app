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
import {
  getEjerciciosBasicosCached,
  invalidarEjerciciosCache,
} from "@/lib/ejercicios-cache";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import AsignarModal from "@/components/shared/AsignarModal";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";
import { campoBilingue } from "@/lib/utils/campoBilingue";
import AgregarEjercicioModal, {
  type DestinoEjercicio,
  type EjercicioFormData,
  type EjercicioParaEditar,
} from "@/components/rutinas/AgregarEjercicioModal";

function ordenarEjerciciosPorIdioma(lista: Ejercicio[], idioma: "es" | "en") {
  return [...lista].sort((a, b) =>
    campoBilingue(a, "nombre", idioma).localeCompare(
      campoBilingue(b, "nombre", idioma),
      idioma
    )
  );
}

type TipoPrescripcion = "repeticiones" | "tiempo";

type TipoConfiguracionSeries = "simple" | "avanzado";
type ModoRutina = "ejercicio" | "amrap" | "circuito";
type TipoTiempoCircuito = "descanso_entre_rondas" | "duracion_ronda";

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
  nombre_es?: string | null;
  nombre_en?: string | null;
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
  tipo_carga?: "peso_fijo" | "porcentaje_rm" | "peso_corporal" | null;
  observaciones?: string | null;
  orden?: number | null;
  tipo_configuracion?: TipoConfiguracionSeries | null;
  modo?: ModoRutina | null;
  tiempo_limite?: string | null;
  rondas_objetivo?: number | null;
  descanso_entre_rondas?: string | null;
  tipo_tiempo_circuito?: TipoTiempoCircuito | null;
  duracion_ronda?: string | null;
  bloque_id?: string | null;
  bloque_orden?: number | null;
  _estado: EstadoElemento;
};

type RutinaEjercicioSerie = {
  _localId: string;
  id?: string;
  rutina_ejercicio_id?: string;
  numero_serie: number;
  tipo_prescripcion?: TipoPrescripcion | null;
  repeticiones?: string | null;
  duracion?: string | null;
  peso?: string | null;
  porcentaje_rm?: string | null;
  tipo_carga?: "peso_fijo" | "porcentaje_rm" | "peso_corporal" | null;
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
  peso?: string | null;
  porcentaje_rm?: string | null;
  rir?: string | null;
  descanso?: string | null;
  tipo_configuracion?: TipoConfiguracionSeries | null;
  modo?: ModoRutina | null;
  tiempo_limite?: string | null;
  rondas_objetivo?: number | null;
  descanso_entre_rondas?: string | null;
  tipo_tiempo_circuito?: TipoTiempoCircuito | null;
  duracion_ronda?: string | null;
  bloque_id?: string | null;
  bloque_orden?: number | null;
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

function textoPrescripcion(item: {
  tipo_prescripcion?: string | null;
  repeticiones?: string | null;
  duracion?: string | null;
}, t?: (key: string, params?: Record<string, string | number>) => string) {
  if (item.tipo_prescripcion === "tiempo") {
    return item.duracion ? `${t ? t("rutinas.duracionLabel", { valor: item.duracion }) : `Duración: ${item.duracion}`}` : "Duración: -";
  }
  return item.repeticiones ? `${t ? t("rutinas.repsLabel", { valor: item.repeticiones }) : `Reps: ${item.repeticiones}`}` : "Reps: -";
}

export default function RutinaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, idioma } = useIdioma();
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const { mostrarToast } = useToast();
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
  const [mostrarCrearEjercicio, setMostrarCrearEjercicio] = useState(false);
  const [mostrarModalAsignar, setMostrarModalAsignar] = useState(false);
  const [mostrarAsignacionesModal, setMostrarAsignacionesModal] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDestino, setModalDestino] = useState<DestinoEjercicio>("principal");
  const [modalEditando, setModalEditando] = useState<EjercicioParaEditar | null>(null);
  const [modalBloque, setModalBloque] = useState<EjercicioParaEditar[]>([]);
  const [modalSeriesExistentes, setModalSeriesExistentes] = useState<EjercicioParaEditar[]>([]);
  const [modalEditandoId, setModalEditandoId] = useState<string | null>(null);

  const [editNombre, setEditNombre] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editObjetivo, setEditObjetivo] = useState("");
  const [editEstructura, setEditEstructura] = useState("");
  const [editEntradaCalorTexto, setEditEntradaCalorTexto] = useState("");


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
      mostrarToast(error.message, "error");
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
    const mapeados = (data || []).map((ejercicio) => ({
      id: ejercicio.id,
      nombre: ejercicio.nombre,
      nombre_es: ejercicio.nombre_es,
      nombre_en: ejercicio.nombre_en,
      grupo_muscular: ejercicio.grupo_muscular ?? undefined,
    }));
    setEjercicios(ordenarEjerciciosPorIdioma(mapeados, idioma));
  }

  async function cargarEntradaCalor() {
    const { data, error } = await supabase
      .from("rutina_entrada_calor")
      .select("id,rutina_id,ejercicio_id,nombre_ejercicio,series,tipo_prescripcion,duracion,repeticiones,peso,porcentaje_rm,rir,descanso,tipo_configuracion,modo,tiempo_limite,rondas_objetivo,descanso_entre_rondas,tipo_tiempo_circuito,duracion_ronda,bloque_id,bloque_orden,observaciones,orden")
      .eq("rutina_id", id)
      .order("orden", { ascending: true });

    if (error) {
      mostrarToast(error.message, "error");
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
      .select("id,rutina_id,ejercicio_id,nombre_ejercicio,series,tipo_prescripcion,repeticiones,duracion,peso,descanso,rir,porcentaje_rm,observaciones,orden,tipo_configuracion,modo,tiempo_limite,rondas_objetivo,descanso_entre_rondas,tipo_tiempo_circuito,duracion_ronda,bloque_id,bloque_orden")
      .eq("rutina_id", id)
      .order("orden", { ascending: true });

    if (error) {
      mostrarToast(error.message, "error");
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
      .select("id,rutina_ejercicio_id,numero_serie,tipo_prescripcion,repeticiones,duracion,peso,porcentaje_rm,tipo_carga")
      .in("rutina_ejercicio_id", ejerciciosAvanzadosIds)
      .order("numero_serie", { ascending: true });

    if (seriesError) {
      mostrarToast(seriesError.message, "error");
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
      mostrarToast(error.message, "error");
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
        mostrarToast(rutinaPropiaError.message, "error");
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
      .order("fecha_asignacion", { ascending: false });

    if (error) {
      mostrarToast(error.message, "error");
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
      mostrarToast("No se pudo validar el profesor actual.", "error");
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

      mostrarToast("Cambios guardados exitosamente", "exito");
      return true;
    } catch (error) {
      console.error("Error al guardar:", error);
      mostrarToast(`Error al guardar: ${error instanceof Error ? error.message : "Error desconocido"}`, "error");
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

    setMostrarEditarRutina(false);
  }

  function guardarEdicionRutina() {
    if (!editNombre.trim()) {
      mostrarToast("Ingresá un nombre.", "error");
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
      mostrarToast("No se pudo validar el profesor actual.", "error");
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
          mostrarToast(result.error || "Error al borrar la rutina. Por favor, intentá de nuevo.", "error");
        }
        return;
      }
      window.location.href = "/rutinas";
    } catch (error) {
      console.error("Error general al borrar rutina:", error);
      mostrarToast("Error al borrar la rutina. Por favor, intentá de nuevo.", "error");
    } finally {
      setAccionCargando(null);
    }
  }

  function abrirAgregarEntrada() {
    setModalEditando(null);
    setModalBloque([]);
    setModalSeriesExistentes([]);
    setModalEditandoId(null);
    setModalDestino("entrada");
    setModalOpen(true);
  }

  async function abrirEditarEntradaCalor(item: EntradaCalorEjercicio) {
    setModalDestino("entrada");
    setModalEditandoId(item._localId);
    setModalEditando(item);

    if (item.modo === "amrap" || item.modo === "circuito") {
      const bloque = entradaCalorEjercicios
        .filter((ejercicio) =>
          item.bloque_id
            ? ejercicio.bloque_id === item.bloque_id
            : ejercicio._localId === item._localId
        )
        .sort((a, b) => Number(a.bloque_orden || 0) - Number(b.bloque_orden || 0));
      setModalBloque(bloque.length > 0 ? bloque : [item]);
      setModalSeriesExistentes([]);
    } else {
      setModalBloque([]);
      if (item.tipo_configuracion === "avanzado" && item.id) {
        const { data: seriesData } = await supabase
          .from("rutina_ejercicio_series")
          .select("id,rutina_ejercicio_id,numero_serie,tipo_prescripcion,repeticiones,duracion,peso,porcentaje_rm,tipo_carga")
          .eq("rutina_ejercicio_id", item.id)
          .order("numero_serie", { ascending: true });
        setModalSeriesExistentes(
          (seriesData || []).map((serie) => ({
            ...serie,
            _localId: serie.id || crypto.randomUUID(),
          }))
        );
      } else {
        setModalSeriesExistentes([]);
      }
    }
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setModalEditando(null);
    setModalBloque([]);
    setModalSeriesExistentes([]);
    setModalEditandoId(null);
  }

  function handleGuardarModal(datos: EjercicioFormData) {
    if (modalDestino === "entrada") {
      handleGuardarEntrada(datos);
    } else {
      handleGuardarPrincipal(datos);
    }
    cerrarModal();
  }

  function handleGuardarEntrada(datos: EjercicioFormData) {
    const ordenParaGuardar = modalEditandoId
      ? entradaCalorEjercicios.find((e) => e._localId === modalEditandoId)?.orden
      : entradaCalorEjercicios.length + 1;

    if (datos.modo === "amrap" || datos.modo === "circuito") {
      const bloqueAnterior = modalEditandoId
        ? entradaCalorEjercicios.find((entrada) => entrada._localId === modalEditandoId)?.bloque_id
        : null;
      const bloqueId = bloqueAnterior || crypto.randomUUID();
      const nuevasEntradas: EntradaCalorEjercicio[] = datos.bloque.map((item, index) => {
        const ejercicioBanco = ejercicios.find((ejercicio) => ejercicio.id === item.ejercicioId);
        const corporal = item.tipoCarga === "peso_corporal";
        const porcentaje = item.tipoCarga === "porcentaje_rm";

        return {
          _localId: crypto.randomUUID(),
          id: crypto.randomUUID(),
          rutina_id: id,
          ejercicio_id: item.ejercicioId,
          nombre_ejercicio: campoBilingue(ejercicioBanco || { nombre: "" }, "nombre", idioma) || "",
          series: null,
          tipo_prescripcion: item.tipoPrescripcion,
          duracion: item.tipoPrescripcion === "tiempo" ? item.duracion : "",
          repeticiones: item.tipoPrescripcion === "repeticiones" ? item.repeticiones : "",
          peso: corporal || porcentaje ? "" : item.valorCarga,
          porcentaje_rm: corporal ? "0" : porcentaje ? item.valorCarga : "",
          rir: "",
          descanso: "",
          tipo_configuracion: "simple",
          modo: datos.modo,
          tiempo_limite: datos.tiempo_limite,
          rondas_objetivo: datos.rondas_objetivo,
          descanso_entre_rondas: datos.descanso_entre_rondas,
          tipo_tiempo_circuito: datos.tipo_tiempo_circuito,
          duracion_ronda: datos.duracion_ronda,
          bloque_id: bloqueId,
          bloque_orden: index + 1,
          observaciones: datos.observaciones,
          orden: ordenParaGuardar,
          _estado: "nuevo",
        };
      });

      setEntradaCalorEjercicios((prev) => {
        const anteriores = prev.map((entrada) =>
          entrada.bloque_id === bloqueId || entrada._localId === modalEditandoId
            ? { ...entrada, _estado: "eliminado" as EstadoElemento }
            : entrada
        );
        return [...anteriores, ...nuevasEntradas];
      });
      return;
    }

    // Ejercicio simple de entrada en calor
    const ejercicioBanco = ejercicios.find((ejercicio) => ejercicio.id === datos.ejercicio_id);
    const payload = {
      rutina_id: id,
      ejercicio_id: datos.ejercicio_id,
      nombre_ejercicio: campoBilingue(ejercicioBanco || { nombre: "" }, "nombre", idioma) || "",
      series: datos.series,
      tipo_prescripcion: datos.tipo_prescripcion,
      duracion: datos.duracion,
      repeticiones: datos.repeticiones,
      peso: datos.peso,
      porcentaje_rm: datos.porcentaje_rm,
      rir: datos.rir,
      descanso: datos.descanso,
      tipo_configuracion: datos.tipo_configuracion,
      observaciones: datos.observaciones,
      orden: ordenParaGuardar,
    };

    if (modalEditandoId) {
      setEntradaCalorEjercicios((prev) =>
        prev.map((e) =>
          e._localId === modalEditandoId
            ? { ...e, ...payload, _estado: e._estado === "sinCambios" ? "editado" : e._estado }
            : e
        )
      );
    } else {
      setEntradaCalorEjercicios((prev) => [
        ...prev,
        { _localId: crypto.randomUUID(), id: crypto.randomUUID(), ...payload, _estado: "nuevo" },
      ]);
    }
  }

  function handleGuardarPrincipal(datos: EjercicioFormData & { _seriesAvanzadas?: any[] }) {
    const ordenParaGuardar = modalEditandoId
      ? rutinaEjercicios.find((e) => e._localId === modalEditandoId)?.orden
      : rutinaEjercicios.filter((e) => e._estado !== "eliminado").length + 1;

    if (datos.modo === "amrap" || datos.modo === "circuito") {
      const bloqueExistente = modalEditandoId
        ? rutinaEjercicios.find((item) => item._localId === modalEditandoId)?.bloque_id
        : null;
      const bloqueId = bloqueExistente || crypto.randomUUID();
      const ejerciciosAmrap: RutinaEjercicio[] = datos.bloque.map((item, index) => {
        const ejercicioBanco = ejercicios.find((ejercicio) => ejercicio.id === item.ejercicioId);
        const esPesoCorporal = item.tipoCarga === "peso_corporal";
        const esPorcentajeRm = item.tipoCarga === "porcentaje_rm";

        return {
          _localId: crypto.randomUUID(),
          id: crypto.randomUUID(),
          rutina_id: id,
          ejercicio_id: item.ejercicioId,
          nombre_ejercicio: campoBilingue(ejercicioBanco || { nombre: "" }, "nombre", idioma) || "",
          series: null,
          tipo_prescripcion: item.tipoPrescripcion,
          repeticiones: item.tipoPrescripcion === "repeticiones" ? item.repeticiones : "",
          duracion: item.tipoPrescripcion === "tiempo" ? item.duracion : "",
          peso: esPesoCorporal || esPorcentajeRm ? "" : item.valorCarga,
          porcentaje_rm: esPorcentajeRm ? item.valorCarga : esPesoCorporal ? "0" : "",
          descanso: "",
          rir: "",
          observaciones: datos.observaciones,
          orden: ordenParaGuardar,
          tipo_configuracion: "simple",
          modo: datos.modo,
          tiempo_limite: datos.tiempo_limite,
          rondas_objetivo: datos.rondas_objetivo,
          descanso_entre_rondas: datos.descanso_entre_rondas,
          tipo_tiempo_circuito: datos.tipo_tiempo_circuito,
          duracion_ronda: datos.duracion_ronda,
          bloque_id: bloqueId,
          bloque_orden: index + 1,
          _estado: "nuevo",
        };
      });

      setRutinaEjercicios((prev) => {
        const idsDelBloque = new Set(
          prev
            .filter((item) => item.bloque_id === bloqueId || item._localId === modalEditandoId)
            .map((item) => item._localId)
        );
        const conservados = prev.map((item) =>
          idsDelBloque.has(item._localId) ? { ...item, _estado: "eliminado" as EstadoElemento } : item
        );
        return [...conservados, ...ejerciciosAmrap];
      });
      return;
    }

    // Ejercicio simple principal
    const ejercicioBanco = ejercicios.find((ejercicio) => ejercicio.id === datos.ejercicio_id);
    const payload = {
      rutina_id: id,
      ejercicio_id: datos.ejercicio_id,
      nombre_ejercicio: campoBilingue(ejercicioBanco || { nombre: "" }, "nombre", idioma) || "",
      series: datos.series,
      tipo_prescripcion: datos.tipo_prescripcion,
      repeticiones: datos.repeticiones,
      duracion: datos.duracion,
      peso: datos.peso,
      porcentaje_rm: datos.porcentaje_rm,
      rir: datos.rir,
      descanso: datos.descanso,
      observaciones: datos.observaciones,
      orden: ordenParaGuardar,
      tipo_configuracion: datos.tipo_configuracion,
      modo: "ejercicio" as const,
      tiempo_limite: null,
      rondas_objetivo: null,
      descanso_entre_rondas: null,
      tipo_tiempo_circuito: null,
      duracion_ronda: null,
    };

    if (modalEditandoId) {
      setRutinaEjercicios((prev) =>
        prev.map((e) =>
          e._localId === modalEditandoId
            ? { ...e, ...payload, _estado: e._estado === "sinCambios" ? "editado" : e._estado }
            : e
        )
      );
      setSeriesPorEjercicio((prev) => ({
        ...prev,
        [modalEditandoId]: datos.tipo_configuracion === "avanzado" ? (datos._seriesAvanzadas || []) : [],
      }));
    } else {
      const nuevoEjercicio: RutinaEjercicio = {
        _localId: crypto.randomUUID(),
        id: crypto.randomUUID(),
        ...payload,
        _estado: "nuevo",
      };
      setRutinaEjercicios((prev) => [...prev, nuevoEjercicio]);
      if (datos.tipo_configuracion === "avanzado") {
        setSeriesPorEjercicio((prev) => ({
          ...prev,
          [nuevoEjercicio._localId]: datos._seriesAvanzadas || [],
        }));
      }
    }
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

  function abrirAgregarPrincipal() {
    setModalEditando(null);
    setModalBloque([]);
    setModalSeriesExistentes([]);
    setModalEditandoId(null);
    setModalDestino("principal");
    setModalOpen(true);
  }

  async function abrirEditarEjercicioPrincipal(item: RutinaEjercicio) {
    setModalDestino("principal");
    setModalEditandoId(item._localId);
    setModalEditando(item);

    if (item.modo === "amrap" || item.modo === "circuito") {
      const bloque = rutinaEjercicios
        .filter((ejercicio) =>
          item.bloque_id
            ? ejercicio.bloque_id === item.bloque_id
            : ejercicio._localId === item._localId
        )
        .sort((a, b) => Number(a.bloque_orden || 0) - Number(b.bloque_orden || 0));
      setModalBloque(bloque.length > 0 ? bloque : [item]);
      setModalSeriesExistentes([]);
    } else {
      setModalBloque([]);
      if (item.tipo_configuracion === "avanzado" && item.id) {
        const { data: seriesData } = await supabase
          .from("rutina_ejercicio_series")
          .select("id,rutina_ejercicio_id,numero_serie,tipo_prescripcion,repeticiones,duracion,peso,porcentaje_rm,tipo_carga")
          .eq("rutina_ejercicio_id", item.id)
          .order("numero_serie", { ascending: true });
        setModalSeriesExistentes(
          (seriesData || []).map((serie) => ({
            ...serie,
            _localId: serie.id || crypto.randomUUID(),
          }))
        );
      } else {
        setModalSeriesExistentes([]);
      }
    }
    setModalOpen(true);
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
        const idsABorrar = ejercicio.bloque_id
          ? new Set(rutinaEjercicios.filter((item) => item.bloque_id === ejercicio.bloque_id).map((item) => item._localId))
          : new Set([rutinaEjercicioId]);
        if (ejercicio._estado === "nuevo") {
          // Si es nuevo, eliminar directamente del array
          setRutinaEjercicios((prev) => prev.filter((e) => !idsABorrar.has(e._localId)));
        } else {
          // Si provenía de la BD, marcar como eliminado
          setRutinaEjercicios((prev) =>
            prev.map((e) => (idsABorrar.has(e._localId) ? { ...e, _estado: "eliminado" } : e))
          );
        }
      }
    } finally {
      setAccionCargando(null);
    }
  }

  async function asignarAlumno(alumnosSeleccionados: { id: string; nombre: string; fechaAsignacion?: string }[]) {
    if (!profesorId) {
      mostrarToast("No se pudo validar el profesor actual.", "error");
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
        mostrarToast("No tenés permiso para asignar esta rutina.", "error");
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
        mostrarToast(insertError.message, "error");
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
      mostrarToast("No se pudo validar el profesor actual.", "error");
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
          mostrarToast(resultado.error || "Error al quitar la asignación", "error");
          return;
        }

        // Recargar asignaciones desde Supabase (datos frescos)
        await cargarAsignaciones(profesorId);
      }
    } finally {
      setAccionCargando(null);
    }
  }

  function abrirHistorialEjercicio(ejercicioSeleccionadoId?: string) {
    const alumnoIdUrl = new URLSearchParams(window.location.search).get("alumnoId");

    if (!alumnoIdUrl) {
      mostrarToast("Abrí esta rutina desde el perfil de un alumno para ver su historial.", "error");
      return;
    }

    if (!ejercicioSeleccionadoId) {
      mostrarToast("Seleccioná un ejercicio primero.", "error");
      return;
    }

    const ejercicio = ejercicios.find((item) => item.id === ejercicioSeleccionadoId);

    setHistorialEjercicioId(ejercicioSeleccionadoId);
    setHistorialNombreEjercicio(ejercicio ? campoBilingue(ejercicio, "nombre", idioma) : "Ejercicio");
    setMostrarHistorialEjercicio(true);
  }

  // Determinar la URL de "atrás" según el origen
  function getBackUrl() {
    const searchParams = new URLSearchParams(window.location.search);
    const from = searchParams.get("from");
    const alumnoId = searchParams.get("alumnoId");
    if (from === "alumno" && alumnoId) {
      return `/alumnos/${alumnoId}/rutinas`;
    }
    return "/rutinas";
  }

  function intentarSalir(destino?: string) {
    const backUrl = destino || getBackUrl();
    if (hayCambios) {
      setSalidaPendiente(backUrl);
      setMostrarConfirmarSalida(true);
      return;
    }

    window.location.href = backUrl;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] mt-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 min-h-[220px]">
              <div className="h-8 w-48 rounded bg-zinc-800 mb-4" />
              <div className="h-4 w-32 rounded bg-zinc-800 mb-3" />
              <div className="h-4 w-64 rounded bg-zinc-800 mb-6" />
              <div className="flex gap-2">
                <div className="h-10 w-28 rounded-xl bg-zinc-800" />
                <div className="h-10 w-28 rounded-xl bg-zinc-800" />
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 min-h-[220px]">
              <div className="h-6 w-24 rounded bg-zinc-800 mb-4" />
              <div className="h-4 w-36 rounded bg-zinc-800 mb-4" />
              <div className="h-16 rounded-xl bg-zinc-800" />
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-5">
            <div className="h-6 w-36 rounded bg-zinc-800 mb-4" />
            <div className="h-12 rounded-xl bg-zinc-800 mb-3" />
            <div className="h-12 rounded-xl bg-zinc-800" />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-5">
            <div className="h-6 w-40 rounded bg-zinc-800 mb-4" />
            <div className="h-20 rounded-xl bg-zinc-800 mb-3" />
            <div className="h-20 rounded-xl bg-zinc-800" />
          </div>
        </div>
      </main>
    );
  }

  if (!rutina) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        {t("rutinas.noEncontrada")}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => intentarSalir()}
          className="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 transition"
        >
          {t("rutinas.atras")}
        </button>

        {/* Botón flotante de guardar cambios */}
        {hayCambios && (
          <div className="fixed top-24 left-4 right-4 z-50 flex flex-col gap-3 md:top-auto md:left-auto md:right-6 md:bottom-6 md:w-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl">
              <p className="text-sm text-zinc-300 mb-3">{t("rutinas.cambiosSinGuardar")}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={descartarCambios}
                  disabled={guardando}
                  className="px-4 py-2 text-sm border border-zinc-700 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("rutinas.descartar")}
                </button>
                <button
                  type="button"
                  onClick={guardarCambios}
                  disabled={guardando}
                  className="px-4 py-2 text-sm bg-emerald-500 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardando ? <BotonCargando texto={t("rutinas.guardando")} /> : t("rutinas.guardarCambios")}
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
                {t("rutinas.editarRutina")}
              </button>

              <button
                type="button"
                onClick={borrarRutina}
                disabled={accionCargando !== null}
                className="rounded-xl border border-red-800 px-4 py-3 text-sm text-red-400 hover:bg-red-950 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {accionCargando === "borrar-rutina" ? <BotonCargando texto={t("rutinas.borrando")} /> : t("rutinas.borrarRutina")}
              </button>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col min-h-[220px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{t("rutinas.alumnos")}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {asignaciones.filter((a) => a._estado !== "eliminado").length === 0
                    ? t("rutinas.sinAlumnosAsignados")
                    : `${asignaciones.filter((a) => a._estado !== "eliminado").length} ${asignaciones.filter((a) => a._estado !== "eliminado").length === 1 ? t("rutinas.alumnoAsignado") : t("rutinas.alumnosAsignados")}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMostrarModalAsignar(true)}
                disabled={accionCargando !== null || alumnos.length === 0}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {t("rutinas.asignar")}
              </button>
            </div>

            <div className="mt-4 max-h-[120px] overflow-hidden">
              {asignaciones.filter((a) => a._estado !== "eliminado").length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
                  {t("rutinas.noHayAlumnos")}
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
                            {accionCargando === `quitar-asignacion-${asignacion._localId}` ? <BotonCargando texto={t("rutinas.quitando")} /> : t("rutinas.quitar")}
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
                {t("rutinas.verTodasAsignaciones")}
              </button>
            )}
          </div>
        </section>

        {mostrarAsignacionesModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-lg max-h-[85vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-6 pb-4">
                <div>
                  <h2 className="text-2xl font-bold">{t("rutinas.asignaciones")}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {asignaciones.filter((a) => a._estado !== "eliminado").length}{" "}
                    {asignaciones.filter((a) => a._estado !== "eliminado").length === 1 ? t("rutinas.alumnoAsignado") : t("rutinas.alumnosAsignados")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarAsignacionesModal(false)}
                  disabled={accionCargando !== null}
                  className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t("rutinas.cerrar")}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {asignaciones.filter((a) => a._estado !== "eliminado").length === 0 ? (
                  <p className="text-zinc-400">{t("rutinas.noHayAlumnos")}</p>
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
            <h2 className="text-xl font-semibold">{t("rutinas.entradaEnCalor")}</h2>

            <button
              type="button"
              onClick={abrirAgregarEntrada}
              disabled={accionCargando !== null}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {t("rutinas.agregarEjercicio")}
            </button>
          </div>

          {rutina.entrada_calor && (
            <p className="text-zinc-400 whitespace-pre-wrap mb-4">
              {rutina.entrada_calor}
            </p>
          )}

          {entradaCalorEjercicios.filter((e) => e._estado !== "eliminado").length === 0 ? (
            <p className="text-zinc-500">{t("rutinas.sinEjerciciosEntrada")}</p>
          ) : (
            <div className="space-y-3">
              {entradaCalorEjercicios
                .filter((e) => e._estado !== "eliminado")
                .filter((e, index, lista) => {
                  if (e.modo !== "amrap" && e.modo !== "circuito") return true;
                  const clave = e.bloque_id || e.tiempo_limite || e._localId;
                  return lista.findIndex((item) =>
                    (item.modo === "amrap" || item.modo === "circuito") && (item.bloque_id || item.tiempo_limite || item._localId) === clave
                  ) === index;
                })
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
                          {item.modo === "amrap" || item.modo === "circuito"
                            ? item.modo === "amrap" ? t("rutinas.modoAmrap") : t("rutinas.modoCircuito")
                            : campoBilingue(ejercicios.find((ejercicio) => ejercicio.id === item.ejercicio_id) || { nombre: item.nombre_ejercicio }, "nombre", idioma)}
                        </h3>

                        <p className="text-zinc-400 mt-1">
                          {item.modo === "amrap" || item.modo === "circuito"
                            ? `${item.modo === "amrap" ? `${item.tiempo_limite || "-"}` : `${item.rondas_objetivo || "-"} ${t("rutinas.rondas")}`}${item.tipo_tiempo_circuito === "duracion_ronda" ? (item.duracion_ronda ? ` · ${item.duracion_ronda} · ${t("rutinas.duracionCadaRonda").toLowerCase()}` : "") : item.descanso_entre_rondas ? ` · ${item.descanso_entre_rondas} ${t("rutinas.descanso").toLowerCase()}` : item.rondas_objetivo ? ` · ${item.rondas_objetivo} ${t("rutinas.rondas")}` : ""}`
                            : `${item.series || "-"} ${t("rutinas.series").toLowerCase()} · ${textoPrescripcion(item, t)}`}
                        </p>

                        {(item.modo === "amrap" || item.modo === "circuito") && (
                          <div className={`mt-3 space-y-1 rounded-xl border p-3 text-sm text-zinc-300 ${item.modo === "amrap" ? "border-amber-500/20 bg-amber-500/5" : "border-cyan-500/20 bg-cyan-500/5"}`}>
                            {entradaCalorEjercicios
                              .filter((ejercicio) => ejercicio._estado !== "eliminado" && (
                                item.bloque_id
                                  ? ejercicio.bloque_id === item.bloque_id
                                  : ejercicio.tiempo_limite === item.tiempo_limite
                              ))
                              .sort((a, b) => Number(a.bloque_orden || 0) - Number(b.bloque_orden || 0))
                              .map((ejercicio, index) => (
                                <div key={ejercicio._localId} className="flex items-center justify-between gap-3">
                                  <span>{index + 1}. {campoBilingue(ejercicios.find((banco) => banco.id === ejercicio.ejercicio_id) || { nombre: ejercicio.nombre_ejercicio }, "nombre", idioma)}</span>
                                  <span className="text-zinc-400">
                                    {ejercicio.tipo_prescripcion === "tiempo" ? ejercicio.duracion || "-" : `${ejercicio.repeticiones || "-"} ${t("rutinas.repsShort").toLowerCase()}`} · {ejercicio.porcentaje_rm === "0"
                                      ? t("rutinas.pesoCorporalShort")
                                      : ejercicio.porcentaje_rm
                                        ? `${ejercicio.porcentaje_rm}${t("rutinas.porcentajeRM")} RM`
                                        : `${ejercicio.peso || "-"} kg`}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}

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
                          {t("rutinas.editar")}
                        </button>

                        <button
                          type="button"
                          onClick={() => borrarEntradaCalor(item._localId)}
                          disabled={accionCargando !== null}
                          className="text-red-400 text-sm hover:text-red-300 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {accionCargando === `borrar-entrada-${item._localId}` ? <BotonCargando texto={t("rutinas.borrando")} /> : t("rutinas.borrar")}
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
              <h2 className="text-xl font-semibold">{t("rutinas.ejerciciosPrincipales")}</h2>

              <button
                type="button"
                onClick={abrirAgregarPrincipal}
                disabled={accionCargando !== null}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {t("rutinas.agregar")}
              </button>
            </div>

            {rutinaEjercicios.filter((e) => e._estado !== "eliminado").length === 0 ? (
              <p className="text-zinc-400">
                {t("rutinas.sinEjercicios")}
              </p>
            ) : (
              <div className="space-y-3">
                {rutinaEjercicios
                  .filter((e) => e._estado !== "eliminado")
                  .filter((e, index, lista) =>
                    (e.modo !== "amrap" && e.modo !== "circuito") || !e.bloque_id || lista.findIndex((item) => item.bloque_id === e.bloque_id) === index
                  )
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
                            {item.modo === "amrap" || item.modo === "circuito"
                              ? item.modo === "amrap" ? t("rutinas.modoAmrap") : t("rutinas.modoCircuito")
                              : campoBilingue(ejercicios.find((ejercicio) => ejercicio.id === item.ejercicio_id) || { nombre: item.nombre_ejercicio }, "nombre", idioma)}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-zinc-400">
                              {item.modo === "amrap"
                                ? `${item.tiempo_limite || "-"}${item.rondas_objetivo ? ` · ${item.rondas_objetivo} ${t("rutinas.rondas")}` : ""}`
                                : item.modo === "circuito"
                                  ? `${item.rondas_objetivo || "-"} ${t("rutinas.rondas")}${item.tipo_tiempo_circuito === "duracion_ronda" ? (item.duracion_ronda ? ` · ${item.duracion_ronda} · ${t("rutinas.duracionCadaRonda").toLowerCase()}` : "") : (item.descanso_entre_rondas ? ` · ${item.descanso_entre_rondas} ${t("rutinas.descanso").toLowerCase()}` : "")}`
                                  : `${item.series || "-"} ${t("rutinas.series").toLowerCase()} · ${item.tipo_configuracion === "avanzado" ? t("rutinas.seriePorSerie") : textoPrescripcion(item, t)}`}
                            </p>

                            <span className={`rounded-full px-2 py-0.5 text-xs ${
                              item.modo === "amrap"
                                ? "bg-amber-500/10 text-amber-300"
                                : item.modo === "circuito"
                                  ? "bg-cyan-500/10 text-cyan-300"
                                  : item.tipo_configuracion === "avanzado"
                                ? "bg-blue-500/10 text-blue-300"
                                : "bg-zinc-800 text-zinc-300"
                            }`}>
                              {item.modo === "amrap"
                                ? t("rutinas.modoAmrap")
                                : item.modo === "circuito"
                                  ? t("rutinas.modoCircuito")
                                  : item.tipo_configuracion === "avanzado" ? t("rutinas.avanzadoLabel") : t("rutinas.simpleLabel")}
                            </span>
                          </div>

                          {(item.modo === "amrap" || item.modo === "circuito") && item.bloque_id && (
                            <div className={`mt-3 space-y-1 rounded-xl border p-3 text-sm text-zinc-300 ${item.modo === "amrap" ? "border-amber-500/20 bg-amber-500/5" : "border-cyan-500/20 bg-cyan-500/5"}`}>
                              {rutinaEjercicios
                                .filter((ejercicio) => ejercicio.bloque_id === item.bloque_id && ejercicio._estado !== "eliminado")
                                .sort((a, b) => Number(a.bloque_orden || 0) - Number(b.bloque_orden || 0))
                                .map((ejercicio, index) => (
                                  <div key={ejercicio._localId} className="flex items-center justify-between gap-3">
                                    <span>{index + 1}. {campoBilingue(ejercicios.find((banco) => banco.id === ejercicio.ejercicio_id) || { nombre: ejercicio.nombre_ejercicio }, "nombre", idioma)}</span>
                                    <span className="text-zinc-400">
                                      {ejercicio.tipo_prescripcion === "tiempo"
                                        ? ejercicio.duracion || "-"
                                        : `${ejercicio.repeticiones || "-"} ${t("rutinas.repsShort").toLowerCase()}`} · {ejercicio.porcentaje_rm === "0" ? t("rutinas.pesoCorporalShort") : ejercicio.porcentaje_rm ? `${ejercicio.porcentaje_rm}${t("rutinas.porcentajeRM")} RM` : `${ejercicio.peso || "-"} kg`}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}

                          {item.modo !== "amrap" && item.modo !== "circuito" && <div className="flex flex-wrap gap-2 mt-3 text-sm">
                            {item.peso && (
                              <span className="rounded-full bg-zinc-800 px-3 py-1">
                                {t("rutinas.peso")}: {item.peso}
                              </span>
                            )}

                            {item.porcentaje_rm && (
                              <span className="rounded-full bg-zinc-800 px-3 py-1">
                                {item.porcentaje_rm === "0"
                                  ? `${t("rutinas.porcentajeRM")}: ${t("rutinas.pesoCorporalShort")}`
                                  : `${t("rutinas.porcentajeRM")}: ${item.porcentaje_rm}%`}
                              </span>
                            )}

                            {item.rir && (
                              <span className="rounded-full bg-zinc-800 px-3 py-1">
                                {t("rutinas.rir")}: {item.rir}
                              </span>
                            )}

                            {item.descanso && (
                              <span className="rounded-full bg-zinc-800 px-3 py-1">
                                {t("rutinas.descansoEntreSeries")}: {item.descanso}
                              </span>
                            )}
                          </div>}

                          {item.observaciones && (
                            <p className="text-zinc-500 mt-3 whitespace-pre-wrap">
                              {item.observaciones}
                            </p>
                          )}
                          {item.tipo_configuracion === "avanzado" && (
                            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                              <p className="text-xs font-semibold text-zinc-400 mb-2">{t("rutinas.seriesConfiguradas")}</p>

                              <div className="space-y-1 text-sm text-zinc-300">
                                {(seriesPorEjercicio[item._localId] || []).map((serie) => (
                                  <div key={serie._localId} className="flex justify-between gap-3">
                                    <span>{t("rutinas.serie", { numero: serie.numero_serie })}</span>
                                    <span>
                                      {serie.tipo_prescripcion === "tiempo" ? serie.duracion || "-" : `${serie.repeticiones || "-"} ${t("rutinas.repsShort")}`} ·
                                      {serie.porcentaje_rm ? (
                                        <span className="text-emerald-400">
                                          {serie.porcentaje_rm === "0" ? ` ${t("rutinas.pesoCorporalShort")}` : ` ${serie.porcentaje_rm}${t("rutinas.porcentajeRM")} RM`}
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
                          {t("rutinas.editar")}
                        </button>

                        <button
                          type="button"
                          onClick={() => borrarEjercicioPrincipal(item._localId)}
                          disabled={accionCargando !== null}
                          className="text-red-400 text-sm hover:text-red-300 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {accionCargando === `borrar-ejercicio-${item._localId}` ? <BotonCargando texto={t("rutinas.borrando")} /> : t("rutinas.borrar")}
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
              <h2 className="text-2xl font-bold mb-4">{t("rutinas.editarRutinaTitulo")}</h2>

              <div className="space-y-3">
                <input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                  placeholder={t("rutinas.nombre")}
                />

                <input
                  value={editObjetivo}
                  onChange={(e) => setEditObjetivo(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                  placeholder={t("rutinas.objetivo")}
                />

                <input
                  value={editEstructura}
                  onChange={(e) => setEditEstructura(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                  placeholder={t("rutinas.estructura")}
                />

                <textarea
                  value={editEntradaCalorTexto}
                  onChange={(e) => setEditEntradaCalorTexto(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 min-h-24"
                  placeholder={t("rutinas.notasEntradaCalor")}
                />

                <textarea
                  value={editDescripcion}
                  onChange={(e) => setEditDescripcion(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 min-h-28"
                  placeholder={t("rutinas.descripcion")}
                />
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setMostrarEditarRutina(false)}
                  disabled={accionCargando !== null}
                  className="flex-1 border border-zinc-700 rounded-xl py-3 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t("rutinas.cancelar")}
                </button>

                <button
                  type="button"
                  onClick={guardarEdicionRutina}
                  disabled={accionCargando !== null}
                  className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {accionCargando === "guardar-rutina" ? <BotonCargando texto={t("rutinas.guardando")} /> : t("rutinas.guardar")}
                </button>
              </div>
            </div>
          </div>
        )}

        {modalOpen && (
          <AgregarEjercicioModal
            open={modalOpen}
            destino={modalDestino}
            editando={modalEditando}
            bloqueExistente={modalBloque}
            seriesExistentes={modalSeriesExistentes}
            ejercicios={ejercicios}
            onCerrar={() => {
              setModalOpen(false);
              setModalEditando(null);
              setModalBloque([]);
              setModalSeriesExistentes([]);
              setModalEditandoId(null);
            }}
            onCrearEjercicio={() => setMostrarCrearEjercicio(true)}
            onVerHistorial={(ejercicioSeleccionadoId) => abrirHistorialEjercicio(ejercicioSeleccionadoId)}
            onGuardar={handleGuardarModal}
            t={t}
          />
        )}

        {mostrarConfirmarSalida && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
              <h2 className="text-xl font-bold">{t("rutinas.hayCambiosSinGuardar")}</h2>

              <p className="mt-3 text-sm text-zinc-400">
                {t("rutinas.salirSinGuardarDesc")}
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
                  {t("rutinas.cancelar")}
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
                  {t("rutinas.salirSinGuardar")}
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
                  {accionCargando === "guardar-rutina" ? <BotonCargando texto={t("rutinas.guardando")} /> : t("rutinas.guardarYSalir")}
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
        onCreado={async () => {
          invalidarEjerciciosCache();
          await cargarEjercicios();
        }}
      />
    </main>
  );
}

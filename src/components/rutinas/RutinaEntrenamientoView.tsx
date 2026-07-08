  "use client";
 
  import { useEffect, useState } from "react";
  import { useSearchParams, useRouter } from "next/navigation";
 import { supabase } from "@/lib/supabase";
 import { getRolCached } from "@/lib/rol-cache";
 import { normalizarRelacion } from "@/lib/utils/normalizarRelacion";
 import { getEjerciciosVideosPorIdsCached } from "@/lib/ejercicios-cache";
 import { recalcularRMActual } from "@/lib/recalcularRMActual";
import CompletarEjercicioModal from "@/components/alumno/rutinas/CompletarEjercicioModal";
import { useToast } from "@/components/ui/ToastProvider";
 
 type Rutina = {
   id: string;
   nombre: string;
   descripcion?: string | null;
   objetivo?: string | null;
   estructura?: string | null;
   entrada_calor?: string | null;
 };
 
 type RutinaAsignada = {
   asignacion_id: string;
   rutina_id: string;
   activa?: boolean | null;
   fecha_asignacion?: string | null;
   orden?: number | null;
   completada?: boolean | null;
   fecha_completada?: string | null;
   rutinas?: Rutina | null;
 };
 
 type RutinaRelacion = Rutina | Rutina[] | null;
 
 type RutinaAsignacionResponse = {
   id: string;
   rutina_id: string;
   activa?: boolean | null;
   fecha_asignacion?: string | null;
   orden?: number | null;
   completada?: boolean | null;
   fecha_completada?: string | null;
   rutinas?: RutinaRelacion;
 };
 
 type RutinaEjercicio = {
   id: string;
   rutina_id: string;
   rutina_asignacion_id?: string | null;
   ejercicio_id?: string | null;
   nombre_ejercicio: string;
   series?: number | null;
   tipo_prescripcion?: string | null;
   repeticiones?: string | null;
   duracion?: string | null;
   peso?: string | null;
   porcentaje_rm?: string | null;
   rir?: string | null;
   descanso?: string | null;
   observaciones?: string | null;
   orden?: number | null;
   tipo_configuracion?: "simple" | "avanzado" | null;
   youtube_url?: string | null;
 };
 
  type RutinaEjercicioSerie = {
    id: string;
    rutina_ejercicio_id: string;
    numero_serie: number;
    repeticiones?: string | null;
    peso?: string | null;
    porcentaje_rm?: string | null;
    peso_objetivo?: string | null;
  };
 
 type EntradaCalorEjercicio = {
   id: string;
   rutina_id?: string | null;
   ejercicio_id?: string | null;
   nombre_ejercicio: string;
   series?: number | null;
   tipo_prescripcion?: string | null;
   duracion?: string | null;
   repeticiones?: string | null;
   observaciones?: string | null;
   orden?: number | null;
   youtube_url?: string | null;
 };
 
 type RMActual = {
   id: string;
   ejercicio_id: string;
   rm_calculado?: number | null;
 };
 
 type RegistroEntrenamiento = {
   id: string;
   rutina_id: string;
   rutina_asignacion_id?: string | null;
   rutina_ejercicio_id?: string | null;
   entrada_calor_id?: string | null;
   ejercicio_id?: string | null;
   nombre_ejercicio?: string | null;
   peso_kg?: number | null;
   repeticiones?: number | null;
   rpe?: number | null;
   rir?: number | null;
   completado?: boolean | null;
 };
 
 type SerieCompletadaCache = {
   numero_serie: number;
   peso_kg: number;
   repeticiones: number;
   rm_calculado: number | null;
 };
 
 type EjercicioCompletadoCache = {
   rutina_ejercicio_id: string;
   nombre_ejercicio: string;
   peso_kg: number;
   repeticiones: number;
   rpe: number;
   rir: number | null;
   rm_calculado: number | null;
   ejercicio_id?: string | null;
   rutina_id: string;
   rutina_asignacion_id: string;
   tipo_configuracion?: "simple" | "avanzado" | null;
   series_realizadas?: SerieCompletadaCache[];
 };
 
 type EntradaCalorCompletadaCache = {
   entrada_calor_id: string;
   nombre_ejercicio: string;
   rutina_id: string;
   rutina_asignacion_id: string;
   ejercicio_id?: string | null;
 };
 
 type BorradorEjercicioCache = {
   rutina_asignacion_id: string;
   rutina_ejercicio_id: string;
   rpe: string;
   rirReal: string;
   seriesRealizadas: Record<number, { peso: string; repeticiones: string }>;
 };
 
 type VideoEjercicio = {
   id: string;
   youtube_url?: string | null;
   video_url?: string | null;
 };
 
 type ProgresoRutinaCache = {
   ejercicios: EjercicioCompletadoCache[];
   entradas: EntradaCalorCompletadaCache[];
   borradores?: BorradorEjercicioCache[];
 };
 
 const opcionesRPE = Array.from({ length: 10 }, (_, index) => index + 1);
 const opcionesRIR = Array.from({ length: 6 }, (_, index) => index);
 
function textoPrescripcion(item: {
  tipo_prescripcion?: string | null;
  repeticiones?: string | null;
  duracion?: string | null;
}) {
  if (item.tipo_prescripcion === "tiempo") {
    return item.duracion ? `${item.duracion} por serie` : "Duración: -";
  }

  return item.repeticiones ? `${item.repeticiones} reps` : "Reps: -";
}
 

function textoPesoSerieAvanzada(
  serie: RutinaEjercicioSerie,
  item?: RutinaEjercicio,
  calcularPesoSerie?: (item: RutinaEjercicio, serie: RutinaEjercicioSerie) => string | null,
) {
  if (serie.peso) return `${serie.peso} kg`;

  if (serie.porcentaje_rm !== null && serie.porcentaje_rm !== undefined && serie.porcentaje_rm !== "") {
    const porcentaje = String(serie.porcentaje_rm).replace("%", "").trim();

    if (porcentaje === "0") return "0%RM = Peso corporal";

    const pesoCalculado = item && calcularPesoSerie ? calcularPesoSerie(item, serie) : null;

    if (pesoCalculado) return `${porcentaje}%RM = ${pesoCalculado} kg`;

    return `${porcentaje}%RM`;
  }

  return "- kg";
}

function textoPrescripcionAvanzada(
  series: RutinaEjercicioSerie[],
  item?: RutinaEjercicio,
  calcularPesoSerie?: (item: RutinaEjercicio, serie: RutinaEjercicioSerie) => string | null,
) {
  if (series.length === 0) return "Serie por serie";
 
  return series
    .map((serie) => `S${serie.numero_serie}: ${serie.repeticiones || "-"} x ${textoPesoSerieAvanzada(serie, item, calcularPesoSerie)}`)
    .join(" · ");
}
 
 
 function obtenerUrlVideo(video?: VideoEjercicio | null) {
   return video?.youtube_url || video?.video_url || null;
 }
 
 async function cargarVideosEjercicios(idsEjercicios: string[]) {
   const idsUnicos = Array.from(new Set(idsEjercicios.filter(Boolean)));
 
   if (idsUnicos.length === 0) return [] as VideoEjercicio[];
 
   const videos = await getEjerciciosVideosPorIdsCached(idsUnicos);
   return videos as VideoEjercicio[];
 }
 
type RutinaEntrenamientoModo = "alumno" | "profesor";

type RutinaEntrenamientoViewProps = {
  asignacionId: string;
  alumnoIdProp?: string;
  nombreAlumnoProp?: string;
  modo?: RutinaEntrenamientoModo;
  onClose?: () => void;
  onFinalizada?: () => void;
};

export default function RutinaEntrenamientoView({
  asignacionId,
  alumnoIdProp,
  nombreAlumnoProp,
  modo = "alumno",
  onClose,
  onFinalizada,
}: RutinaEntrenamientoViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const modoModificar = searchParams.get("modo") === "modificar";
   const [loading, setLoading] = useState(true);
   const [alumnoId, setAlumnoId] = useState("");
   const [nombreAlumno, setNombreAlumno] = useState("");
   const [rutinasAsignadas, setRutinasAsignadas] = useState<RutinaAsignada[]>([]);
 
   const [ejerciciosPorRutina, setEjerciciosPorRutina] = useState<Record<string, RutinaEjercicio[]>>({});
   const [seriesPorEjercicio, setSeriesPorEjercicio] = useState<Record<string, RutinaEjercicioSerie[]>>({});
   const [entradaPorRutina, setEntradaPorRutina] = useState<Record<string, EntradaCalorEjercicio[]>>({});
   const [registros, setRegistros] = useState<RegistroEntrenamiento[]>([]);
   const [rmsActuales, setRmsActuales] = useState<RMActual[]>([]);
   const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState<RutinaEjercicio | null>(null);
   // const [pesoUsado, setPesoUsado] = useState("");
   const [pesoSugeridoModal, setPesoSugeridoModal] = useState<string | null>(null);
   // const [repsRealizadas, setRepsRealizadas] = useState("");
   const [rpe, setRpe] = useState("");
   const [rirReal, setRirReal] = useState("");
   const [seriesRealizadas, setSeriesRealizadas] = useState<Record<number, { peso: string; repeticiones: string }>>({});
   const [guardandoEjercicio, setGuardandoEjercicio] = useState(false);
   const [ejerciciosCompletadosCache, setEjerciciosCompletadosCache] = useState<EjercicioCompletadoCache[]>([]);
   const [entradaCalorCompletadaCache, setEntradaCalorCompletadaCache] = useState<EntradaCalorCompletadaCache[]>([]);
   const [borradoresEjerciciosCache, setBorradoresEjerciciosCache] = useState<BorradorEjercicioCache[]>([]);
   const [guardandoRutina, setGuardandoRutina] = useState(false);
   const [deshaciendoId, setDeshaciendoId] = useState<string | null>(null);
   const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<string, boolean>>({});
 
  const [cargandoModificacion, setCargandoModificacion] = useState(false);
  const { mostrarToast } = useToast();
  
  useEffect(() => {
     if (!modoModificar || !asignacionId) return;
 
     const datos = sessionStorage.getItem("rutina_a_modificar");
     if (!datos) return;
 
     try {
       const modificacion = JSON.parse(datos);
 
       if (modificacion.asignacionId !== asignacionId) return;
 
       setCargandoModificacion(true);
 
       (async () => {
         const { data: registros, error } = await supabase
           .from("registros_entrenamiento")
           .select("rutina_ejercicio_id, ejercicio_id, nombre_ejercicio, peso_kg, repeticiones, rpe, rir, rm_calculado, numero_serie, rutina_id")
           .eq("rutina_asignacion_id", asignacionId)
           .order("rutina_ejercicio_id")
           .order("numero_serie");
 
         if (error) throw error;
 
         const ejerciciosMap = new Map<string, EjercicioCompletadoCache>();
 
         for (const registro of registros || []) {
           if (!registro.rutina_ejercicio_id) continue;
 
           const existente = ejerciciosMap.get(registro.rutina_ejercicio_id);
 
           if (!existente) {
             ejerciciosMap.set(registro.rutina_ejercicio_id, {
               rutina_ejercicio_id: registro.rutina_ejercicio_id,
               nombre_ejercicio: registro.nombre_ejercicio || "",
               peso_kg: registro.peso_kg || 0,
               repeticiones: registro.repeticiones || 0,
               rpe: registro.rpe || 0,
               rir: registro.rir,
               rm_calculado: registro.rm_calculado,
               ejercicio_id: registro.ejercicio_id,
               rutina_id: registro.rutina_id,
               rutina_asignacion_id: asignacionId,
               tipo_configuracion: "avanzado",
               series_realizadas: [],
             });
           }
 
           ejerciciosMap.get(registro.rutina_ejercicio_id)!.series_realizadas!.push({
             numero_serie: registro.numero_serie || 1,
             peso_kg: registro.peso_kg || 0,
             repeticiones: registro.repeticiones || 0,
             rm_calculado: registro.rm_calculado,
           });
         }
 
         const ejercicios = [...ejerciciosMap.values()];
 
         // --- begin: draft and warm-up cache reconstruction ---
         const borradores: BorradorEjercicioCache[] = ejercicios.map((ejercicio) => ({
           rutina_asignacion_id: asignacionId,
           rutina_ejercicio_id: ejercicio.rutina_ejercicio_id,
           rpe: ejercicio.rpe ? String(ejercicio.rpe) : "",
           rirReal: ejercicio.rir != null ? String(ejercicio.rir) : "",
           seriesRealizadas: (ejercicio.series_realizadas || []).reduce<
             Record<number, { peso: string; repeticiones: string }>
           >((acc, serie) => {
             acc[serie.numero_serie] = {
               peso: String(serie.peso_kg ?? ""),
               repeticiones: String(serie.repeticiones ?? ""),
             };
             return acc;
           }, {}),
         }));
 
         const { data: entradas } = await supabase
           .from("registros_entrenamiento")
           .select("entrada_calor_id,nombre_ejercicio,rutina_id,ejercicio_id")
           .eq("rutina_asignacion_id", asignacionId)
           .not("entrada_calor_id", "is", null);
 
         const entradasCache: EntradaCalorCompletadaCache[] = (entradas || []).map((entrada) => ({
           entrada_calor_id: entrada.entrada_calor_id,
           nombre_ejercicio: entrada.nombre_ejercicio || "",
           rutina_id: entrada.rutina_id,
           rutina_asignacion_id: asignacionId,
           ejercicio_id: entrada.ejercicio_id,
         }));
         // --- end: draft and warm-up cache reconstruction ---
 
         setEjerciciosCompletadosCache(ejercicios);
         setBorradoresEjerciciosCache(borradores);
         setEntradaCalorCompletadaCache(entradasCache);
         sessionStorage.removeItem("rutina_a_modificar");
       })()
         .catch((e) => {
           console.error(e);
           sessionStorage.removeItem("rutina_a_modificar");
         })
         .finally(() => {
           setCargandoModificacion(false);
         });
     } catch {
       sessionStorage.removeItem("rutina_a_modificar");
     }
   }, [modoModificar, asignacionId]);
 
   useEffect(() => {
     cargarTodo();
   }, []);
 
   // Cargar progreso local desde localStorage
   useEffect(() => {
     if (!alumnoId) return;
 
     const progresoGuardado = localStorage.getItem(claveProgresoLocal(alumnoId));
     if (!progresoGuardado) return;
 
     try {
       const progreso = JSON.parse(progresoGuardado) as ProgresoRutinaCache;
       setEjerciciosCompletadosCache(progreso.ejercicios || []);
       setEntradaCalorCompletadaCache(progreso.entradas || []);
       setBorradoresEjerciciosCache(progreso.borradores || []);
     } catch {
       localStorage.removeItem(claveProgresoLocal(alumnoId));
     }
   }, [alumnoId]);
 
   // ETAPA 3: Helpers para progreso local
   function claveProgresoLocal(idAlumno: string) {
     return `rutina_progreso_${idAlumno}`;
   }
 
   function hayProgresoPendiente() {
     return (
       ejerciciosCompletadosCache.length > 0 ||
       entradaCalorCompletadaCache.length > 0 ||
       borradoresEjerciciosCache.length > 0
     );
   }
 
   function guardarProgresoLocal() {
     if (!alumnoId) return;
 
     const progreso: ProgresoRutinaCache = {
       ejercicios: ejerciciosCompletadosCache,
       entradas: entradaCalorCompletadaCache,
       borradores: borradoresEjerciciosCache,
     };
 
     if (
       progreso.ejercicios.length === 0 &&
       progreso.entradas.length === 0 &&
       (progreso.borradores?.length ?? 0) === 0
     ) {
       localStorage.removeItem(claveProgresoLocal(alumnoId));
       return;
     }
 
     localStorage.setItem(claveProgresoLocal(alumnoId), JSON.stringify(progreso));
   }
 
   function limpiarProgresoLocal() {
     if (!alumnoId) return;
     localStorage.removeItem(claveProgresoLocal(alumnoId));
   }

 function volverOCerrar() {
   if (modo === "profesor" && onClose) {
     onClose();
     return;
   }
 
   router.back();
 }
 
   // Auto-guardar progreso con debounce (2 segundos después del último cambio)
   useEffect(() => {
     if (!alumnoId) return;
     const timer = setTimeout(() => {
       guardarProgresoLocal();
     }, 2000);
     return () => clearTimeout(timer);
   }, [alumnoId, ejerciciosCompletadosCache, entradaCalorCompletadaCache, borradoresEjerciciosCache]);

   // Guardar inmediatamente si cierran el navegador (localStorage.setItem es síncrono)
   useEffect(() => {
     if (!alumnoId) return;
     const handleBeforeUnload = () => {
       guardarProgresoLocal();
     };
     window.addEventListener('beforeunload', handleBeforeUnload);
     return () => window.removeEventListener('beforeunload', handleBeforeUnload);
   }, [alumnoId, ejerciciosCompletadosCache, entradaCalorCompletadaCache, borradoresEjerciciosCache]);
 
   // --------- ETAPA 3: Borradores de ejercicios helpers y efecto ----------
   function obtenerBorradorEjercicio(rutinaAsignacionId: string, rutinaEjercicioId: string) {
     return borradoresEjerciciosCache.find(
       (item) =>
         item.rutina_asignacion_id === rutinaAsignacionId &&
         item.rutina_ejercicio_id === rutinaEjercicioId
     );
   }
 
   function guardarBorradorEjercicio(datos: {
     rutina_asignacion_id: string;
     rutina_ejercicio_id: string;
     rpe?: string;
     rirReal?: string;
     seriesRealizadas?: Record<number, { peso: string; repeticiones: string }>;
   }) {
     setBorradoresEjerciciosCache((prev) => {
       const existente = prev.find(
         (item) =>
           item.rutina_asignacion_id === datos.rutina_asignacion_id &&
           item.rutina_ejercicio_id === datos.rutina_ejercicio_id
       );
 
       const nuevoBorrador: BorradorEjercicioCache = {
         rutina_asignacion_id: datos.rutina_asignacion_id,
         rutina_ejercicio_id: datos.rutina_ejercicio_id,
         rpe: datos.rpe ?? existente?.rpe ?? "",
         rirReal: datos.rirReal ?? existente?.rirReal ?? "",
         seriesRealizadas: datos.seriesRealizadas ?? existente?.seriesRealizadas ?? {},
       };
 
       const tieneDatos =
         nuevoBorrador.rpe ||
         nuevoBorrador.rirReal ||
         Object.values(nuevoBorrador.seriesRealizadas).some(
           (serie) => serie.peso || serie.repeticiones
         );
 
       const sinActual = prev.filter(
         (item) =>
           !(item.rutina_asignacion_id === datos.rutina_asignacion_id && item.rutina_ejercicio_id === datos.rutina_ejercicio_id)
       );
 
       return tieneDatos ? [...sinActual, nuevoBorrador] : sinActual;
     });
   }
 
   function borrarBorradorEjercicio(rutinaAsignacionId: string, rutinaEjercicioId: string) {
     setBorradoresEjerciciosCache((prev) =>
       prev.filter(
         (item) =>
           !(item.rutina_asignacion_id === rutinaAsignacionId && item.rutina_ejercicio_id === rutinaEjercicioId)
       )
     );
   }
 
   useEffect(() => {
     if (!ejercicioSeleccionado?.rutina_asignacion_id) return;
 
     guardarBorradorEjercicio({
       rutina_asignacion_id: ejercicioSeleccionado.rutina_asignacion_id,
       rutina_ejercicio_id: ejercicioSeleccionado.id,
       rpe,
       rirReal,
       seriesRealizadas,
     });
   }, [ejercicioSeleccionado?.id, ejercicioSeleccionado?.rutina_asignacion_id, rpe, rirReal, seriesRealizadas]);
 
   async function cargarTodo() {
     setLoading(true);
 
     const { data: sessionData } = await supabase.auth.getSession();
 
     if (!sessionData.session) {
       window.location.href = "/login";
       return;
     }
 
    const user = sessionData.session.user;

     const rol = await getRolCached(user.id);

     if (!rol) {
       window.location.href = "/login";
       return;
     }

     let alumnoActualId = alumnoIdProp || "";

     if (modo === "alumno") {
       if (rol !== "alumno") {
         window.location.href = "/";
         return;
       }

      const { data: alumno, error: alumnoError } = await supabase
        .from("alumnos")
        .select("id,user_id,nombre,apellido")
        .eq("user_id", user.id)
        .single();

      if (alumnoError || !alumno) {
        setLoading(false);
        return;
      }

      alumnoActualId = alumno.id;
      const nombreCompleto = [alumno.nombre, alumno.apellido]
        .filter(Boolean)
        .join(" ");
      setNombreAlumno(nombreCompleto);
    } else {
      if (!alumnoActualId && asignacionId) {
        const { data: asignacionAlumno, error: asignacionAlumnoError } = await supabase
          .from("rutina_asignaciones")
          .select("alumno_id")
          .eq("id", asignacionId)
          .single();

        if (asignacionAlumnoError || !asignacionAlumno?.alumno_id) {
          mostrarToast("No se encontró el alumno de esta rutina asignada.");
          setLoading(false);
          return;
        }

        alumnoActualId = asignacionAlumno.alumno_id;
      }

      if (nombreAlumnoProp) {
        setNombreAlumno(nombreAlumnoProp);
      }
    }

    if (!alumnoActualId) {
      mostrarToast("No se pudo identificar el alumno de esta rutina.");
      setLoading(false);
      return;
    }

    setAlumnoId(alumnoActualId);

    // ── ETAPA 2: Asignaciones + Registros + RMS en paralelo (solo necesitan alumnoActualId) ──
    let asignacionesQuery = supabase
      .from("rutina_asignaciones")
      .select(`
        id,
        rutina_id,
        activa,
        fecha_asignacion,
        orden,
        completada,
        fecha_completada,
        created_at,
        rutinas (
          id,
          nombre,
          descripcion,
          objetivo,
          estructura,
          entrada_calor
        )
      `)
      .eq("alumno_id", alumnoActualId);

    if (modo === "profesor" && asignacionId) {
      asignacionesQuery = asignacionesQuery.eq("id", asignacionId);
    }

    const [asignacionesResult, registrosResult, rmsResult] = await Promise.all([
      asignacionesQuery
        .order("fecha_asignacion", { ascending: true })
        .order("orden", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("registros_entrenamiento")
        .select("id,rutina_id,rutina_asignacion_id,rutina_ejercicio_id,entrada_calor_id,ejercicio_id,nombre_ejercicio,peso_kg,repeticiones,rpe,rir")
        .eq("alumno_id", alumnoActualId)
        .eq("completado", true),
      supabase
        .from("rms_actuales")
        .select("id,ejercicio_id,rm_calculado")
        .eq("alumno_id", alumnoActualId),
    ]);

    const asignacionesData = asignacionesResult.data;
    const asignacionesError = asignacionesResult.error;
    const registrosData = registrosResult.data || [];
    const rmsData = rmsResult.data || [];

    if (asignacionesError) {
      mostrarToast(asignacionesError.message, "error");
      setLoading(false);
      return;
    }

    const rutinaIds = Array.from(
      new Set((asignacionesData || []).map((item) => item.rutina_id).filter(Boolean))
    );

    let rutinasBase: Rutina[] = [];

    if (rutinaIds.length > 0) {
      const { data: rutinasData, error: rutinasError } = await supabase
        .from("rutinas")
        .select("id,nombre,descripcion,objetivo,estructura,entrada_calor")
        .in("id", rutinaIds);

      if (rutinasError) {
        mostrarToast(rutinasError.message, "error");
        setLoading(false);
        return;
      }

      rutinasBase = rutinasData || [];
    }

    const asignacionesTipadas = (
      (asignacionesData || []) as RutinaAsignacionResponse[]
    ).map((item) => {
      const rutinaRelacion = normalizarRelacion<Rutina>(item.rutinas as Rutina | Rutina[] | null);
      const rutinaManual = rutinasBase.find((rutina) => rutina.id === item.rutina_id) || null;

      return {
        asignacion_id: item.id,
        rutina_id: item.rutina_id,
        activa: item.activa,
        fecha_asignacion: item.fecha_asignacion,
        orden: item.orden,
        completada: item.completada,
        fecha_completada: item.fecha_completada,
        rutinas: rutinaManual || rutinaRelacion,
      };
    }) as RutinaAsignada[];

    if (rutinaIds.length === 0) {
      setRutinasAsignadas(asignacionesTipadas);
      setEjerciciosPorRutina({});
      setSeriesPorEjercicio({});
      setEntradaPorRutina({});
      setRegistros(registrosData);
      setRmsActuales(rmsData);
      setLoading(false);
      return;
    }

    // ── ETAPA 3: Ejercicios + EntradaCalor + Videos + Series en paralelo ──
    const [rutinaEjerciciosResult, entradaResult] = await Promise.all([
      supabase
        .from("rutina_ejercicios")
        .select("id,rutina_id,ejercicio_id,nombre_ejercicio,series,tipo_prescripcion,repeticiones,duracion,peso,porcentaje_rm,rir,descanso,observaciones,orden,tipo_configuracion")
        .in("rutina_id", rutinaIds)
        .order("orden", { ascending: true }),
      supabase
        .from("rutina_entrada_calor")
        .select("id,rutina_id,ejercicio_id,nombre_ejercicio,series,tipo_prescripcion,duracion,repeticiones,observaciones,orden")
        .in("rutina_id", rutinaIds)
        .order("orden", { ascending: true }),
    ]);

    const ejerciciosError = rutinaEjerciciosResult.error;
    const entradaError = entradaResult.error;

    if (ejerciciosError) {
      mostrarToast(ejerciciosError.message, "error");
      setLoading(false);
      return;
    }

    if (entradaError) {
      mostrarToast(entradaError.message, "error");
      setLoading(false);
      return;
    }

    const rutinaEjercicios = rutinaEjerciciosResult.data || [];
    const entrada = entradaResult.data || [];

    const idsEjercicios =
      rutinaEjercicios.map((item) => item.ejercicio_id).filter(Boolean) || [];
    const idsEntrada =
      entrada.map((item) => item.ejercicio_id).filter(Boolean) || [];
    const ejerciciosAvanzadosIds = rutinaEjercicios
      .filter((item) => item.tipo_configuracion === "avanzado")
      .map((item) => item.id);

    // Videos y series en paralelo
    const [videosEjercicios, seriesResult, videosEntrada] = await Promise.all([
      cargarVideosEjercicios(idsEjercicios as string[]),
      ejerciciosAvanzadosIds.length > 0
        ? supabase
            .from("rutina_ejercicio_series")
            .select("id,rutina_ejercicio_id,numero_serie,repeticiones,peso,porcentaje_rm")
            .in("rutina_ejercicio_id", ejerciciosAvanzadosIds)
            .order("numero_serie", { ascending: true })
        : Promise.resolve({ data: [] as RutinaEjercicioSerie[] }),
      cargarVideosEjercicios(idsEntrada as string[]),
    ]);

    const ejerciciosConVideo =
      rutinaEjercicios?.map((item) => {
        const video = videosEjercicios.find((v) => v.id === item.ejercicio_id);
        return { ...item, youtube_url: obtenerUrlVideo(video) };
      }) || [];

    let seriesAgrupadas: Record<string, RutinaEjercicioSerie[]> = {};

    if (ejerciciosAvanzadosIds.length > 0) {
      const seriesData = (seriesResult as any)?.data || [];
      const seriesError = (seriesResult as any)?.error;

      if (seriesError) {
        mostrarToast(seriesError.message, "error");
        setLoading(false);
        return;
      }

      seriesAgrupadas = (seriesData as RutinaEjercicioSerie[]).reduce<Record<string, RutinaEjercicioSerie[]>>(
        (acc, serie) => {
          acc[serie.rutina_ejercicio_id] = acc[serie.rutina_ejercicio_id] || [];
          acc[serie.rutina_ejercicio_id].push(serie);
          return acc;
        },
        {}
      );
    }

    const agrupadosEjercicios: Record<string, RutinaEjercicio[]> = {};

    ejerciciosConVideo.forEach((item) => {
      if (!agrupadosEjercicios[item.rutina_id]) {
        agrupadosEjercicios[item.rutina_id] = [];
      }
      agrupadosEjercicios[item.rutina_id].push(item);
    });

    const entradaConVideo =
      entrada?.map((item) => {
        const video = videosEntrada.find((v) => v.id === item.ejercicio_id);
        return { ...item, youtube_url: obtenerUrlVideo(video) };
      }) || [];

    const agrupadaEntrada: Record<string, EntradaCalorEjercicio[]> = {};

    entradaConVideo.forEach((item) => {
      if (!item.rutina_id) return;

      if (!agrupadaEntrada[item.rutina_id]) {
        agrupadaEntrada[item.rutina_id] = [];
      }

      agrupadaEntrada[item.rutina_id].push(item);
    });

    setRutinasAsignadas(asignacionesTipadas);
    setEjerciciosPorRutina(agrupadosEjercicios);
    setSeriesPorEjercicio(seriesAgrupadas);
    setEntradaPorRutina(agrupadaEntrada);
    setRegistros(registrosData);
    setRmsActuales(rmsData);
    setLoading(false);
   }
 
   function ejercicioEstaCompletado(rutinaAsignacionId: string, rutinaEjercicioId: string) {
     const enCache = ejerciciosCompletadosCache.some(
       (item) =>
         item.rutina_asignacion_id === rutinaAsignacionId &&
         item.rutina_ejercicio_id === rutinaEjercicioId
     );
 
     if (modoModificar) return enCache;
 
     if (enCache) return true;
 
     return registros.some(
       (registro) =>
         registro.rutina_asignacion_id === rutinaAsignacionId &&
         registro.rutina_ejercicio_id === rutinaEjercicioId
     );
   }
 
   function entradaEstaCompletada(rutinaAsignacionId: string, entradaId: string) {
     const enCache = entradaCalorCompletadaCache.some(
       (item) =>
         item.rutina_asignacion_id === rutinaAsignacionId &&
         item.entrada_calor_id === entradaId
     );
 
     if (modoModificar) return enCache;
 
     if (enCache) return true;
 
     return registros.some(
       (registro) =>
         registro.rutina_asignacion_id === rutinaAsignacionId &&
         registro.entrada_calor_id === entradaId
     );
   }
 
   function asignacionEstaCompletada(asignacion: RutinaAsignada) {
     return asignacion.completada === true || asignacion.activa === false;
   }
 
  function calcularPesoPorRM(item: RutinaEjercicio) {
    if (!item.ejercicio_id || !item.porcentaje_rm) return null;

    if (item.porcentaje_rm === "0") return "Peso corporal";

    const porcentaje = Number(String(item.porcentaje_rm).replace("%", "").trim());

    if (!porcentaje || Number.isNaN(porcentaje)) return null;

    const rm = rmsActuales.find((registro) => registro.ejercicio_id === item.ejercicio_id);

    if (!rm?.rm_calculado) return null;

    return `${Number(((Number(rm.rm_calculado) * porcentaje) / 100).toFixed(1))} kg`;
  }

  function calcularPesoSeriePorRM(item: RutinaEjercicio, serie: RutinaEjercicioSerie) {
    if (!item.ejercicio_id || !serie.porcentaje_rm) return null;

    if (serie.porcentaje_rm === "0") return "0";

    const porcentaje = Number(String(serie.porcentaje_rm).replace("%", "").trim());

    if (!porcentaje || Number.isNaN(porcentaje)) return null;

    const rm = rmsActuales.find((registro) => registro.ejercicio_id === item.ejercicio_id);

    if (!rm?.rm_calculado) return null;

    return String(Number(((Number(rm.rm_calculado) * porcentaje) / 100).toFixed(1)));
  }

  function calcularEpley(peso: number, reps: number) {
     return Number((peso * (1 + reps / 30)).toFixed(2));
   }
 
   function estaRutinaCacheCompleta(rutinaId: string, asignacionId: string): boolean {
     const ejercicios = ejerciciosPorRutina[rutinaId] || [];
     if (ejercicios.length === 0) return false;
 
     return ejercicios.every((ejercicio) =>
       ejercicioEstaCompletado(asignacionId, ejercicio.id)
     );
   }
 
   function hayProgresoEnRutina(_rutinaId: string, _asignacionId: string): boolean {
     return true;
   }
 
   async function guardarCacheABD(asignacionId: string, rutinaId: string) {
     setGuardandoRutina(true);
 
     const ejerciciosDelCache = ejerciciosCompletadosCache.filter(
       (item) => item.rutina_asignacion_id === asignacionId
     );
     const entradasDelCache = entradaCalorCompletadaCache.filter(
       (item) => item.rutina_asignacion_id === asignacionId
     );
 
     // Detect modification mode
     const esModificacion =
       modoModificar &&
       searchParams.get("modo") === "modificar";
 
     if (esModificacion) {
       const confirmar = window.confirm(
         "¿Guardar las modificaciones? Se reemplazará el entrenamiento original por esta nueva versión."
       );
 
       if (!confirmar) {
         setGuardandoRutina(false);
         return;
       }
     }
 
     try {
       // DELETE batch: todas las entradas en una sola consulta
       if (entradasDelCache.length > 0) {
         const idsEntradas = entradasDelCache.map((e) => e.entrada_calor_id);
         const { error: deleteEntradasError } = await supabase
           .from("registros_entrenamiento")
           .delete()
           .eq("alumno_id", alumnoId)
           .eq("rutina_asignacion_id", asignacionId)
           .in("entrada_calor_id", idsEntradas);
 
         if (deleteEntradasError) throw deleteEntradasError;
       }
 
       if (entradasDelCache.length > 0) {
         const entradasBatch = entradasDelCache.map((entradaCache) => ({
           alumno_id: alumnoId,
           rutina_id: entradaCache.rutina_id,
           rutina_asignacion_id: asignacionId,
           rutina_ejercicio_id: null,
           entrada_calor_id: entradaCache.entrada_calor_id,
           ejercicio_id: entradaCache.ejercicio_id || null,
           nombre_ejercicio: entradaCache.nombre_ejercicio,
           peso_kg: null,
           repeticiones: null,
           rpe: null,
           rir: null,
           rm_calculado: null,
           completado: true,
         }));
 
         const { error: entradaInsertError } = await supabase
           .from("registros_entrenamiento")
           .insert(entradasBatch);
 
         if (entradaInsertError) throw entradaInsertError;
       }
 
       // DELETE batch: todos los ejercicios en una sola consulta
       if (ejerciciosDelCache.length > 0) {
         const idsEjercicios = ejerciciosDelCache.map((e) => e.rutina_ejercicio_id);
         const { error: deleteEjerciciosError } = await supabase
           .from("registros_entrenamiento")
           .delete()
           .eq("alumno_id", alumnoId)
           .eq("rutina_asignacion_id", asignacionId)
           .in("rutina_ejercicio_id", idsEjercicios);
 
         if (deleteEjerciciosError) throw deleteEjerciciosError;
       }
 
       // DELETE batch: limpiar rms_historial antes del loop
       const ejerciciosConEjercicioId = ejerciciosDelCache.filter(
         (e) => e.ejercicio_id
       );
       const idsEjerciciosConEjercicioId = ejerciciosConEjercicioId.map(
         (e) => e.rutina_ejercicio_id
       );
 
       if (idsEjerciciosConEjercicioId.length > 0) {
         const { error: deleteHistorialError } = await supabase
           .from("rms_historial")
           .delete()
           .eq("alumno_id", alumnoId)
           .eq("rutina_id", rutinaId)
           .eq("rutina_asignacion_id", asignacionId)
           .in("rutina_ejercicio_id", idsEjerciciosConEjercicioId);
 
         if (deleteHistorialError) throw deleteHistorialError;
       }
 
       // 1. Construir batch de registros_entrenamiento
       const registrosBatch = ejerciciosDelCache.flatMap((ejercicioCache) => {
         const seriesParaGuardar =
           ejercicioCache.series_realizadas?.length
             ? ejercicioCache.series_realizadas
             : [
                 {
                   numero_serie: 1,
                   peso_kg: ejercicioCache.peso_kg,
                   repeticiones: ejercicioCache.repeticiones,
                   rm_calculado: ejercicioCache.rm_calculado,
                 },
               ];
 
         return seriesParaGuardar.map((serie) => ({
           alumno_id: alumnoId,
           rutina_id: ejercicioCache.rutina_id,
           rutina_asignacion_id: asignacionId,
           rutina_ejercicio_id: ejercicioCache.rutina_ejercicio_id,
           ejercicio_id: ejercicioCache.ejercicio_id,
           nombre_ejercicio: ejercicioCache.nombre_ejercicio,
           numero_serie: serie.numero_serie,
           peso_kg: serie.peso_kg,
           repeticiones: serie.repeticiones,
           rpe: ejercicioCache.rpe,
           rir: ejercicioCache.rir,
           rm_calculado: serie.rm_calculado,
           completado: true,
         }));
       });
 
       // 2. INSERT batch registros_entrenamiento
       // Mover el borrado de registros y rms_historial aquí para que solo se borren después de que los batches estén listos
       if (esModificacion) {
         const { error: deleteRegistrosError } = await supabase
           .from("registros_entrenamiento")
           .delete()
           .eq("alumno_id", alumnoId)
           .eq("rutina_asignacion_id", asignacionId);
 
         if (deleteRegistrosError) throw deleteRegistrosError;
 
         const { error: deleteHistorialCompletoError } = await supabase
           .from("rms_historial")
           .delete()
           .eq("alumno_id", alumnoId)
           .eq("rutina_asignacion_id", asignacionId);
 
         if (deleteHistorialCompletoError) throw deleteHistorialCompletoError;
       }
       const { data: registrosInsertados, error: registrosError } = await supabase
         .from("registros_entrenamiento")
         .insert(registrosBatch)
         .select("id,rutina_ejercicio_id,numero_serie,rm_calculado,peso_kg,repeticiones");
 
       if (registrosError) throw registrosError;
 
       if (!registrosInsertados || registrosInsertados.length !== registrosBatch.length) {
         throw new Error("No se guardaron todos los registros de entrenamiento");
       }
 
       // 3. Construir batch de rms_historial
       const historialBatch: Array<{
         alumno_id: string;
         ejercicio_id: string;
         rutina_id: string;
         rutina_ejercicio_id: string;
         rutina_asignacion_id: string;
         registro_entrenamiento_id: string;
         peso_kg: number | null;
         repeticiones: number | null;
         rm_calculado: number | null;
         origen: string;
       }> = [];
 
       for (const ejercicioCache of ejerciciosDelCache) {
         const seriesParaEvaluar =
           ejercicioCache.series_realizadas?.length
             ? ejercicioCache.series_realizadas
             : [
                 {
                   numero_serie: 1,
                   peso_kg: ejercicioCache.peso_kg,
                   repeticiones: ejercicioCache.repeticiones,
                   rm_calculado: ejercicioCache.rm_calculado,
                 },
               ];
 
         const mejorSerieConRM = [...seriesParaEvaluar]
           .filter((serie) => serie.rm_calculado !== null && serie.rm_calculado !== undefined)
           .sort((a, b) => Number(b.rm_calculado || 0) - Number(a.rm_calculado || 0))[0];
 
         if (!ejercicioCache.ejercicio_id || !mejorSerieConRM) continue;
 
         const nuevoRegistro = registrosInsertados.find(
           (registro) =>
             registro.rutina_ejercicio_id === ejercicioCache.rutina_ejercicio_id &&
             registro.numero_serie === mejorSerieConRM.numero_serie
         );
 
         if (!nuevoRegistro) continue;
 
         historialBatch.push({
           alumno_id: alumnoId,
           ejercicio_id: ejercicioCache.ejercicio_id,
           rutina_id: rutinaId,
           rutina_ejercicio_id: ejercicioCache.rutina_ejercicio_id,
           rutina_asignacion_id: asignacionId,
           registro_entrenamiento_id: nuevoRegistro.id,
           peso_kg: nuevoRegistro.peso_kg,
           repeticiones: nuevoRegistro.repeticiones,
           rm_calculado: nuevoRegistro.rm_calculado,
           origen: "entrenamiento",
         });
       }
 
       // 4. INSERT batch rms_historial
       if (historialBatch.length > 0) {
         const { error: historialError } = await supabase
           .from("rms_historial")
           .insert(historialBatch);
 
         if (historialError) throw historialError;
       }
 
       // 5. recalcularRMActual (individual, no se puede batch)
       for (const ejercicioCache of ejerciciosDelCache) {
         if (ejercicioCache.ejercicio_id) {
           await recalcularRMActual({
             alumnoId,
             ejercicioId: ejercicioCache.ejercicio_id,
           });
         }
       }
 
       // Marcar rutina como completada
       const { error: updateAsignacionError } = await supabase
         .from("rutina_asignaciones")
         .update({
           activa: false,
           completada: true,
           fecha_completada: new Date().toISOString(),
         })
         .eq("id", asignacionId);
 
       if (updateAsignacionError) throw updateAsignacionError;
 
       // Actualizar estados localmente
       setRutinasAsignadas((prev) =>
         prev.map((a) =>
           a.asignacion_id === asignacionId
             ? { ...a, activa: false, completada: true, fecha_completada: new Date().toISOString() }
             : a
         )
       );
 
       setRegistros((prev) => [
         ...prev,
         ...registrosInsertados.map((registroInsertado) => {
           const ejercicioCache = ejerciciosDelCache.find(
             (item) => item.rutina_ejercicio_id === registroInsertado.rutina_ejercicio_id
           );
 
           return {
             id: registroInsertado.id,
             rutina_id: ejercicioCache?.rutina_id || rutinaId,
             rutina_asignacion_id: asignacionId,
             rutina_ejercicio_id: registroInsertado.rutina_ejercicio_id || null,
             entrada_calor_id: null,
             ejercicio_id: ejercicioCache?.ejercicio_id || null,
             nombre_ejercicio: ejercicioCache?.nombre_ejercicio || null,
             peso_kg: registroInsertado.peso_kg,
             repeticiones: registroInsertado.repeticiones,
             rpe: ejercicioCache?.rpe ?? null,
             rir: ejercicioCache?.rir ?? null,
           };
         }),
       ]);
 
       // Refrescar rmsActuales
       const { data: rmsActualizados, error: rmsActualizadosError } = await supabase
         .from("rms_actuales")
         .select("id,ejercicio_id,rm_calculado")
         .eq("alumno_id", alumnoId);
       if (rmsActualizadosError) throw rmsActualizadosError;
       setRmsActuales(rmsActualizados || []);
 
       // Limpiar caché de esta rutina
       const ejerciciosRestantes = ejerciciosCompletadosCache.filter(
         (item) => item.rutina_asignacion_id !== asignacionId
       );
       const entradasRestantes = entradaCalorCompletadaCache.filter(
         (item) => item.rutina_asignacion_id !== asignacionId
       );
       const borradoresRestantes = borradoresEjerciciosCache.filter(
         (item) => item.rutina_asignacion_id !== asignacionId
       );
 
       setEjerciciosCompletadosCache(ejerciciosRestantes);
       setEntradaCalorCompletadaCache(entradasRestantes);
       setBorradoresEjerciciosCache(borradoresRestantes);
 
       if (alumnoId) {
         if (
           ejerciciosRestantes.length > 0 ||
           entradasRestantes.length > 0 ||
           borradoresRestantes.length > 0
         ) {
           localStorage.setItem(
             claveProgresoLocal(alumnoId),
             JSON.stringify({
               ejercicios: ejerciciosRestantes,
               entradas: entradasRestantes,
               borradores: borradoresRestantes,
             })
           );
         } else {
           limpiarProgresoLocal();
         }
       }
 
       // If modification, update URL to remove query param
       if (esModificacion) {
         sessionStorage.removeItem("rutina_a_modificar");
         if (modo === "alumno") {
           window.history.replaceState({}, "", `/alumno/rutina/${asignacionId}`);
         }
       }

       setGuardandoRutina(false);

       if (onFinalizada) {
         onFinalizada();
       }

       if (modo === "profesor" && onClose) {
         onClose();
       }
     } catch (error: unknown) {
       setGuardandoRutina(false);
       alert(error instanceof Error ? error.message : "Error al guardar la rutina");
     }
   }
 
   async function completarEntradaCalor(item: EntradaCalorEjercicio, asignacionId: string) {
     if (!item.rutina_id) return;
 
     const asignacionActual = rutinasAsignadas.find(
       (asignacion) => asignacion.asignacion_id === asignacionId
     );
 
     if (!asignacionActual) {
       mostrarToast("No se encontró la asignación de esta rutina.");
       return;
     }
 
     if (entradaEstaCompletada(asignacionActual.asignacion_id, item.id)) {
       mostrarToast("Esta entrada en calor ya fue completada.", "info");
       return;
     }
 
     const nuevaEntrada: EntradaCalorCompletadaCache = {
       entrada_calor_id: item.id,
       nombre_ejercicio: item.nombre_ejercicio,
       rutina_id: item.rutina_id,
       rutina_asignacion_id: asignacionActual.asignacion_id,
       ejercicio_id: item.ejercicio_id || null,
     };
 
     setEntradaCalorCompletadaCache((prev) => [...prev, nuevaEntrada]);
   }
 
   async function deshacerEntradaCalor(rutinaId: string, entradaId: string, asignacionId: string) {
     const asignacionActual = rutinasAsignadas.find(
       (asignacion) => asignacion.asignacion_id === asignacionId
     );
 
     if (!asignacionActual) {
       mostrarToast("No se encontró la asignación de esta rutina.");
       return;
     }
 
     const idCarga = `entrada-${entradaId}`;
     setDeshaciendoId(idCarga);
 
     try {
       const estaEnCache = entradaCalorCompletadaCache.some(
         (item) =>
           item.rutina_asignacion_id === asignacionActual.asignacion_id &&
           item.entrada_calor_id === entradaId
       );
 
       if (estaEnCache) {
         setEntradaCalorCompletadaCache((prev) =>
           prev.filter(
             (item) =>
               !(item.rutina_asignacion_id === asignacionActual.asignacion_id && item.entrada_calor_id === entradaId)
           )
         );
         return;
       }
 
       const confirmar = confirm("¿Querés deshacer esta entrada en calor?");
       if (!confirmar) return;
 
       const { error } = await supabase
         .from("registros_entrenamiento")
         .delete()
         .eq("alumno_id", alumnoId)
         .eq("rutina_asignacion_id", asignacionActual.asignacion_id)
         .eq("entrada_calor_id", entradaId);
 
       if (error) {
         alert(error.message);
         return;
       }
 
       await supabase
         .from("rutina_asignaciones")
         .update({
           activa: true,
           completada: false,
           fecha_completada: null,
         })
         .eq("id", asignacionActual.asignacion_id);
 
       setRegistros((prev) =>
         prev.filter(
           (r) =>
             !(r.rutina_asignacion_id === asignacionActual.asignacion_id && r.entrada_calor_id === entradaId)
         )
       );
 
       setRutinasAsignadas((prev) =>
         prev.map((a) =>
           a.asignacion_id === asignacionActual.asignacion_id
             ? { ...a, activa: true, completada: false, fecha_completada: null }
             : a
         )
       );
     } finally {
       setDeshaciendoId(null);
     }
   }
 
   function abrirCompletado(item: RutinaEjercicio, asignacionId: string) {
     const asignacionActual = rutinasAsignadas.find(
       (asignacion) => asignacion.asignacion_id === asignacionId
     );
 
     if (!asignacionActual) {
       mostrarToast("No se encontró la asignación de esta rutina.");
       return;
     }
 
     if (ejercicioEstaCompletado(asignacionActual.asignacion_id, item.id)) {
       mostrarToast("Este ejercicio ya fue completado.", "info");
       return;
     }
 
     const pesoSugerido = calcularPesoPorRM(item);
     const pesoInicial =
       pesoSugerido === "Peso corporal"
         ? "0"
         : pesoSugerido
           ? String(pesoSugerido).replace(" kg", "")
           : item.peso || "";
 
     setEjercicioSeleccionado({
       ...item,
       rutina_asignacion_id: asignacionActual.asignacion_id,
     } as RutinaEjercicio);
 
     setPesoSugeridoModal(pesoSugerido);
 
     const borradorGuardado = obtenerBorradorEjercicio(asignacionActual.asignacion_id, item.id);
 
     // if (pesoSugerido === "Peso corporal") {
     //   setPesoUsado("0");
     // } else {
     //   setPesoUsado(pesoSugerido ? String(pesoSugerido).replace(" kg", "") : "");
     // }
     //
     // setRepsRealizadas("");
     setRpe(borradorGuardado?.rpe || "");
     setRirReal(borradorGuardado?.rirReal || "");
 
     if (borradorGuardado?.seriesRealizadas) {
       setSeriesRealizadas(borradorGuardado.seriesRealizadas);
       return;
     }
 
     if (item.tipo_configuracion === "avanzado") {
       const series = seriesPorEjercicio[item.id] || [];
       const valoresIniciales = series.reduce<Record<number, { peso: string; repeticiones: string }>>((acc, serie) => {
         acc[serie.numero_serie] = {
           peso: "",
           repeticiones: serie.repeticiones || "",
         };
         return acc;
       }, {});

       setSeriesRealizadas(valoresIniciales);
     } else {
       const esPorTiempo = item.tipo_prescripcion === "tiempo";

       setSeriesRealizadas({
         1: {
           peso: pesoInicial || "0",
           repeticiones: esPorTiempo ? "0" : item.repeticiones || "",
         },
       });
     }
   }
 
   async function guardarCompletado() {
     if (!ejercicioSeleccionado || guardandoEjercicio) return;
 
     setGuardandoEjercicio(true);
 
     const asignacionActual = rutinasAsignadas.find(
       (asignacion) =>
         asignacion.asignacion_id === ejercicioSeleccionado.rutina_asignacion_id
     );
 
     if (!asignacionActual) {
       mostrarToast("No se encontró la asignación de esta rutina.");
       setGuardandoEjercicio(false);
       return;
     }
 
     if (
       ejercicioEstaCompletado(
         asignacionActual.asignacion_id,
         ejercicioSeleccionado.id
       )
     ) {
       mostrarToast("Este ejercicio ya fue completado.", "info");
       setEjercicioSeleccionado(null);
       setGuardandoEjercicio(false);
       return;
     }
 
     if (!rpe) {
       mostrarToast("Completá el RPE.", "info");
       setGuardandoEjercicio(false);
       return;
     }
 
     const esAvanzado = ejercicioSeleccionado.tipo_configuracion === "avanzado";
     const esPorTiempo = ejercicioSeleccionado.tipo_prescripcion === "tiempo";
     const seriesConfiguradas = seriesPorEjercicio[ejercicioSeleccionado.id] || [];

     if (!esAvanzado && !esPorTiempo && (!seriesRealizadas[1]?.peso || !seriesRealizadas[1]?.repeticiones)) {
       mostrarToast("Completá peso, repeticiones y RPE.", "info");
       setGuardandoEjercicio(false);
       return;
     }

     if (!esAvanzado && esPorTiempo && !seriesRealizadas[1]?.peso) {
       setSeriesRealizadas((prev) => ({
         ...prev,
         1: {
           peso: prev[1]?.peso || "0",
           repeticiones: "0",
         },
       }));
     }
 
     if (esAvanzado) {
       const seriesIncompletas = seriesConfiguradas.some((serie) => {
         const valores = seriesRealizadas[serie.numero_serie];
         return !valores?.peso || !valores?.repeticiones;
       });
 
       if (seriesIncompletas) {
         mostrarToast("Completá peso y repeticiones en cada serie.", "info");
         setGuardandoEjercicio(false);
         return;
       }
     }
 
     const rpeNumero = Number(rpe);
     const rirNumero = rirReal ? Number(rirReal) : null;
 
     if (Number.isNaN(rpeNumero)) {
       mostrarToast("Revisá el RPE ingresado.", "info");
       setGuardandoEjercicio(false);
       return;
     }
 
     const seriesRealizadasFinales: SerieCompletadaCache[] = esAvanzado
       ? seriesConfiguradas.map((serie) => {
           const valores = seriesRealizadas[serie.numero_serie];
           const pesoNumeroSerie = Number(valores?.peso || 0);
           const repsNumeroSerie = Number(valores?.repeticiones || 0);

           return {
             numero_serie: serie.numero_serie,
             peso_kg: pesoNumeroSerie,
             repeticiones: repsNumeroSerie,
             rm_calculado: pesoNumeroSerie > 0 && repsNumeroSerie > 0
               ? calcularEpley(pesoNumeroSerie, repsNumeroSerie)
               : null,
           };
         })
       : Object.entries(seriesRealizadas)
           .map(([numeroSerie, valores]) => {
             const pesoNumeroSerie = Number(valores?.peso || 0);
             const repsNumeroSerie = esPorTiempo ? 0 : Number(valores?.repeticiones || 0);

             return {
               numero_serie: Number(numeroSerie),
               peso_kg: pesoNumeroSerie,
               repeticiones: repsNumeroSerie,
               rm_calculado: !esPorTiempo && pesoNumeroSerie > 0 && repsNumeroSerie > 0
                 ? calcularEpley(pesoNumeroSerie, repsNumeroSerie)
                 : null,
             };
           })
           .filter(
             (serie) =>
               !Number.isNaN(serie.peso_kg) &&
               !Number.isNaN(serie.repeticiones) &&
               serie.peso_kg >= 0 &&
               (esPorTiempo ? serie.repeticiones >= 0 : serie.repeticiones > 0)
           );
 
     if (
       seriesRealizadasFinales.length === 0 ||
       seriesRealizadasFinales.some(
         (serie) =>
           Number.isNaN(serie.peso_kg) ||
           Number.isNaN(serie.repeticiones) ||
           serie.peso_kg < 0 ||
           (esPorTiempo ? serie.repeticiones < 0 : serie.repeticiones <= 0)
       )
     ) {
       mostrarToast("Revisá los valores ingresados en las series.", "info");
       setGuardandoEjercicio(false);
       return;
     }
 
     const mejorSerieConRM = seriesRealizadasFinales
       .filter((serie) => serie.rm_calculado !== null)
       .sort((a, b) => Number(b.rm_calculado || 0) - Number(a.rm_calculado || 0))[0];
 
     const mejorSeriePorReps = [...seriesRealizadasFinales]
       .sort((a, b) => b.repeticiones - a.repeticiones)[0];
 
     const mejorSerieParaGuardar = mejorSerieConRM || mejorSeriePorReps;
 
     if (!mejorSerieParaGuardar) {
       mostrarToast("No se encontró una serie válida para guardar el ejercicio.");
       setGuardandoEjercicio(false);
       return;
     }
 
     const pesoNumero = mejorSerieParaGuardar.peso_kg;
     const repsNumero = mejorSerieParaGuardar.repeticiones;
     const rmCalculado = mejorSerieConRM?.rm_calculado ?? null;
 
     const nuevoEjercicioEnCache: EjercicioCompletadoCache = {
       rutina_ejercicio_id: ejercicioSeleccionado.id,
       nombre_ejercicio: ejercicioSeleccionado.nombre_ejercicio,
       peso_kg: pesoNumero,
       repeticiones: repsNumero,
       rpe: rpeNumero,
       rir: rirNumero,
       rm_calculado: rmCalculado,
       ejercicio_id: ejercicioSeleccionado.ejercicio_id || null,
       rutina_id: ejercicioSeleccionado.rutina_id,
       rutina_asignacion_id: asignacionActual.asignacion_id,
       tipo_configuracion: ejercicioSeleccionado.tipo_configuracion || "simple",
       series_realizadas: seriesRealizadasFinales,
     };
 
     setEjerciciosCompletadosCache((prev) => [
       ...prev.filter(
         (item) =>
           !(
             item.rutina_asignacion_id === nuevoEjercicioEnCache.rutina_asignacion_id &&
             item.rutina_ejercicio_id === nuevoEjercicioEnCache.rutina_ejercicio_id
           )
       ),
       nuevoEjercicioEnCache,
     ]);
 
     borrarBorradorEjercicio(
       asignacionActual.asignacion_id,
       ejercicioSeleccionado.id
     );
 
     setEjercicioSeleccionado(null);

     // Guardar inmediatamente en localStorage al completar un ejercicio
     if (alumnoId) {
       const progreso: ProgresoRutinaCache = {
         ejercicios: [...ejerciciosCompletadosCache.filter(
           (item) =>
             !(
               item.rutina_asignacion_id === nuevoEjercicioEnCache.rutina_asignacion_id &&
               item.rutina_ejercicio_id === nuevoEjercicioEnCache.rutina_ejercicio_id
             )
         ), nuevoEjercicioEnCache],
         entradas: entradaCalorCompletadaCache,
         borradores: borradoresEjerciciosCache.filter(
           (item) =>
             !(
               item.rutina_asignacion_id === nuevoEjercicioEnCache.rutina_asignacion_id &&
               item.rutina_ejercicio_id === nuevoEjercicioEnCache.rutina_ejercicio_id
             )
         ),
       };
       localStorage.setItem(claveProgresoLocal(alumnoId), JSON.stringify(progreso));
     }

     // setPesoUsado("");
     // setRepsRealizadas("");
     setRpe("");
     setRirReal("");
     setSeriesRealizadas({});
     setGuardandoEjercicio(false);
   }
 
   async function deshacerCompletado(rutinaId: string, rutinaEjercicioId: string, asignacionId: string) {
     const confirmar = confirm("¿Querés deshacer este ejercicio?");
     if (!confirmar) return;
 
     const asignacionActual = rutinasAsignadas.find(
       (asignacion) => asignacion.asignacion_id === asignacionId
     );
 
     if (!asignacionActual) {
       mostrarToast("No se encontró la asignación de esta rutina.");
       return;
     }
 
     const idCarga = `ejercicio-${rutinaEjercicioId}`;
     setDeshaciendoId(idCarga);
 
     try {
       const estaEnCache = ejerciciosCompletadosCache.some(
         (item) =>
           item.rutina_asignacion_id === asignacionActual.asignacion_id &&
           item.rutina_ejercicio_id === rutinaEjercicioId
       );
 
       if (estaEnCache) {
         setEjerciciosCompletadosCache((prev) =>
           prev.filter(
             (item) =>
               !(
                 item.rutina_asignacion_id === asignacionActual.asignacion_id &&
                 item.rutina_ejercicio_id === rutinaEjercicioId
               )
           )
         );
         return;
       }
 
       const { data: registroActual } = await supabase
         .from("registros_entrenamiento")
         .select("ejercicio_id")
         .eq("alumno_id", alumnoId)
         .eq("rutina_asignacion_id", asignacionActual.asignacion_id)
         .eq("rutina_ejercicio_id", rutinaEjercicioId)
         .maybeSingle();
 
       await supabase
         .from("rms_historial")
         .delete()
         .eq("alumno_id", alumnoId)
         .eq("rutina_id", rutinaId)
         .eq("rutina_ejercicio_id", rutinaEjercicioId);
 
       const { error } = await supabase
         .from("registros_entrenamiento")
         .delete()
         .eq("alumno_id", alumnoId)
         .eq("rutina_asignacion_id", asignacionActual.asignacion_id)
         .eq("rutina_ejercicio_id", rutinaEjercicioId);
 
       if (error) {
         alert(error.message);
         return;
       }
 
       if (registroActual?.ejercicio_id) {
         await recalcularRMActual({
           alumnoId,
           ejercicioId: registroActual.ejercicio_id,
         });
       }
 
       await supabase
         .from("rutina_asignaciones")
         .update({
           activa: true,
           completada: false,
           fecha_completada: null,
         })
         .eq("id", asignacionActual.asignacion_id);
 
       setRegistros((prev) =>
         prev.filter(
           (r) =>
             !(r.rutina_asignacion_id === asignacionActual.asignacion_id && r.rutina_ejercicio_id === rutinaEjercicioId)
         )
       );
 
       setRutinasAsignadas((prev) =>
         prev.map((a) =>
           a.asignacion_id === asignacionActual.asignacion_id
             ? { ...a, activa: true, completada: false, fecha_completada: null }
             : a
         )
       );
 
       if (registroActual?.ejercicio_id) {
         const { data: nuevoRM } = await supabase
           .from("rms_actuales")
           .select("id,ejercicio_id,rm_calculado")
           .eq("alumno_id", alumnoId)
           .eq("ejercicio_id", registroActual.ejercicio_id)
           .maybeSingle();
 
         if (nuevoRM) {
           setRmsActuales((prev) => {
             const existe = prev.find((r) => r.ejercicio_id === registroActual.ejercicio_id);
             if (existe) {
               return prev.map((r) =>
                 r.ejercicio_id === registroActual.ejercicio_id ? nuevoRM : r
               );
             }
             return [...prev, nuevoRM];
           });
         } else {
           setRmsActuales((prev) =>
             prev.filter((r) => r.ejercicio_id !== registroActual.ejercicio_id)
           );
         }
       }
     } finally {
       setDeshaciendoId(null);
     }
   }
 
   function toggleSeccion(key: string) {
     setSeccionesAbiertas((prev) => ({
       ...prev,
       [key]: !prev[key],
     }));
   }
 
   function renderRutinaCard(asignacion: RutinaAsignada) {
     const rutina =
       asignacion.rutinas || {
         id: asignacion.rutina_id,
         nombre: "Rutina finalizada",
         descripcion: null,
         objetivo: null,
         estructura: null,
         entrada_calor: null,
       };
 
     const completada = modoModificar
   ? false
   : asignacionEstaCompletada(asignacion);
     const entrada = entradaPorRutina[rutina.id] || [];
     const ejercicios = ejerciciosPorRutina[rutina.id] || [];
 
     return (
       <div key={asignacion.asignacion_id} className="space-y-4">
 
         {/* Cabecera de la rutina */}
         <div className={`rounded-2xl border p-5 ${completada ? "border-emerald-800/60 bg-emerald-950/30" : "border-zinc-800 bg-zinc-900"}`}>
           <div className="flex items-start justify-between gap-4">
             <div>
               <h2 className="text-2xl font-bold tracking-tight">{rutina.nombre}</h2>
               {rutina.descripcion && (
                 <p className="text-zinc-400 mt-1 text-sm">{rutina.descripcion}</p>
               )}
               <div className="flex flex-wrap gap-2 mt-3">
                 {rutina.objetivo && (
                   <span className="text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-800/40 px-3 py-1">
                     {rutina.objetivo}
                   </span>
                 )}
                 {rutina.estructura && (
                   <span className="text-xs font-medium rounded-full bg-zinc-800 text-zinc-400 px-3 py-1">
                     {rutina.estructura}
                   </span>
                 )}
               </div>
             </div>
             {completada && (
               <span className="shrink-0 flex items-center gap-1.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-700/40 px-3 py-1.5">
                 <span>✓</span> Completada
               </span>
             )}
           </div>
         </div>
 
         {/* Entrada en calor */}
         {entrada.length > 0 && (
           <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
             <button
               type="button"
               onClick={() => toggleSeccion(`${asignacion.asignacion_id}_entrada`)}
               className="w-full flex items-center gap-2 px-5 py-3 border-b border-zinc-800 bg-zinc-950/50 hover:bg-zinc-950/80 transition-colors"
             >
               <span className="text-base">🔥</span>
               <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Entrada en calor</h3>
               <span className="ml-auto text-xs text-zinc-500">({entrada.length} ejercicios)</span>
               <span className="text-zinc-500 text-sm">{seccionesAbiertas[`${asignacion.asignacion_id}_entrada`] ? "▲" : "▼"}</span>
             </button>
             {seccionesAbiertas[`${asignacion.asignacion_id}_entrada`] && (
               <div className="divide-y divide-zinc-800">
                 {entrada.map((item, index) => {
                   const itemCompletado = entradaEstaCompletada(asignacion.asignacion_id, item.id);
                   return (
                     <div key={item.id} className={`p-4 transition-colors ${itemCompletado ? "bg-emerald-950/20" : "hover:bg-zinc-800/30"}`}>
                       <div className="flex gap-4">
                         {/* Número */}
                         <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 ${
                           itemCompletado
                             ? "bg-emerald-500/20 text-emerald-400"
                             : "bg-zinc-800 text-zinc-500"
                         }`}>
                           {itemCompletado ? "✓" : index + 1}
                         </div>
 
                         {/* Contenido */}
                         <div className="flex-1 min-w-0">
                           <h4 className={`font-semibold text-base leading-snug ${itemCompletado ? "text-zinc-400" : "text-white"}`}>
                             {item.nombre_ejercicio}
                           </h4>
                           <p className="text-zinc-500 text-sm mt-0.5">
                             {item.series || "-"} series · {textoPrescripcion(item)}
                           </p>
                           {item.observaciones && (
                             <p className="text-zinc-600 text-xs mt-2 whitespace-pre-wrap">{item.observaciones}</p>
                           )}
 
                           {/* Acciones */}
                           <div className="flex gap-2 mt-4">
                             {item.youtube_url && (
                               <a
                                 href={item.youtube_url}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="text-xs font-semibold text-red-400 border border-red-800/50 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition-colors"
                               >
                                 ▶ Ver video
                               </a>
                             )}
                             {itemCompletado ? (
                               <button
                                 type="button"
                                 onClick={() => item.rutina_id && deshacerEntradaCalor(item.rutina_id, item.id, asignacion.asignacion_id)}
                                 disabled={deshaciendoId === `entrada-${item.id}`}
                                 className="flex-1 text-sm font-semibold rounded-xl py-2.5 border border-zinc-700 text-zinc-400 hover:text-yellow-400 hover:border-yellow-700/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                               >
                                 {deshaciendoId === `entrada-${item.id}` ? (
                                   <span className="inline-flex items-center justify-center gap-2">
                                     <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                                     Deshaciendo...
                                   </span>
                                 ) : (
                                   "↩ Deshacer"
                                 )}
                               </button>
                             ) : (
                               <button
                                 type="button"
                                 onClick={() => completarEntradaCalor(item, asignacion.asignacion_id)}
                                 disabled={completada}
                                 className={`flex-1 text-sm font-semibold rounded-xl py-2.5 transition-colors ${
                                   completada
                                     ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                     : "bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600"
                                 }`}
                               >
                                 Iniciar ejercicio
                               </button>
                             )}
                           </div>
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
           </div>
         )}
 
         {/* Ejercicios */}
         <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
           <button
             type="button"
             onClick={() => toggleSeccion(`${asignacion.asignacion_id}_ejercicios`)}
             className="w-full flex items-center gap-2 px-5 py-3 border-b border-zinc-800 bg-zinc-950/50 hover:bg-zinc-950/80 transition-colors"
           >
             <span className="text-base">💪</span>
             <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Ejercicios</h3>
             <span className="ml-auto text-xs text-zinc-500">({ejercicios.length} ejercicios)</span>
             <span className="text-zinc-500 text-sm">{seccionesAbiertas[`${asignacion.asignacion_id}_ejercicios`] ? "▲" : "▼"}</span>
           </button>
 
           {seccionesAbiertas[`${asignacion.asignacion_id}_ejercicios`] && (
             <>
               {ejercicios.length === 0 ? (
                 <p className="p-5 text-zinc-500 text-sm">Todavía no hay ejercicios cargados.</p>
               ) : (
                 <div className="divide-y divide-zinc-800">
                   {ejercicios.map((item, index) => {
                   const pesoSugerido = calcularPesoPorRM(item);
                   const itemCompletado = ejercicioEstaCompletado(asignacion.asignacion_id, item.id);

                     return (
                       <div
                         key={item.id}
                         className={`p-4 transition-colors ${itemCompletado ? "bg-emerald-950/20" : "hover:bg-zinc-800/30"}`}
                       >
                         <div className="flex gap-4">
                           {/* Número */}
                           <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 ${
                             itemCompletado
                               ? "bg-emerald-500/20 text-emerald-400"
                               : "bg-zinc-800 text-zinc-500"
                           }`}>
                             {itemCompletado ? "✓" : index + 1}
                           </div>
 
                           {/* Contenido */}
                           <div className="flex-1 min-w-0">
                             <h4 className={`font-semibold text-base leading-snug ${itemCompletado ? "text-zinc-400" : "text-white"}`}>
                               {item.nombre_ejercicio}
                             </h4>
                             <p className="text-zinc-500 text-sm mt-0.5">
                               {item.series || "-"} series ·{" "}
                               {item.tipo_configuracion === "avanzado"
                                 ? textoPrescripcionAvanzada(seriesPorEjercicio[item.id] || [], item, calcularPesoSeriePorRM)
                                 : textoPrescripcion(item)}
                             </p>
 
                             {/* Series avanzado */}
                             {item.tipo_configuracion === "avanzado" && (
                               <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                                 <div className="divide-y divide-zinc-800/60">
                                   {(seriesPorEjercicio[item.id] || []).map((serie) => (
                                     <div key={serie.id} className="flex justify-between items-center px-3 py-2 text-sm">
                                       <span className="text-zinc-500">Serie {serie.numero_serie}</span>
                                       <span className="text-zinc-300 font-medium tabular-nums">
                                         {serie.repeticiones || "-"} reps · {textoPesoSerieAvanzada(serie, item, calcularPesoSeriePorRM)}
                                       </span>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}
 
                             {/* Badges */}
                             <div className="flex flex-wrap gap-1.5 mt-3">
                               {pesoSugerido && (
                                 <span className="text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-800/40 px-2.5 py-0.5">
                                   Peso sugerido: {pesoSugerido}
                                 </span>
                               )}
                               {item.peso && (
                                 <span className="text-xs rounded-full bg-zinc-800 text-zinc-400 px-2.5 py-0.5">
                                   Peso: {item.peso}
                                 </span>
                               )}
                               {item.porcentaje_rm && (
                                 <span className="text-xs rounded-full bg-zinc-800 text-zinc-400 px-2.5 py-0.5">
                                   {item.porcentaje_rm === "0" ? "Peso corporal" : `${item.porcentaje_rm}% RM`}
                                 </span>
                               )}
                               {item.rir && (
                                 <span className="text-xs rounded-full bg-zinc-800 text-zinc-400 px-2.5 py-0.5">
                                   RIR {item.rir}
                                 </span>
                               )}
                               {item.descanso && (
                                 <span className="text-xs rounded-full bg-zinc-800 text-zinc-400 px-2.5 py-0.5">
                                   ⏱ {item.descanso}
                                 </span>
                               )}
                             </div>


                             {item.observaciones && (
                               <p className="text-zinc-600 text-xs mt-2 whitespace-pre-wrap">{item.observaciones}</p>
                             )}
 
                             {/* Acciones */}
                             <div className="flex gap-2 mt-4">
                               {item.youtube_url && (
                                 <a
                                   href={item.youtube_url}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="text-xs font-semibold text-red-400 border border-red-800/50 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition-colors"
                                 >
                                   ▶ Ver video
                                 </a>
                               )}
                               {itemCompletado ? (
                                 <button
                                   type="button"
                                   onClick={() => deshacerCompletado(rutina.id, item.id, asignacion.asignacion_id)}
                                   disabled={deshaciendoId === `ejercicio-${item.id}`}
                                   className="flex-1 text-sm font-semibold rounded-xl py-2.5 border border-zinc-700 text-zinc-400 hover:text-yellow-400 hover:border-yellow-700/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                 >
                                   {deshaciendoId === `ejercicio-${item.id}` ? (
                                     <span className="inline-flex items-center justify-center gap-2">
                                       <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                                       Deshaciendo...
                                     </span>
                                   ) : (
                                     "↩ Deshacer"
                                   )}
                                 </button>
                               ) : (
                                 <button
                                   type="button"
                                   onClick={() => abrirCompletado(item, asignacion.asignacion_id)}
                                   disabled={completada}
                                   className={`flex-1 text-sm font-semibold rounded-xl py-2.5 transition-colors ${
                                     completada
                                       ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                       : "bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600"
                                   }`}
                                 >
                                   Iniciar ejercicio
                                 </button>
                               )}
                             </div>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               )}
             </>
           )}
         </div>
 
         {/* CTA final */}
         {completada ? (
           <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/30 p-4 text-center">
             <p className="text-emerald-400 font-semibold">✓ ¡Rutina completada!</p>
           </div>
         ) : estaRutinaCacheCompleta(asignacion.rutina_id, asignacion.asignacion_id) ? (
           <button
             type="button"
             onClick={() => guardarCacheABD(asignacion.asignacion_id, asignacion.rutina_id)}
             disabled={guardandoRutina}
             className={`w-full rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/30 ${
               guardandoRutina
                 ? "bg-emerald-700 opacity-70 cursor-not-allowed text-white"
                 : "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white"
             }`}
           >
             {guardandoRutina && (
               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
             )}
             {guardandoRutina
   ? "Guardando..."
   : modoModificar
     ? "💾 Guardar modificaciones"
     : "🏁 Finalizar rutina"}
           </button>
         ) : null}
       </div>
     );
   }
 
    if (loading || cargandoModificacion) {
      if (cargandoModificacion) {
        return (
          <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-500 text-sm">Preparando entrenamiento...</p>
            </div>
          </main>
        );
      }

      return (
        <main className="min-h-screen bg-zinc-950 text-white pb-24">
          <div className="max-w-2xl mx-auto px-4 pt-8 animate-pulse">
            {/* Back button skeleton */}
            <div className="h-5 w-16 rounded bg-zinc-800 mb-5" />

            {/* Header skeleton */}
            <div className="mb-8 space-y-3">
              <div className="h-9 w-72 rounded bg-zinc-800" />
              <div className="h-6 w-48 rounded bg-zinc-800" />
            </div>

            {/* Header de rutina skeleton */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mb-8">
              <div className="space-y-3">
                <div className="h-7 w-56 rounded bg-zinc-800" />
                <div className="h-4 w-64 rounded bg-zinc-800" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-zinc-800" />
                  <div className="h-6 w-24 rounded-full bg-zinc-800" />
                </div>
              </div>
            </div>

            {/* Seccion entrada en calor skeleton */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden mb-6">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800 bg-zinc-950/50">
                <div className="h-4 w-4 rounded bg-zinc-800" />
                <div className="h-4 w-36 rounded bg-zinc-800" />
                <div className="ml-auto h-4 w-20 rounded bg-zinc-800" />
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-48 rounded bg-zinc-800" />
                    <div className="h-4 w-32 rounded bg-zinc-800" />
                    <div className="flex gap-2">
                      <div className="h-9 w-24 rounded-lg bg-zinc-800" />
                      <div className="h-9 w-32 rounded-lg bg-zinc-800" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seccion ejercicios skeleton */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800 bg-zinc-950/50">
                <div className="h-4 w-4 rounded bg-zinc-800" />
                <div className="h-4 w-28 rounded bg-zinc-800" />
                <div className="ml-auto h-4 w-20 rounded bg-zinc-800" />
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-56 rounded bg-zinc-800" />
                    <div className="h-4 w-40 rounded bg-zinc-800" />
                    <div className="flex gap-2">
                      <div className="h-9 w-24 rounded-lg bg-zinc-800" />
                      <div className="h-9 w-32 rounded-lg bg-zinc-800" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-52 rounded bg-zinc-800" />
                    <div className="h-4 w-36 rounded bg-zinc-800" />
                    <div className="flex gap-2">
                      <div className="h-9 w-24 rounded-lg bg-zinc-800" />
                      <div className="h-9 w-32 rounded-lg bg-zinc-800" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      );
    }
 
   const rutinaSeleccionada =
     asignacionId
       ? rutinasAsignadas.find(
           (asignacion) =>
             asignacion.asignacion_id === asignacionId &&
             (modoModificar || !asignacionEstaCompletada(asignacion))
         ) || null
       : null;
 
  const noHayEntrenamientos = !rutinaSeleccionada;
 
  return (
     <main className="min-h-screen bg-zinc-950 text-white pb-24">
       <div className="max-w-2xl mx-auto px-4 pt-8">
         <button
           type="button"
           onClick={volverOCerrar}
           className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
         >
           <span aria-hidden="true">←</span>
           {modo === "profesor" ? "Cerrar" : "Volver"}
         </button>
 
         {/* Header */}
         <div className="mb-8">
           <h1 className="text-3xl font-bold tracking-tight">
             {modoModificar
               ? "✏️ Modificando entrenamiento"
               : modo === "profesor"
                 ? "Registro de entrenamiento"
                 : "Entrenamiento de hoy"}
           </h1>
           {nombreAlumno && (
             <p className="text-zinc-400 text-lg mt-1 font-medium">{nombreAlumno}</p>
           )}
         </div>
 
         {noHayEntrenamientos ? (
           <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
             <div className="text-4xl mb-3">📋</div>
             <h2 className="text-lg font-semibold text-white">Sin rutinas asignadas</h2>
             <p className="text-zinc-500 text-sm mt-1">
               {modo === "profesor"
                 ? "Este alumno no tiene esta rutina disponible para registrar."
                 : "Cuando tu profesor cargue una rutina, va a aparecer acá."}
             </p>
           </div>
         ) : (
           <div className="space-y-8">
             {rutinaSeleccionada && renderRutinaCard(rutinaSeleccionada)}
           </div>
         )}
       </div>
 
       {/* Modal: completar ejercicio */}
       <CompletarEjercicioModal
         open={!!ejercicioSeleccionado}
         ejercicio={ejercicioSeleccionado}
         onClose={() => setEjercicioSeleccionado(null)}
         onCompletar={guardarCompletado}
         rpe={rpe}
         setRpe={setRpe}
         rirReal={rirReal}
         setRirReal={setRirReal}
         seriesRealizadas={seriesRealizadas}
         setSeriesRealizadas={setSeriesRealizadas}
         seriesAvanzadas={
           ejercicioSeleccionado
             ? (seriesPorEjercicio[ejercicioSeleccionado.id] || []).map((serie) => ({
                 ...serie,
                 peso_objetivo: serie.peso || calcularPesoSeriePorRM(ejercicioSeleccionado, serie),
               }))
             : []
         }
         opcionesRPE={opcionesRPE}
         opcionesRIR={opcionesRIR}
         guardandoEjercicio={guardandoEjercicio}
         pesoSugerido={pesoSugeridoModal}
       />
     </main>
   );
 }
 
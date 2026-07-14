"use client";

import { use, useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getRolCached } from "@/lib/rol-cache";
import { normalizarRelacion } from "@/lib/utils/normalizarRelacion";
import BackButton from "@/components/BackButton";
import { recalcularRMActual } from "@/lib/recalcularRMActual";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import AsignarModal from "@/components/shared/AsignarModal";
import VerRutinaPlantillaModal from "@/components/rutinas/VerRutinaPlantillaModal";
import CrearRutinaModal from "@/components/rutinas/CrearRutinaModal";

type Alumno = {
  id: string;
  nombre: string;
  apellido?: string | null;
  foto_url?: string | null;
};

type Rutina = {
  id: string;
  nombre?: string | null;
  descripcion?: string | null;
  objetivo?: string | null;
  created_at?: string | null;
  creada_para_alumno_id?: string | null;
  creada_desde_perfil_alumno?: boolean | null;
  es_duplicado_limpio?: boolean | null;
  profesor_id?: string | null;
};

type RutinaAsignada = {
  id: string;
  alumno_id: string;
  rutina_id: string;
  activa?: boolean | null;
  completada?: boolean | null;
  fecha_asignacion?: string | null;
  fecha_completada?: string | null;
  rutinas?: Rutina | Rutina[] | null;
};

export default function AlumnoRutinasProfesor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [asignadas, setAsignadas] = useState<RutinaAsignada[]>([]);
  const [disponibles, setDisponibles] = useState<Rutina[]>([]);
  const [profesorId, setProfesorId] = useState<string | null>(null);
  const { formatearFechaCorta } = useFormatoFecha();

  // Paginación y búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(0);
  const [rutinasPorPagina] = useState(10);
  const [totalAsignaciones, setTotalAsignaciones] = useState(0);
  const [filtrosAbierto, setFiltrosAbierto] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState<"fecha" | "nombre" | "estado">("fecha");
  const [orden, setOrden] = useState<"asc" | "desc">("desc");

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<"todas" | "completadas" | "pendientes">("todas");
  const [filtroFecha, setFiltroFecha] = useState<"todas" | "semana" | "mes" | "tresmeses">("todas");

  const [mostrarCrearModal, setMostrarCrearModal] = useState(false);
  const [mostrarModalAsignar, setMostrarModalAsignar] = useState(false);

  const [verRutinaId, setVerRutinaId] = useState<string | null>(null);
  const [quitandoId, setQuitandoId] = useState<string | null>(null);

  useEffect(() => {
    cargarTodo();
  }, [id]);

  const cargarAsignaciones = useCallback(async (profesorActualId: string, esRecarga = false) => {
    const LIMITE = rutinasPorPagina;
    const desde = esRecarga ? 0 : paginaActual * LIMITE;

    let query = supabase
      .from("rutina_asignaciones")
      .select(
        `
        id,
        alumno_id,
        rutina_id,
        activa,
        completada,
        fecha_asignacion,
        fecha_completada,
        rutinas (
          id,
          nombre,
          descripcion,
          objetivo,
          created_at,
          creada_para_alumno_id,
          creada_desde_perfil_alumno,
          es_duplicado_limpio,
          profesor_id
        )
      `,
        { count: "exact" }
      )
      .eq("alumno_id", id);

    // Filtro por estado
    if (filtroEstado === "completadas") {
      query = query.eq("completada", true);
    } else if (filtroEstado === "pendientes") {
      query = query.eq("completada", false);
    }

    // Filtro por fecha
    if (filtroFecha !== "todas") {
      const now = new Date();
      let desdeFecha: Date;
      switch (filtroFecha) {
        case "semana":
          desdeFecha = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "mes":
          desdeFecha = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "tresmeses":
          desdeFecha = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }
      query = query.gte("fecha_asignacion", desdeFecha!.toISOString());
    }

    // Ordenamiento
    if (ordenarPor === "nombre") {
      query = query.order("rutinas(nombre)", { ascending: orden === "asc" });
    } else {
      query = query.order("fecha_asignacion", { ascending: orden === "asc" });
    }

    query = query.range(desde, desde + LIMITE - 1);

    if (busqueda.trim()) {
      query = query.ilike("rutinas.nombre", `%${busqueda.trim()}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      alert(error.message);
      return;
    }

    const asignadasPropias = ((data || []) as RutinaAsignada[]).filter(
      (asignacion) => {
        const rutina = normalizarRelacion<Rutina>(asignacion.rutinas);
        return rutina?.profesor_id === profesorActualId;
      }
    );

    if (count !== null) {
      setTotalAsignaciones(count);
    }

    if (esRecarga || desde === 0) {
      setAsignadas(asignadasPropias);
    } else {
      setAsignadas((prev) => [...prev, ...asignadasPropias]);
    }
  }, [id, paginaActual, rutinasPorPagina, busqueda, filtroEstado, filtroFecha, ordenarPor, orden]);

  async function cargarTodo() {
    setLoading(true);

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

    // Paso 1: Ejecutar consultas independientes en paralelo
    const [
      { data: alumnoData, error: alumnoError },
      { data: disponiblesData, error: disponiblesError },
    ] = await Promise.all([
      supabase
        .from("alumnos")
        .select("id,nombre,apellido,foto_url,profesor_id")
        .eq("id", id)
        .eq("profesor_id", profesorActualId)
        .single(),
      supabase
        .from("rutinas")
        .select(
          "id,nombre,descripcion,objetivo,created_at,creada_para_alumno_id,creada_desde_perfil_alumno,es_duplicado_limpio,profesor_id"
        )
        .eq("profesor_id", profesorActualId)
        .order("nombre", { ascending: true }),
    ]);

    if (alumnoError || !alumnoData) {
      alert(alumnoError?.message || "No se encontró el alumno.");
      setLoading(false);
      return;
    }

    if (disponiblesError) {
      alert(disponiblesError.message);
      setLoading(false);
      return;
    }

    setAlumno(alumnoData as Alumno);
    setDisponibles((disponiblesData || []) as Rutina[]);

    // Cargar asignaciones con paginación
    await cargarAsignaciones(profesorActualId, true);
    setLoading(false);
  }

  // Auto-cargar cuando cambian filtros o página
  useEffect(() => {
    if (profesorId) {
      cargarAsignaciones(profesorId, true);
    }
  }, [cargarAsignaciones, profesorId]);

  async function asignarRutina(rutinasSeleccionadas: { id: string; nombre: string; fechaAsignacion?: string }[]) {
    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      return;
    }

    setGuardando(true);

    try {
      // Validar que el alumno pertenece al profesor
      const { data: alumnoPropio, error: alumnoError } = await supabase
        .from("alumnos")
        .select("id")
        .eq("id", id)
        .eq("profesor_id", profesorId)
        .maybeSingle();

      if (alumnoError || !alumnoPropio) {
        alert("No tenés permiso para asignar rutinas a este alumno.");
        return;
      }

      // Crear todas las asignaciones en batch
      const asignaciones = rutinasSeleccionadas.map((rutina) => ({
        alumno_id: id,
        rutina_id: rutina.id,
        activa: true,
        completada: false,
        fecha_asignacion: rutina.fechaAsignacion || new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("rutina_asignaciones")
        .insert(asignaciones);

      if (error) {
        alert(error.message);
        return;
      }

      // Recargar asignaciones desde Supabase
      await cargarTodo();
    } catch (error) {
      console.error("Error al asignar rutinas:", error);
      alert(`Error al asignar: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setGuardando(false);
    }
  }

  async function quitarAsignacion(asignacionId: string) {
    if (quitandoId) return;

    const confirmar = confirm("¿Querés quitar esta rutina del alumno?");
    if (!confirmar) return;

    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      return;
    }

    setQuitandoId(asignacionId);

    const { data: asignacionBD, error: asignacionError } = await supabase
      .from("rutina_asignaciones")
      .select("id, alumno_id, rutina_id")
      .eq("id", asignacionId)
      .eq("alumno_id", id)
      .maybeSingle();

    if (asignacionError) {
      alert(asignacionError.message);
      setQuitandoId(null);
      return;
    }

    if (!asignacionBD) {
      alert("No se encontró la asignación.");
      setQuitandoId(null);
      return;
    }

    const { data: alumnoPropio, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("id", asignacionBD.alumno_id)
      .eq("profesor_id", profesorId)
      .maybeSingle();

    if (alumnoError) {
      alert(alumnoError.message);
      setQuitandoId(null);
      return;
    }

    if (!alumnoPropio) {
      alert("No tenés permiso para modificar ese alumno.");
      setQuitandoId(null);
      return;
    }

    const { data: rutinaPropia, error: rutinaError } = await supabase
      .from("rutinas")
      .select("id")
      .eq("id", asignacionBD.rutina_id)
      .eq("profesor_id", profesorId)
      .maybeSingle();

    if (rutinaError) {
      alert(rutinaError.message);
      setQuitandoId(null);
      return;
    }

    if (!rutinaPropia) {
      alert("No tenés permiso para quitar esta rutina.");
      setQuitandoId(null);
      return;
    }

    const { data: registrosABorrar, error: buscarError } = await supabase
      .from("registros_entrenamiento")
      .select("id, ejercicio_id")
      .eq("alumno_id", asignacionBD.alumno_id)
      .eq("rutina_asignacion_id", asignacionId);

    if (buscarError) {
      alert(buscarError.message);
      setQuitandoId(null);
      return;
    }

    const ejercicioIds = Array.from(
      new Set(
        (registrosABorrar || [])
          .map((registro) => registro.ejercicio_id)
          .filter(Boolean)
      )
    ) as string[];

    const registroIds = (registrosABorrar || []).map((registro) => registro.id);

    if (registroIds.length > 0) {
      const { error: historialError } = await supabase
        .from("rms_historial")
        .delete()
        .in("registro_entrenamiento_id", registroIds);

      if (historialError) {
        alert(historialError.message);
        setQuitandoId(null);
        return;
      }

      const { error: registrosError } = await supabase
        .from("registros_entrenamiento")
        .delete()
        .in("id", registroIds);

      if (registrosError) {
        alert(registrosError.message);
        setQuitandoId(null);
        return;
      }
    }

    const { error } = await supabase
      .from("rutina_asignaciones")
      .delete()
      .eq("id", asignacionId)
      .eq("alumno_id", asignacionBD.alumno_id)
      .eq("rutina_id", asignacionBD.rutina_id);

    if (error) {
      alert(error.message);
      setQuitandoId(null);
      return;
    }

    if (ejercicioIds.length > 0) {
      const { error: rmsActualesError } = await supabase
        .from("rms_actuales")
        .delete()
        .eq("alumno_id", asignacionBD.alumno_id)
        .in("ejercicio_id", ejercicioIds);

      if (rmsActualesError) {
        alert(rmsActualesError.message);
        setQuitandoId(null);
        return;
      }

      try {
        for (const ejercicioId of ejercicioIds) {
          await recalcularRMActual({ alumnoId: asignacionBD.alumno_id, ejercicioId });
        }
      } catch (error: unknown) {
        alert(error instanceof Error ? error.message : "Error al recalcular RM actual");
        setQuitandoId(null);
        return;
      }
    }

    setAsignadas((prev) => prev.filter((a) => a.id !== asignacionId));
    setQuitandoId(null);
  }

  async function editarRutinaParaAlumno(asignacion: RutinaAsignada) {
    const rutina = normalizarRelacion<Rutina>(asignacion.rutinas);

    if (!rutina) {
      alert("No se encontró la rutina.");
      return;
    }

    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      return;
    }

    const { data: alumnoPropio, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("id", id)
      .eq("profesor_id", profesorId)
      .maybeSingle();

    if (alumnoError) {
      alert(alumnoError.message);
      return;
    }

    if (!alumnoPropio) {
      alert("No tenés permiso para editar rutinas de este alumno.");
      return;
    }

    const { data: rutinaPropia, error: rutinaError } = await supabase
      .from("rutinas")
      .select("id,nombre,descripcion,objetivo,profesor_id")
      .eq("id", rutina.id)
      .eq("profesor_id", profesorId)
      .maybeSingle();

    if (rutinaError) {
      alert(rutinaError.message);
      return;
    }

    if (!rutinaPropia) {
      alert("No tenés permiso para editar esta rutina.");
      return;
    }

    if (rutina.creada_para_alumno_id === id) {
      window.location.href = `/rutinas/${rutina.id}?from=alumno&alumnoId=${id}`;
      return;
    }

    const confirmar = confirm(
      "Esta rutina se convertirá en una copia exclusiva para este alumno.\n\nLa plantilla original no será modificada."
    );

    if (!confirmar) return;

    const { data: nuevaRutina, error: nuevaRutinaError } = await supabase
      .from("rutinas")
      .insert({
        nombre: rutinaPropia.nombre,
        descripcion: rutinaPropia.descripcion,
        objetivo: rutinaPropia.objetivo,
        creada_para_alumno_id: id,
        creada_desde_perfil_alumno: true,
        es_duplicado_limpio: false,
        rutina_origen_id: rutina.id,
        creada_por: profesorId,
        profesor_id: profesorId,
      })
      .select()
      .single();

    if (nuevaRutinaError || !nuevaRutina) {
      alert(nuevaRutinaError?.message || "No se pudo duplicar la rutina.");
      return;
    }

    const { data: ejercicios, error: ejerciciosError } = await supabase
      .from("rutina_ejercicios")
      .select("id,created_at,rutina_id,nombre_ejercicio,series,tipo_prescripcion,repeticiones,duracion,peso,porcentaje_rm,rir,descanso,observaciones,orden,tipo_configuracion")
      .eq("rutina_id", rutina.id);

    if (ejerciciosError) {
      alert(ejerciciosError.message);
      return;
    }

    if (ejercicios?.length) {
      const ejerciciosDuplicados = ejercicios.map(
        ({ id, created_at, rutina_id, ...rest }) => ({
          ...rest,
          rutina_id: nuevaRutina.id,
        })
      );

      const { error: insertarEjerciciosError } = await supabase
        .from("rutina_ejercicios")
        .insert(ejerciciosDuplicados);

      if (insertarEjerciciosError) {
        alert(insertarEjerciciosError.message);
        return;
      }
    }

    const { data: entrada, error: entradaError } = await supabase
      .from("rutina_entrada_calor")
      .select("id,created_at,rutina_id,nombre_ejercicio,series,tipo_prescripcion,repeticiones,duracion,observaciones,orden,ejercicio_id")
      .eq("rutina_id", rutina.id);

    if (entradaError) {
      alert(entradaError.message);
      return;
    }

    if (entrada?.length) {
      const entradaDuplicada = entrada.map(
        ({ id, created_at, rutina_id, ...rest }) => ({
          ...rest,
          rutina_id: nuevaRutina.id,
        })
      );

      const { error: insertarEntradaError } = await supabase
        .from("rutina_entrada_calor")
        .insert(entradaDuplicada);

      if (insertarEntradaError) {
        alert(insertarEntradaError.message);
        return;
      }
    }

    const { error: asignacionError } = await supabase
      .from("rutina_asignaciones")
      .update({
        rutina_id: nuevaRutina.id,
      })
      .eq("id", asignacion.id)
      .eq("alumno_id", id)
      .eq("rutina_id", rutina.id);

    if (asignacionError) {
      alert(asignacionError.message);
      return;
    }

    window.location.href = `/rutinas/${nuevaRutina.id}?from=alumno&alumnoId=${id}`;
  }

  const handleRutinaCreada = useCallback((rutinaId: string) => {
    setMostrarCrearModal(false);

    // Asignar la rutina al alumno y redirigir
    if (!profesorId) return;

    supabase
      .from("rutina_asignaciones")
      .insert({
        alumno_id: id,
        rutina_id: rutinaId,
        activa: true,
        completada: false,
        fecha_asignacion: new Date().toISOString(),
      })
      .then(() => {
        window.location.href = `/rutinas/${rutinaId}?from=alumno&alumnoId=${id}`;
      });
  }, [id, profesorId]);

  const totalPaginas = Math.max(1, Math.ceil(totalAsignaciones / rutinasPorPagina));
  const paginaSegura = Math.min(paginaActual, totalPaginas - 1);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-5xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />
          <div className="h-9 w-36 rounded bg-zinc-800 mb-6" />
          <div className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 mb-5" />
          <div className="grid gap-4">
            <div className="h-40 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-40 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-40 rounded-2xl bg-zinc-900 border border-zinc-800" />
          </div>
        </div>
      </main>
    );
  }

  const rutinasDisponibles = disponibles
    .filter((rutina) => rutina.creada_desde_perfil_alumno !== true)
    .map((rutina) => ({
      id: rutina.id,
      nombre: rutina.nombre || "Rutina sin nombre",
    }));

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-5xl mx-auto">
        <BackButton fallback={`/alumnos/${id}`} />

        <header className="mt-6 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Rutinas de {alumno?.nombre} {alumno?.apellido || ""}
              </h1>
              <p className="text-zinc-400 mt-1">
                {totalAsignaciones > 0
                  ? `${totalAsignaciones} ${totalAsignaciones === 1 ? "rutina asignada" : "rutinas asignadas"}`
                  : "Solo se muestran las rutinas asignadas a este alumno."
                }
              </p>
            </div>

            <div className="flex items-center gap-2 mt-4 shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarCrearModal(true)}
                  className="hidden md:inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600 transition text-sm"
                >
                  + Crear rutina
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarModalAsignar(true)}
                  disabled={guardando || disponibles.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 px-5 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-950 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Asignar rutinas
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* FAB: boton flotante para crear rutina (solo mobile) */}
        <button
          type="button"
          onClick={() => setMostrarCrearModal(true)}
          className="md:hidden fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-3xl font-bold shadow-lg hover:bg-emerald-600 transition active:scale-95"
        >
          +
        </button>

        {/* Buscador + ⚙️ filtros */}
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFiltrosAbierto(true)}
            className="rounded-xl border border-zinc-700 bg-zinc-800 w-12 h-12 flex items-center justify-center text-sm hover:bg-zinc-700 transition shrink-0"
          >
            ⚙️
          </button>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(0); }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {asignadas.length === 0 ? (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-semibold">No se encontraron rutinas</h2>
            <p className="text-zinc-400 mt-2">
              {busqueda
                ? "No se encontraron rutinas con ese nombre."
                : "Este alumno no tiene rutinas asignadas."
              }
            </p>
          </section>
        ) : (
          <>
            <div className="grid gap-3">
              {asignadas.map((asignacion) => {
                const rutina = normalizarRelacion<Rutina>(asignacion.rutinas);

                return (
                  <div
                    key={asignacion.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 md:p-5 hover:border-zinc-700 hover:bg-zinc-800/70 transition"
                  >
                    {/* Mobile */}
                    <div className="md:hidden flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate text-sm">
                          {rutina?.nombre || "Rutina sin nombre"}
                          {rutina?.creada_desde_perfil_alumno && (
                            <span className="ml-2 inline-block rounded border border-yellow-700 bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-400 align-middle">
                              Personalizada
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">
                          Fecha {formatearFechaCorta(asignacion.completada ? asignacion.fecha_completada : asignacion.fecha_asignacion)} - <span className={asignacion.completada ? "text-zinc-400" : "text-emerald-400"}>{asignacion.completada ? "Completada" : "Pendiente"}</span>
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setVerRutinaId(asignacion.rutina_id)}
                          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                        >
                          👁️
                        </button>
                        <button
                          type="button"
                          onClick={() => editarRutinaParaAlumno(asignacion)}
                          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => quitarAsignacion(asignacion.id)}
                          disabled={quitandoId === asignacion.id}
                          className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Desktop */}
                    <div className="hidden md:flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{rutina?.nombre || "Rutina sin nombre"}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-zinc-500">
                            Fecha {formatearFechaCorta(asignacion.completada ? asignacion.fecha_completada : asignacion.fecha_asignacion)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            asignacion.completada
                              ? "bg-zinc-800 text-zinc-400"
                              : "bg-emerald-900/40 text-emerald-400"
                          }`}>
                            {asignacion.completada ? "Completada" : "Pendiente"}
                          </span>
                          {rutina?.creada_desde_perfil_alumno && (
                            <span className="ml-2 inline-block rounded border border-yellow-700 bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-400 align-middle">
                              Personalizada
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setVerRutinaId(asignacion.rutina_id)}
                          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          onClick={() => editarRutinaParaAlumno(asignacion)}
                          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => quitarAsignacion(asignacion.id)}
                          disabled={quitandoId === asignacion.id}
                          className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {quitandoId === asignacion.id ? "..." : "Quitar"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.max(0, p - 1))}
                  disabled={paginaSegura === 0}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <span className="text-sm text-zinc-400">
                  Página {paginaSegura + 1} de {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas - 1, p + 1))}
                  disabled={paginaSegura >= totalPaginas - 1}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}

        <CrearRutinaModal
          open={mostrarCrearModal}
          onClose={() => setMostrarCrearModal(false)}
          onCreada={handleRutinaCreada}
        />

        {mostrarModalAsignar && (
          <AsignarModal
            tipo="rutinas"
            items={rutinasDisponibles}
            onClose={() => setMostrarModalAsignar(false)}
            onConfirm={asignarRutina}
          />
        )}

        {verRutinaId && profesorId && (
          <VerRutinaPlantillaModal
            open={true}
            onClose={() => setVerRutinaId(null)}
            rutinaId={verRutinaId}
            profesorId={profesorId}
          />
        )}

        {/* Bottom sheet: filtros */}
        {filtrosAbierto && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
            <div className="w-full max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">🎯 Filtrar y ordenar</h3>
                <button
                  type="button"
                  onClick={() => setFiltrosAbierto(false)}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Estado</label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value as "todas" | "completadas" | "pendientes")}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3"
                  >
                    <option value="todas">Todos los estados</option>
                    <option value="completadas">Completadas</option>
                    <option value="pendientes">Pendientes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Fecha</label>
                  <select
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value as "todas" | "semana" | "mes" | "tresmeses")}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3"
                  >
                    <option value="todas">Todas las fechas</option>
                    <option value="semana">Última semana</option>
                    <option value="mes">Último mes</option>
                    <option value="tresmeses">Últimos 3 meses</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Ordenar por</label>
                  <select
                    value={ordenarPor}
                    onChange={(e) => setOrdenarPor(e.target.value as "fecha" | "nombre" | "estado")}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3"
                  >
                    <option value="fecha">Antigüedad</option>
                    <option value="nombre">Nombre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Orden</label>
                  <select
                    value={orden}
                    onChange={(e) => setOrden(e.target.value as "asc" | "desc")}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3"
                  >
                    <option value="desc">Descendente</option>
                    <option value="asc">Ascendente</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroEstado("todas");
                      setFiltroFecha("todas");
                      setOrdenarPor("fecha");
                      setOrden("desc");
                      setFiltrosAbierto(false);
                      setPaginaActual(0);
                    }}
                    className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFiltrosAbierto(false);
                      setPaginaActual(0);
                    }}
                    className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600"
                  >
                    Aplicar filtros
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
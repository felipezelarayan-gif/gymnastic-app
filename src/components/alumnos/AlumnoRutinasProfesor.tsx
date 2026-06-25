"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recalcularRMActual } from "@/lib/recalcularRMActual";

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

type RutinaEjercicio = {
  id: string;
  rutina_id: string;
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
};

type EntradaCalor = {
  id: string;
  rutina_id: string;
  nombre_ejercicio: string;
  series?: number | null;
  tipo_prescripcion?: string | null;
  repeticiones?: string | null;
  duracion?: string | null;
  observaciones?: string | null;
  orden?: number | null;
};

const card = "bg-zinc-900 border border-zinc-800 rounded-2xl p-5";
const input =
  "w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-white";

function normalizarRutina(rutinas?: Rutina | Rutina[] | null) {
  if (Array.isArray(rutinas)) return rutinas[0] || null;
  return rutinas || null;
}

function fecha(valor?: string | null) {
  return valor ? new Date(valor).toLocaleDateString("es-AR") : "Sin fecha";
}

function textoPrescripcion(item: {
  tipo_prescripcion?: string | null;
  repeticiones?: string | null;
  duracion?: string | null;
}) {
  if (item.tipo_prescripcion === "tiempo") {
    return `Duración: ${item.duracion || "-"}`;
  }

  return `Reps: ${item.repeticiones || "-"}`;
}

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

  const [rutinaSeleccionada, setRutinaSeleccionada] = useState("");
  const [mostrar, setMostrar] = useState(5);
  const [guardando, setGuardando] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState<"fecha" | "nombre" | "estado">("fecha");
  const [orden, setOrden] = useState<"asc" | "desc">("desc");

  const [mostrarCrearRutina, setMostrarCrearRutina] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoObjetivo, setNuevoObjetivo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");

  const [rutinaDetalleId, setRutinaDetalleId] = useState<string | null>(null);
  const [quitandoId, setQuitandoId] = useState<string | null>(null);
  const [editandoRutina, setEditandoRutina] = useState(false);
  const [ejerciciosPorRutina, setEjerciciosPorRutina] = useState<
    Record<string, RutinaEjercicio[]>
  >({});
  const [entradaPorRutina, setEntradaPorRutina] = useState<
    Record<string, EntradaCalor[]>
  >({});

  const detalleAsignacion = useMemo(() => {
    if (!rutinaDetalleId) return null;

    return (
      asignadas.find((asignacion) => asignacion.id === rutinaDetalleId) || null
    );
  }, [rutinaDetalleId, asignadas]);

  const detalleRutina = detalleAsignacion
    ? normalizarRutina(detalleAsignacion.rutinas)
    : null;

  useEffect(() => {
    cargarTodo();
  }, [id]);

  async function cargarTodo() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", sessionData.session.user.id)
      .single();

    if (!profile || profile.rol !== "profe") {
      window.location.href = "/alumno";
      return;
    }
    const profesorActualId = sessionData.session.user.id;
    setProfesorId(profesorActualId);

    const { data: alumnoData, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id,nombre,apellido,foto_url,profesor_id")
      .eq("id", id)
      .eq("profesor_id", profesorActualId)
      .single();

    if (alumnoError || !alumnoData) {
      alert(alumnoError?.message || "No se encontró el alumno.");
      setLoading(false);
      return;
    }

    const { data: asignadasData, error: asignadasError } = await supabase
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
      `
      )
      .eq("alumno_id", id)
      .order("fecha_asignacion", { ascending: false });

    if (asignadasError) {
      alert(asignadasError.message);
      setLoading(false);
      return;
    }

    const asignadasPropias = ((asignadasData || []) as RutinaAsignada[]).filter(
      (asignacion) => {
        const rutina = normalizarRutina(asignacion.rutinas);
        return rutina?.profesor_id === profesorActualId;
      }
    );

    const { data: disponiblesData, error: disponiblesError } = await supabase
      .from("rutinas")
      .select(
        "id,nombre,descripcion,objetivo,created_at,creada_para_alumno_id,creada_desde_perfil_alumno,es_duplicado_limpio,profesor_id"
      )
      .eq("profesor_id", profesorActualId)
      .order("nombre", { ascending: true });

    if (disponiblesError) {
      alert(disponiblesError.message);
      setLoading(false);
      return;
    }

    const rutinaIds = asignadasPropias
      .map((item) => item.rutina_id)
      .filter(Boolean);

    if (rutinaIds.length > 0) {
      const { data: ejerciciosData, error: ejerciciosError } = await supabase
        .from("rutina_ejercicios")
        .select("id,rutina_id,nombre_ejercicio,series,tipo_prescripcion,repeticiones,duracion,peso,porcentaje_rm,rir,descanso,observaciones,orden,tipo_configuracion")
        .in("rutina_id", rutinaIds)
        .order("orden", { ascending: true });

      if (ejerciciosError) {
        alert(ejerciciosError.message);
        setLoading(false);
        return;
      }

      const { data: entradaData, error: entradaError } = await supabase
        .from("rutina_entrada_calor")
        .select("id,rutina_id,nombre_ejercicio,series,tipo_prescripcion,repeticiones,duracion,observaciones,orden")
        .in("rutina_id", rutinaIds)
        .order("orden", { ascending: true });

      if (entradaError) {
        alert(entradaError.message);
        setLoading(false);
        return;
      }

      const ejerciciosAgrupados: Record<string, RutinaEjercicio[]> = {};
      const entradaAgrupada: Record<string, EntradaCalor[]> = {};

      (ejerciciosData || []).forEach((item) => {
        if (!ejerciciosAgrupados[item.rutina_id]) {
          ejerciciosAgrupados[item.rutina_id] = [];
        }

        ejerciciosAgrupados[item.rutina_id].push(item);
      });

      (entradaData || []).forEach((item) => {
        if (!entradaAgrupada[item.rutina_id]) {
          entradaAgrupada[item.rutina_id] = [];
        }

        entradaAgrupada[item.rutina_id].push(item);
      });

      setEjerciciosPorRutina(ejerciciosAgrupados);
      setEntradaPorRutina(entradaAgrupada);
    } else {
      setEjerciciosPorRutina({});
      setEntradaPorRutina({});
    }

    setAlumno(alumnoData as Alumno);
    setAsignadas(asignadasPropias);
    setDisponibles((disponiblesData || []) as Rutina[]);
    setLoading(false);
  }

  async function asignarRutina() {
    if (!rutinaSeleccionada) {
      alert("Elegí una rutina.");
      return;
    }

    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      return;
    }

    setGuardando(true);

    const { data: alumnoPropio, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("id", id)
      .eq("profesor_id", profesorId)
      .maybeSingle();

    if (alumnoError) {
      alert(alumnoError.message);
      setGuardando(false);
      return;
    }

    if (!alumnoPropio) {
      alert("No tenés permiso para asignar rutinas a este alumno.");
      setGuardando(false);
      return;
    }

    const { data: rutinaPropia, error: rutinaError } = await supabase
      .from("rutinas")
      .select("id,nombre,descripcion,objetivo,created_at,creada_para_alumno_id,creada_desde_perfil_alumno,es_duplicado_limpio,profesor_id")
      .eq("id", rutinaSeleccionada)
      .eq("profesor_id", profesorId)
      .maybeSingle();

    if (rutinaError) {
      alert(rutinaError.message);
      setGuardando(false);
      return;
    }

    if (!rutinaPropia) {
      alert("No tenés permiso para asignar esta rutina.");
      setGuardando(false);
      return;
    }

    const { data: nuevaAsignacion, error } = await supabase
      .from("rutina_asignaciones")
      .insert({
        alumno_id: id,
        rutina_id: rutinaSeleccionada,
        activa: true,
        completada: false,
        fecha_asignacion: new Date().toISOString(),
      })
      .select("id,alumno_id,rutina_id,activa,completada,fecha_asignacion,fecha_completada")
      .single();

    setGuardando(false);

    if (error || !nuevaAsignacion) {
      alert(error?.message || "No se pudo crear la asignación.");
      return;
    }

    setAsignadas((prev) => [
      { ...nuevaAsignacion, rutinas: rutinaPropia as Rutina },
      ...prev,
    ]);

    setRutinaSeleccionada("");
  }

  async function crearRutinaParaAlumno() {
    if (!nuevoNombre.trim()) {
      alert("Ingresá el nombre de la rutina.");
      return;
    }

    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      return;
    }

    setGuardando(true);

    const { data: alumnoPropio, error: alumnoError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("id", id)
      .eq("profesor_id", profesorId)
      .maybeSingle();

    if (alumnoError) {
      alert(alumnoError.message);
      setGuardando(false);
      return;
    }

    if (!alumnoPropio) {
      alert("No tenés permiso para crear rutinas para este alumno.");
      setGuardando(false);
      return;
    }

    const { data: nuevaRutina, error: rutinaError } = await supabase
      .from("rutinas")
      .insert({
        nombre: nuevoNombre.trim(),
        objetivo: nuevoObjetivo.trim() || null,
        descripcion: nuevaDescripcion.trim() || null,
        creada_para_alumno_id: id,
        creada_desde_perfil_alumno: true,
        es_duplicado_limpio: false,
        creada_por: profesorId,
        profesor_id: profesorId,
      })
      .select("id")
      .single();

    if (rutinaError || !nuevaRutina) {
      alert(rutinaError?.message || "No se pudo crear la rutina.");
      setGuardando(false);
      return;
    }

    const { error: asignacionError } = await supabase
      .from("rutina_asignaciones")
      .insert({
        alumno_id: id,
        rutina_id: nuevaRutina.id,
        activa: true,
        completada: false,
        fecha_asignacion: new Date().toISOString(),
      });

    setGuardando(false);

    if (asignacionError) {
      alert(asignacionError.message);
      return;
    }

    setNuevoNombre("");
    setNuevoObjetivo("");
    setNuevaDescripcion("");
    setMostrarCrearRutina(false);

    window.location.href = `/rutinas/${nuevaRutina.id}?alumnoId=${id}`;
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
    const rutina = normalizarRutina(asignacion.rutinas);

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
      window.location.href = `/rutinas/${rutina.id}?alumnoId=${id}`;
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
      .select("*")
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
      .select("*")
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

    window.location.href = `/rutinas/${nuevaRutina.id}?alumnoId=${id}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando rutinas...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-5xl mx-auto">
        <a href={`/alumnos/${id}`} className="text-zinc-400 hover:text-white">
          ← Volver al perfil
        </a>

        <header className="mt-6 mb-5">
          <h1 className="text-3xl font-bold">
            Rutinas de {alumno?.nombre} {alumno?.apellido || ""}
          </h1>
          <p className="text-zinc-400 mt-1">
            Solo se muestran las rutinas asignadas a este alumno.
          </p>
        </header>

        <section className={`${card} mb-5`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-xl font-semibold">Gestión de rutinas</h2>

            <button
              type="button"
              onClick={() => setMostrarCrearRutina(!mostrarCrearRutina)}
              className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-950"
            >
              + Crear rutina nueva
            </button>
          </div>

          {mostrarCrearRutina && (
            <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <h3 className="mb-2 text-lg font-semibold">
                Crear rutina para este alumno
              </h3>

              <p className="mb-4 text-sm text-yellow-400">
                Esta rutina quedará marcada como creada originalmente para{" "}
                {alumno?.nombre} {alumno?.apellido || ""}. Luego podrás
                duplicarla como plantilla limpia si querés usarla sin alerta.
              </p>

              <div className="space-y-3">
                <input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className={input}
                  placeholder="Nombre de la rutina"
                />

                <input
                  value={nuevoObjetivo}
                  onChange={(e) => setNuevoObjetivo(e.target.value)}
                  className={input}
                  placeholder="Objetivo"
                />

                <textarea
                  value={nuevaDescripcion}
                  onChange={(e) => setNuevaDescripcion(e.target.value)}
                  className={`${input} min-h-24`}
                  placeholder="Descripción"
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMostrarCrearRutina(false)}
                    className="flex-1 rounded-xl border border-zinc-700 py-3 text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={crearRutinaParaAlumno}
                    disabled={guardando}
                    className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {guardando ? "Creando..." : "Crear y asignar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <h3 className="text-lg font-semibold mb-3">
            Asignar rutina existente
          </h3>

          <div className="flex flex-col md:flex-row gap-3">
            <select
              className={input}
              value={rutinaSeleccionada}
              onChange={(e) => setRutinaSeleccionada(e.target.value)}
            >
              <option value="">Elegir rutina</option>
              {disponibles.map((rutina) => (
                <option key={rutina.id} value={rutina.id}>
                  {rutina.nombre || "Rutina sin nombre"}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={guardando}
              onClick={asignarRutina}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50"
            >
              Asignar
            </button>
          </div>
        </section>

        <section className={card}>
  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <h2 className="text-xl font-semibold">Rutinas asignadas</h2>

    <div className="flex gap-2">
      <select
        value={ordenarPor}
        onChange={(e) =>
          setOrdenarPor(
            e.target.value as "fecha" | "nombre" | "estado"
          )
        }
        className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
      >
        <option value="fecha">Antigüedad</option>
        <option value="nombre">Nombre</option>
        <option value="estado">Estado</option>
      </select>

      <select
        value={orden}
        onChange={(e) =>
          setOrden(e.target.value as "asc" | "desc")
        }
        className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
      >
        <option value="desc">Descendente</option>
        <option value="asc">Ascendente</option>
      </select>
    </div>
  </div>

  {asignadas.length === 0 ? (
            <p className="text-zinc-400">
              Este alumno no tiene rutinas asignadas.
            </p>
          ) : (
            <div className="space-y-3">
              {asignadas.slice(0, mostrar).map((asignacion) => {
                const rutina = normalizarRutina(asignacion.rutinas);

                const estado = asignacion.completada
                  ? "Finalizada"
                  : asignacion.activa
                    ? "Activa"
                    : "Sin finalizar";

                return (
                  <div
                    key={asignacion.id}
                    className="rounded-xl border border-zinc-800 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {rutina?.nombre || "Rutina sin nombre"}
                        </h3>

                        {rutina?.creada_desde_perfil_alumno &&
                          !rutina?.es_duplicado_limpio && (
                            <p className="mt-2 rounded-lg border border-yellow-700 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-400">
                              Esta rutina fue creada originalmente para este
                              alumno.
                            </p>
                          )}

                        <p className="text-sm text-zinc-400 mt-2">
                          Estado: {estado}
                        </p>

                        <p className="text-xs text-zinc-500 mt-1">
                          Asignada: {fecha(asignacion.fecha_asignacion)}
                        </p>

                        {rutina?.objetivo && (
                          <p className="text-xs text-zinc-500 mt-1">
                            Objetivo: {rutina.objetivo}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
  <button
    type="button"
    onClick={() => setRutinaDetalleId(asignacion.id)}
    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
  >
    Ver
  </button>

  <button
    type="button"
    onClick={() => editarRutinaParaAlumno(asignacion)}
    className="rounded-lg border border-amber-700 px-3 py-2 text-sm text-amber-400 hover:bg-amber-950"
  >
    Editar
  </button>

  <button
    type="button"
    onClick={() => quitarAsignacion(asignacion.id)}
    disabled={quitandoId === asignacion.id}
    className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {quitandoId === asignacion.id ? "Quitando..." : "Quitar"}
  </button>
</div>
                    </div>
                  </div>
                );
              })}

              {mostrar < asignadas.length && (
                <button
                  type="button"
                  onClick={() => setMostrar(mostrar + 5)}
                  className="w-full rounded-xl border border-zinc-700 py-3 text-zinc-300 hover:bg-zinc-800"
                >
                  Mostrar más
                </button>
              )}
            </div>
          )}
        </section>

        {rutinaDetalleId && detalleAsignacion && detalleRutina && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {detalleRutina.nombre || "Rutina sin nombre"}
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Detalle completo de la rutina asignada.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setRutinaDetalleId(null)}
                  className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
                >
                  Cerrar
                </button>
              </div>

              <div className="space-y-5">
                <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <h3 className="text-lg font-semibold">Información general</h3>

                  <div className="mt-3 space-y-2 text-sm text-zinc-400">
                    <p>Estado: {detalleAsignacion.completada ? "Finalizada" : "Activa"}</p>
                    <p>Asignada: {fecha(detalleAsignacion.fecha_asignacion)}</p>
                    {detalleAsignacion.fecha_completada && (
                      <p>
                        Completada: {fecha(detalleAsignacion.fecha_completada)}
                      </p>
                    )}
                    {detalleRutina.objetivo && (
                      <p>Objetivo: {detalleRutina.objetivo}</p>
                    )}
                    {detalleRutina.descripcion && (
                      <p className="whitespace-pre-wrap">
                        Descripción: {detalleRutina.descripcion}
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <h3 className="text-lg font-semibold">Entrada en calor</h3>

                  {(entradaPorRutina[detalleAsignacion.rutina_id] || [])
                    .length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-500">
                      Sin entrada en calor cargada.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {(entradaPorRutina[detalleAsignacion.rutina_id] || []).map(
                        (item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border border-zinc-800 p-3"
                          >
                            <p className="font-semibold">
                              {item.nombre_ejercicio}
                            </p>
                            <p className="text-sm text-zinc-400">
                              {item.series || "-"} series ·{" "}
                              {textoPrescripcion(item)}
                            </p>
                            {item.observaciones && (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-500">
                                {item.observaciones}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <h3 className="text-lg font-semibold">Ejercicios</h3>

                  {(ejerciciosPorRutina[detalleAsignacion.rutina_id] || [])
                    .length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-500">
                      Sin ejercicios cargados.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {(
                        ejerciciosPorRutina[detalleAsignacion.rutina_id] || []
                      ).map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-zinc-800 p-3"
                        >
                          <p className="font-semibold">
                            {item.nombre_ejercicio}
                          </p>

                          <p className="text-sm text-zinc-400">
                            {item.series || "-"} series ·{" "}
                            {textoPrescripcion(item)}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
                            {item.peso && <span>Peso: {item.peso}</span>}
                            {item.porcentaje_rm && (
                              <span>%RM: {item.porcentaje_rm}</span>
                            )}
                            {item.rir && <span>RIR: {item.rir}</span>}
                            {item.descanso && (
                              <span>Descanso: {item.descanso}</span>
                            )}
                          </div>

                          {item.observaciones && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-500">
                              {item.observaciones}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

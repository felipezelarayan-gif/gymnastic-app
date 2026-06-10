"use client";

import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import CrearEjercicioModal from "@/components/ejercicios/CrearEjercicioModal";

type TipoPrescripcion = "repeticiones" | "tiempo";

type Rutina = {
  id: string;
  nombre: string;
  descripcion?: string;
  objetivo?: string;
  estructura?: string;
  entrada_calor?: string;
};

type Ejercicio = {
  id: string;
  nombre: string;
  grupo_muscular?: string;
};

type RutinaEjercicio = {
  id: string;
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
};

type EntradaCalorEjercicio = {
  id: string;
  rutina_id: string;
  ejercicio_id?: string | null;
  nombre_ejercicio: string;
  series?: number | null;
  tipo_prescripcion?: TipoPrescripcion | null;
  duracion?: string | null;
  repeticiones?: string | null;
  observaciones?: string | null;
  orden?: number | null;
};

type Alumno = {
  id: string;
  nombre: string;
  apellido?: string;
  email?: string;
};

type Asignacion = {
  id: string;
  alumno_id: string;
  rutina_id: string;
  alumnos?: {
    nombre: string;
    apellido?: string;
    email?: string;
  };
};

const porcentajesRM = Array.from({ length: 21 }, (_, index) => index * 5);
const opcionesRIR = Array.from({ length: 10 }, (_, index) => index + 1);
const opcionesSeries = ["1", "2", "3", "4", "5", "custom"];
const opcionesTiempo = Array.from({ length: 12 }, (_, index) => (index + 1) * 15);

function formatoTiempo(segundos: number) {
  if (segundos < 60) return `${segundos}''`;
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  if (resto === 0) return `${minutos}'`;
  return `${minutos}'${resto}''`;
}

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
  const [entradaCalorEjercicios, setEntradaCalorEjercicios] = useState<EntradaCalorEjercicio[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);

  const [mostrarEditarRutina, setMostrarEditarRutina] = useState(false);
  const [mostrarEjercicioPrincipal, setMostrarEjercicioPrincipal] = useState(false);
  const [mostrarEntradaCalor, setMostrarEntradaCalor] = useState(false);
  const [mostrarCrearEjercicio, setMostrarCrearEjercicio] = useState(false);
  const [mostrarAsignarAlumno, setMostrarAsignarAlumno] = useState(false);

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

  const [entradaEjercicioId, setEntradaEjercicioId] = useState("");
  const [entradaNombreEjercicio, setEntradaNombreEjercicio] = useState("");
  const [entradaSeries, setEntradaSeries] = useState("1");
  const [entradaSeriesCustom, setEntradaSeriesCustom] = useState("");
  const [entradaTipoPrescripcion, setEntradaTipoPrescripcion] = useState<TipoPrescripcion>("repeticiones");
  const [entradaDuracion, setEntradaDuracion] = useState("");
  const [entradaRepeticiones, setEntradaRepeticiones] = useState("");
  const [entradaObservaciones, setEntradaObservaciones] = useState("");

  const [alumnoId, setAlumnoId] = useState("");

  useEffect(() => {
    verificarPermiso();
  }, [id]);

  async function verificarPermiso() {
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

    await Promise.all([
      cargarRutina(),
      cargarEjercicios(),
      cargarEntradaCalor(),
      cargarRutinaEjercicios(),
      cargarAlumnos(),
      cargarAsignaciones(),
    ]);

    setLoading(false);
  }

  async function cargarRutina() {
    const { data, error } = await supabase
      .from("rutinas")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setRutina(data);
    setEditNombre(data.nombre || "");
    setEditDescripcion(data.descripcion || "");
    setEditObjetivo(data.objetivo || "");
    setEditEstructura(data.estructura || "");
    setEditEntradaCalorTexto(data.entrada_calor || "");
  }

  async function cargarEjercicios() {
    const { data } = await supabase
      .from("ejercicios")
      .select("id,nombre,grupo_muscular")
      .order("nombre");

    setEjercicios(data || []);
  }

  async function cargarEntradaCalor() {
    const { data, error } = await supabase
      .from("rutina_entrada_calor")
      .select("*")
      .eq("rutina_id", id)
      .order("orden", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setEntradaCalorEjercicios(data || []);
  }

  async function cargarRutinaEjercicios() {
    const { data, error } = await supabase
      .from("rutina_ejercicios")
      .select("*")
      .eq("rutina_id", id)
      .order("orden", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setRutinaEjercicios(data || []);
  }

  async function cargarAlumnos() {
    const { data } = await supabase
      .from("alumnos")
      .select("id,nombre,apellido,email")
      .order("nombre");

    setAlumnos(data || []);
  }

  async function cargarAsignaciones() {
    const { data, error } = await supabase
      .from("rutina_asignaciones")
      .select(`
        *,
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

    setAsignaciones(data || []);
  }

  async function guardarEdicionRutina() {
    if (!editNombre.trim()) {
      alert("Ingresá un nombre.");
      return;
    }

    const { error } = await supabase
      .from("rutinas")
      .update({
        nombre: editNombre,
        descripcion: editDescripcion,
        objetivo: editObjetivo,
        estructura: editEstructura,
        entrada_calor: editEntradaCalorTexto,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setMostrarEditarRutina(false);
    cargarRutina();
  }

  async function borrarRutina() {
    const confirmar = confirm("¿Seguro que querés borrar esta rutina completa?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("rutinas")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/rutinas";
  }

  function abrirAgregarEntradaCalor() {
    setEntradaEditandoId(null);
    limpiarFormularioEntrada();
    setMostrarEntradaCalor(true);
  }

  function abrirEditarEntradaCalor(item: EntradaCalorEjercicio) {
    const seriesTexto = item.series ? String(item.series) : "1";

    setEntradaEditandoId(item.id);
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

  async function guardarEntradaCalor() {
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
      const { error } = await supabase
        .from("rutina_entrada_calor")
        .update(payload)
        .eq("id", entradaEditandoId);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("rutina_entrada_calor")
        .insert(payload);

      if (error) {
        alert(error.message);
        return;
      }
    }

    limpiarFormularioEntrada();
    setMostrarEntradaCalor(false);
    cargarEntradaCalor();
  }

  async function borrarEntradaCalor(entradaId: string) {
    const confirmar = confirm("¿Seguro que querés borrar este ejercicio de la entrada en calor?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("rutina_entrada_calor")
      .delete()
      .eq("id", entradaId);

    if (error) {
      alert(error.message);
      return;
    }

    cargarEntradaCalor();
  }

  function abrirAgregarEjercicioPrincipal() {
    setEjercicioEditandoId(null);
    limpiarFormularioEjercicio();
    setMostrarEjercicioPrincipal(true);
  }

  function abrirEditarEjercicioPrincipal(item: RutinaEjercicio) {
    const seriesTexto = item.series ? String(item.series) : "3";

    setEjercicioEditandoId(item.id);
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
    setMostrarEjercicioPrincipal(true);
  }

  async function guardarEjercicioPrincipal() {
    if (!ejercicioId) {
  alert("Seleccioná un ejercicio del banco.");
  return;
}

    const seriesFinal = series === "custom" ? seriesCustom : series;

    const payload = {
      rutina_id: id,
      ejercicio_id: ejercicioId || null,
      nombre_ejercicio:
  ejercicios.find((e) => e.id === ejercicioId)?.nombre || "",
      series: seriesFinal ? Number(seriesFinal) : null,
      tipo_prescripcion: tipoPrescripcion,
      repeticiones: tipoPrescripcion === "repeticiones" ? repeticiones : "",
      duracion: tipoPrescripcion === "tiempo" ? duracion : "",
      peso,
      porcentaje_rm: porcentajeRm,
      rir,
      descanso,
      observaciones,
      orden: rutinaEjercicios.length + 1,
    };

    if (ejercicioEditandoId) {
      const { error } = await supabase
        .from("rutina_ejercicios")
        .update(payload)
        .eq("id", ejercicioEditandoId);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("rutina_ejercicios")
        .insert(payload);

      if (error) {
        alert(error.message);
        return;
      }
    }

    limpiarFormularioEjercicio();
    setMostrarEjercicioPrincipal(false);
    cargarRutinaEjercicios();
  }

  async function cambiarOrdenEjercicio(
  rutinaEjercicioId: string,
  nuevoOrden: number
) {
  const ejerciciosOrdenados = [...rutinaEjercicios].sort(
    (a, b) => Number(a.orden || 0) - Number(b.orden || 0)
  );

  const ejercicioMovido = ejerciciosOrdenados.find(
    (item) => item.id === rutinaEjercicioId
  );

  if (!ejercicioMovido) return;

  const restantes = ejerciciosOrdenados.filter(
    (item) => item.id !== rutinaEjercicioId
  );

  restantes.splice(nuevoOrden - 1, 0, ejercicioMovido);

  const actualizaciones = restantes.map((item, index) =>
    supabase
      .from("rutina_ejercicios")
      .update({ orden: index + 1 })
      .eq("id", item.id)
  );

  await Promise.all(actualizaciones);

  await cargarRutinaEjercicios();
}

  async function borrarEjercicioPrincipal(rutinaEjercicioId: string) {
    const confirmar = confirm("¿Seguro que querés borrar este ejercicio de la rutina?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("rutina_ejercicios")
      .delete()
      .eq("id", rutinaEjercicioId);

    if (error) {
      alert(error.message);
      return;
    }

    cargarRutinaEjercicios();
  }

  async function asignarAlumno() {
  if (!alumnoId) {
    alert("Seleccioná un alumno.");
    return;
  }

  const { error: insertarError } = await supabase
    .from("rutina_asignaciones")
    .insert({
      rutina_id: id,
      alumno_id: alumnoId,
      activa: true,
      completada: false,
      fecha_completada: null,
    });

  if (insertarError) {
    alert(insertarError.message);
    return;
  }

  setAlumnoId("");
  setMostrarAsignarAlumno(false);
  cargarAsignaciones();
}

  async function quitarAsignacion(asignacionId: string) {
    console.log("QUITAR ASIGNACION DESDE RUTINA DETALLE", asignacionId);
  const confirmar = confirm("¿Querés quitar esta rutina del alumno?");
  if (!confirmar) return;

  const asignacionActual = asignaciones.find(
    (asignacion) => asignacion.id === asignacionId
  );

  if (!asignacionActual) {
    alert("No se encontró la asignación.");
    return;
  }

  const { data: registrosABorrar, error: buscarError } = await supabase
    .from("registros_entrenamiento")
    .select("id, ejercicio_id")
    .eq("alumno_id", asignacionActual.alumno_id)
    .eq("rutina_asignacion_id", asignacionId);

  if (buscarError) {
    alert(buscarError.message);
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
      return;
    }

    const { error: registrosError } = await supabase
      .from("registros_entrenamiento")
      .delete()
      .in("id", registroIds);

    if (registrosError) {
      alert(registrosError.message);
      return;
    }
  }

  if (ejercicioIds.length > 0) {
    const { error: rmsActualesError } = await supabase
      .from("rms_actuales")
      .delete()
      .eq("alumno_id", asignacionActual.alumno_id)
      .in("ejercicio_id", ejercicioIds);

    if (rmsActualesError) {
      alert(rmsActualesError.message);
      return;
    }
  }

  const { error } = await supabase
    .from("rutina_asignaciones")
    .delete()
    .eq("id", asignacionId);

  if (error) {
    alert(error.message);
    return;
  }

  cargarAsignaciones();
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

  function cambiarPeso(valor: string) {
    setPeso(valor);
    if (valor.trim()) setPorcentajeRm("");
  }

  function cambiarPorcentajeRm(valor: string) {
    setPorcentajeRm(valor);
    if (valor !== "") setPeso("");
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
        <a href="/rutinas" className="text-zinc-400 hover:text-white">
          ← Volver a rutinas
        </a>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMostrarEditarRutina(true)}
                className="rounded-xl border border-zinc-700 px-4 py-3 text-sm hover:bg-zinc-800"
              >
                Editar rutina
              </button>

              <button
                type="button"
                onClick={borrarRutina}
                className="rounded-xl border border-red-800 px-4 py-3 text-sm text-red-400 hover:bg-red-950"
              >
                Borrar rutina
              </button>
            </div>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">Entrada en calor</h2>

            <button
              type="button"
              onClick={abrirAgregarEntradaCalor}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold"
            >
              + Agregar ejercicio
            </button>
          </div>

          {rutina.entrada_calor && (
            <p className="text-zinc-400 whitespace-pre-wrap mb-4">
              {rutina.entrada_calor}
            </p>
          )}

          {entradaCalorEjercicios.length === 0 ? (
            <p className="text-zinc-500">Sin ejercicios de entrada en calor.</p>
          ) : (
            <div className="space-y-3">
              {entradaCalorEjercicios.map((item) => (
                <div
                  key={item.id}
                  className="border border-zinc-800 rounded-xl p-4"
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

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => abrirEditarEntradaCalor(item)}
                        className="text-zinc-300 text-sm hover:text-white"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => borrarEntradaCalor(item.id)}
                        className="text-red-400 text-sm hover:text-red-300"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid md:grid-cols-3 gap-4 mt-5">
          <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Ejercicios principales</h2>

              <button
                type="button"
                onClick={abrirAgregarEjercicioPrincipal}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold"
              >
                + Agregar
              </button>
            </div>

            {rutinaEjercicios.length === 0 ? (
              <p className="text-zinc-400">
                Todavía no hay ejercicios cargados.
              </p>
            ) : (
              <div className="space-y-3">
                {rutinaEjercicios.map((item) => (
                  <div
                    key={item.id}
                    className="border border-zinc-800 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {item.nombre_ejercicio}
                        </h3>

                        <p className="text-zinc-400 mt-1">
                          {item.series || "-"} series · {textoPrescripcion(item)}
                        </p>

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
                      </div>

                      <div className="flex gap-3">

                        <select
  value={item.orden || ""}
  onChange={(e) => cambiarOrdenEjercicio(item.id, Number(e.target.value))}
  className="rounded-lg bg-zinc-800 px-2 py-1 text-sm"
>
  {rutinaEjercicios.map((_, index) => (
    <option key={index + 1} value={index + 1}>
      {index + 1}
    </option>
  ))}
</select>
                        
                        <button
                          type="button"
                          onClick={() => abrirEditarEjercicioPrincipal(item)}
                          className="text-zinc-300 text-sm hover:text-white"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => borrarEjercicioPrincipal(item.id)}
                          className="text-red-400 text-sm hover:text-red-300"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Alumnos</h2>

              <button
                type="button"
                onClick={() => setMostrarAsignarAlumno(true)}
                className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold"
              >
                + Asignar
              </button>
            </div>

            {asignaciones.length === 0 ? (
              <p className="text-zinc-400">No hay alumnos asignados.</p>
            ) : (
              <div className="space-y-2">
                {asignaciones.map((asignacion) => (
                  <div
                    key={asignacion.id}
                    className="border border-zinc-800 rounded-xl p-3"
                  >
                    <p className="font-semibold">
                      {asignacion.alumnos?.nombre} {asignacion.alumnos?.apellido}
                    </p>

                    <p className="text-zinc-500 text-sm">
                      {asignacion.alumnos?.email || "Sin email"}
                    </p>

                    <button
                      type="button"
                      onClick={() => quitarAsignacion(asignacion.id)}
                      className="text-red-400 text-sm mt-2"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                  className="flex-1 border border-zinc-700 rounded-xl py-3"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarEdicionRutina}
                  className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold"
                >
                  Guardar
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
                  <select
                    value={entradaDuracion}
                    onChange={(e) => setEntradaDuracion(e.target.value)}
                    className="w-full bg-zinc-800 rounded-xl p-3"
                  >
                    <option value="">Duración</option>
                    {opcionesTiempo.map((segundos) => (
                      <option key={segundos} value={formatoTiempo(segundos)}>
                        {formatoTiempo(segundos)}
                      </option>
                    ))}
                  </select>
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
                  className="flex-1 border border-zinc-700 rounded-xl py-3"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarEntradaCalor}
                  className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarEjercicioPrincipal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">
                {ejercicioEditandoId ? "Editar ejercicio" : "Agregar ejercicio"}
              </h2>

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

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
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
                      onChange={(e) => setSeriesCustom(e.target.value)}
                      className="w-full bg-zinc-800 rounded-xl p-3"
                      placeholder="Series custom"
                    />
                  )}
                </div>

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
                  <select
                    value={duracion}
                    onChange={(e) => setDuracion(e.target.value)}
                    className="w-full bg-zinc-800 rounded-xl p-3"
                  >
                    <option value="">Duración</option>
                    {opcionesTiempo.map((segundos) => (
                      <option key={segundos} value={formatoTiempo(segundos)}>
                        {formatoTiempo(segundos)}
                      </option>
                    ))}
                  </select>
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

                  <select
                    value={descanso}
                    onChange={(e) => setDescanso(e.target.value)}
                    className="w-full bg-zinc-800 rounded-xl p-3"
                  >
                    <option value="">Descanso entre series</option>
                    {opcionesTiempo.map((segundos) => (
                      <option key={segundos} value={formatoTiempo(segundos)}>
                        {formatoTiempo(segundos)}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 min-h-24"
                  placeholder="Observaciones"
                />
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    limpiarFormularioEjercicio();
                    setMostrarEjercicioPrincipal(false);
                  }}
                  className="flex-1 border border-zinc-700 rounded-xl py-3"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarEjercicioPrincipal}
                  className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarAsignarAlumno && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">Asignar alumno</h2>

              <select
                value={alumnoId}
                onChange={(e) => setAlumnoId(e.target.value)}
                className="w-full bg-zinc-800 rounded-xl p-3"
              >
                <option value="">Seleccionar alumno</option>

                {alumnos.map((alumno) => (
                  <option key={alumno.id} value={alumno.id}>
                    {alumno.nombre} {alumno.apellido}
                  </option>
                ))}
              </select>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setMostrarAsignarAlumno(false)}
                  className="flex-1 border border-zinc-700 rounded-xl py-3"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={asignarAlumno}
                  className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold"
                >
                  Asignar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
            <CrearEjercicioModal
        abierto={mostrarCrearEjercicio}
        onCerrar={() => setMostrarCrearEjercicio(false)}
        onCreado={async (ejercicio) => {
          await cargarEjercicios();
          setEjercicioId(ejercicio.id);
          setNombreEjercicio(ejercicio.nombre);
        }}
      />
    </main>
  );
}

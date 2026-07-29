"use client";

// Flujo actual:
// - evaluaciones_rm guarda la cabecera de la evaluación.
// - evaluaciones_rm_resultados guarda un registro por ejercicio con su orden.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { obtenerRMActualAlumnoEjercicio } from "@/lib/rmActual";
import BackButton from "@/components/BackButton";
import SkeletonEvaluaciones from "@/components/SkeletonEvaluaciones";
import TipoEvaluacionSelector from "@/components/TipoEvaluacionSelector";
import { useIdioma } from "@/lib/i18n-context";
import { campoBilingue } from "@/lib/utils/campoBilingue";

type Alumno = { id: string; nombre: string; profesor_id?: string | null };
type Ejercicio = { id: string; nombre: string };
type TipoEvaluacion = "individual" | "grupal" | null;
const DRAFT_KEY = "evaluacion_rm_crear_draft";

export default function CrearEvaluacionRM() {
  const router = useRouter();
  const { t, idioma } = useIdioma();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [profesorId, setProfesorId] = useState<string | null>(null);
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [tipoEvaluacion, setTipoEvaluacion] = useState<TipoEvaluacion>(null);
  const [alumnoId, setAlumnoId] = useState("");
  const [alumnosIds, setAlumnosIds] = useState<string[]>([]);
  const [ejerciciosSeleccionados, setEjerciciosSeleccionados] = useState<
    { ejercicio_id: string; orden: number }[]
  >([]);
  const [fecha, setFecha] = useState("");
  const [momentoEvaluacion, setMomentoEvaluacion] = useState<"ahora" | "profesor" | "alumno">("profesor");
  const [modalEjercicioAbierto, setModalEjercicioAbierto] = useState(false);
  const [ejercicioModalId, setEjercicioModalId] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [draftCargado, setDraftCargado] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialEjercicioNombre, setHistorialEjercicioNombre] = useState("");
  const [historialRMActual, setHistorialRMActual] = useState<number | null>(null);

  useEffect(() => {
    async function cargarDatos() {
      const { data: sessionData } = await supabase.auth.getSession();
      const profesorActualId = sessionData.session?.user.id;

      if (!profesorActualId) {
        alert(t("evaluaciones.errorSinProfesor"));
        router.push("/login");
        return;
      }

      setProfesorId(profesorActualId);

      const [{ data: perfiles, error: perfilesError }, { data: ejercs, error: ejerciciosError }] = await Promise.all([
        supabase
          .from("alumnos")
          .select("id, nombre, profesor_id")
          .eq("profesor_id", profesorActualId)
          .order("nombre"),
        supabase.from("ejercicios").select("id, nombre, nombre_es, nombre_en").order("nombre"),
      ]);

      if (perfilesError) {
        alert(perfilesError.message);
        setLoading(false);
        return;
      }

      if (ejerciciosError) {
        alert(ejerciciosError.message);
        setLoading(false);
        return;
      }

      if (perfiles) setAlumnos(perfiles);
      if (ejercs) setEjercicios(ejercs);
      setLoading(false);
    }
    cargarDatos();
  }, [router]);
  useEffect(() => {
    if (loading || alumnos.length === 0) return;

    const alumnosPropiosIds = new Set(alumnos.map((alumno) => alumno.id));

    if (alumnoId && !alumnosPropiosIds.has(alumnoId)) {
      setAlumnoId("");
    }

    setAlumnosIds((prev) => prev.filter((id) => alumnosPropiosIds.has(id)));
  }, [loading, alumnos, alumnoId]);

  useEffect(() => {
    try {
      const draftRaw = localStorage.getItem(DRAFT_KEY);

      if (draftRaw) {
        const draft = JSON.parse(draftRaw) as {
          tipoEvaluacion?: TipoEvaluacion;
          alumnoId?: string;
          alumnosIds?: string[];
          ejerciciosSeleccionados?: { ejercicio_id: string; orden: number }[];
          fecha?: string;
          momentoEvaluacion?: "ahora" | "profesor" | "alumno";
          notas?: string;
        };

        if (draft.tipoEvaluacion) setTipoEvaluacion(draft.tipoEvaluacion);
        if (draft.alumnoId) setAlumnoId(draft.alumnoId);
        if (Array.isArray(draft.alumnosIds)) setAlumnosIds(draft.alumnosIds);
        if (Array.isArray(draft.ejerciciosSeleccionados)) {
          setEjerciciosSeleccionados(draft.ejerciciosSeleccionados);
        }
        if (draft.fecha) setFecha(draft.fecha);
        if (draft.momentoEvaluacion) setMomentoEvaluacion(draft.momentoEvaluacion);
        if (typeof draft.notas === "string") setNotas(draft.notas);
      }
    } catch (error) {
      console.error("No se pudo leer el borrador de evaluación RM", error);
      localStorage.removeItem(DRAFT_KEY);
    } finally {
      setDraftCargado(true);
    }
  }, []);

  // Setear fecha actual después de la hidratación (solo cliente)
  useEffect(() => {
    if (!fecha) setFecha(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (!draftCargado || exito) return;

    const draft = {
      tipoEvaluacion,
      alumnoId,
      alumnosIds,
      ejerciciosSeleccionados,
      fecha,
      momentoEvaluacion,
      notas,
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [
    draftCargado,
    exito,
    tipoEvaluacion,
    alumnoId,
    alumnosIds,
    ejerciciosSeleccionados,
    fecha,
    momentoEvaluacion,
    notas,
  ]);

  function toggleEjercicio(id: string) {
    setEjerciciosSeleccionados((prev) => {
      const yaSeleccionado = prev.some((item) => item.ejercicio_id === id);

      if (yaSeleccionado) {
        return prev
          .filter((item) => item.ejercicio_id !== id)
          .map((item, index) => ({ ...item, orden: index + 1 }));
      }

      return [...prev, { ejercicio_id: id, orden: prev.length + 1 }];
    });
  }

  function abrirModalEjercicio() {
    setEjercicioModalId("");
    setModalEjercicioAbierto(true);
  }

  function agregarEjercicioDesdeModal() {
    if (!ejercicioModalId) return;

    const yaSeleccionado = ejerciciosSeleccionados.some(
      (item) => item.ejercicio_id === ejercicioModalId
    );

    if (yaSeleccionado) {
      alert(t("evaluaciones.errorEjercicioYaAgregado"));
      return;
    }

    setEjerciciosSeleccionados((prev) => [
      ...prev,
      { ejercicio_id: ejercicioModalId, orden: prev.length + 1 },
    ]);

    setEjercicioModalId("");
    setModalEjercicioAbierto(false);
  }

  function quitarEjercicioSeleccionado(id: string) {
    setEjerciciosSeleccionados((prev) =>
      prev
        .filter((item) => item.ejercicio_id !== id)
        .map((item, index) => ({ ...item, orden: index + 1 }))
    );
  }

  async function verHistorialEjercicio() {
    if (tipoEvaluacion !== "individual") {
      alert(t("evaluaciones.errorHistorialSoloIndividual"));
      return;
    }

    if (!alumnoId || !ejercicioModalId) {
      alert(t("evaluaciones.errorSeleccionarAlumnoEjercicio"));
      return;
    }

    if (!profesorId) {
      alert("No se pudo validar el profesor actual.");
      return;
    }

    const alumnoPropio = alumnos.some(
      (alumno) => alumno.id === alumnoId && alumno.profesor_id === profesorId
    );

    if (!alumnoPropio) {
      alert(t("evaluaciones.errorSinPermisoHistorial"));
      return;
    }

    setHistorialLoading(true);
    setHistorialAbierto(true);
    setHistorialRMActual(null);

    const ejercicio = ejercicios.find((e) => e.id === ejercicioModalId);
    const nombreEj = ejercicio ? campoBilingue(ejercicio, "nombre", idioma) : "";
    setHistorialEjercicioNombre(nombreEj || "Ejercicio");

    const { data, error } = await obtenerRMActualAlumnoEjercicio(
      alumnoId,
      ejercicioModalId
    );

    setHistorialLoading(false);

    if (error) {
      alert(error.message);
      setHistorialAbierto(false);
      return;
    }

    setHistorialRMActual(data?.rm_calculado ?? null);
  }

  const puedeMostrarFormulario = Boolean(
    tipoEvaluacion &&
      ((tipoEvaluacion === "individual" && alumnoId) ||
        (tipoEvaluacion === "grupal" && alumnosIds.length > 0))
  );

  async function guardar() {
    const alumnosParaEvaluar =
      tipoEvaluacion === "individual" ? [alumnoId].filter(Boolean) : alumnosIds;

    if (alumnosParaEvaluar.length === 0 || ejerciciosSeleccionados.length === 0) return;

    setGuardando(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setGuardando(false);
      alert("No se pudo identificar al profesor. Volvé a iniciar sesión.");
      return;
    }

    const alumnosPropiosIds = new Set(
      alumnos
        .filter((alumno) => alumno.profesor_id === userId)
        .map((alumno) => alumno.id)
    );

    const todosSonPropios = alumnosParaEvaluar.every((id) => alumnosPropiosIds.has(id));

    if (!todosSonPropios) {
      setGuardando(false);
      alert(t("evaluaciones.errorAlumnosNoPropios"));
      return;
    }

    const fechaAsignacion = fecha || new Date().toISOString().split("T")[0];

    const asignadaAlAlumno = momentoEvaluacion === "alumno";
    const puedeCargarAlumno = momentoEvaluacion === "alumno";

    const evaluacionesPayload = alumnosParaEvaluar.map((id) => ({
      alumno_id: id,
      profesor_id: userId,
      estado: "pendiente",
      asignada_al_alumno: asignadaAlAlumno,
      puede_cargar_alumno: puedeCargarAlumno,
      permitir_carga_alumno: puedeCargarAlumno,
      fecha_asignacion: fechaAsignacion,
      fecha_realizacion: null,
      cerrada_incompleta: false,
      observaciones: notas || null,
    }));

    const { data: evaluacionesCreadas, error: evaluacionError } = await supabase
      .from("evaluaciones_rm")
      .insert(evaluacionesPayload)
      .select("id, alumno_id");

    if (evaluacionError || !evaluacionesCreadas || evaluacionesCreadas.length === 0) {
      setGuardando(false);
      alert(evaluacionError?.message || "No se pudo crear la evaluación RM.");
      return;
    }

    const resultados = evaluacionesCreadas.flatMap((evaluacion) =>
      ejerciciosSeleccionados.map((item, index) => ({
        evaluacion_rm_id: evaluacion.id,
        ejercicio_id: item.ejercicio_id,
        orden: item.orden || index + 1,
        completado: false,
      }))
    );

    const { error: resultadosError } = await supabase
      .from("evaluaciones_rm_resultados")
      .insert(resultados);

    setGuardando(false);
    if (resultadosError) {
      alert(resultadosError.message);
      return;
    }

    localStorage.removeItem(DRAFT_KEY);

    if (momentoEvaluacion === "ahora" && tipoEvaluacion === "individual") {
      router.push(`/evaluaciones/realizar/rm/${evaluacionesCreadas[0].id}`);
      return;
    }

    setExito(true);
  }

  if (loading) {
    return <SkeletonEvaluaciones />;
  }

  if (exito) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">✅</p>
          <h2 className="text-2xl font-bold">{t("evaluaciones.exitoTitulo")}</h2>
          <p className="text-zinc-400 mt-2">
            {tipoEvaluacion === "grupal"
              ? t("evaluaciones.exitoGrupal", { count: alumnosIds.length })
              : t("evaluaciones.exitoIndividual")}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <a href="/evaluaciones/realizar?tipo=rm" className="bg-white text-zinc-950 font-semibold px-5 py-2 rounded-lg hover:bg-zinc-200 transition">
              {t("evaluaciones.irARealizar")}
            </a>
            <BackButton fallback="/evaluaciones" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-2xl mx-auto">

        <div className="mb-6">
          <BackButton fallback="/evaluaciones" />
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold">{t("evaluaciones.crearTitulo")}</h1>
          <p className="text-zinc-400 mt-2">
            {t("evaluaciones.crearDescripcion")}
          </p>
        </header>

        <div className="mb-6 rounded-xl border border-blue-900/50 bg-blue-950/20 p-4 text-sm text-blue-300">
          {t("evaluaciones.borradorInfo")}
        </div>

        <div className="space-y-6">
          {/* Tipo de evaluación */}
          <TipoEvaluacionSelector
            value={tipoEvaluacion}
            onChange={(tipo) => {
              setTipoEvaluacion(tipo);
              setAlumnoId("");
              setAlumnosIds([]);
            }}
          />

          {/* Alumno */}
          {!tipoEvaluacion && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
              {t("evaluaciones.primeroElegirTipo")}
            </div>
          )}

          {tipoEvaluacion === "individual" && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                {t("evaluaciones.alumnoLabel")}
              </label>
              <select
                value={alumnoId}
                onChange={(e) => setAlumnoId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="">{t("evaluaciones.seleccionarAlumno")}</option>
                {alumnos.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {tipoEvaluacion === "grupal" && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                {t("evaluaciones.alumnosLabel")}
              </label>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-2">
                {alumnos.map((a) => {
                  const seleccionado = alumnosIds.includes(a.id);

                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setAlumnosIds((prev) =>
                          prev.includes(a.id)
                            ? prev.filter((id) => id !== a.id)
                            : [...prev, a.id]
                        );
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                        seleccionado
                          ? "bg-white text-zinc-950 border-white"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      {a.nombre}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-zinc-500 mt-2">
                {alumnosIds.length === 0
                  ? t("evaluaciones.sinAlumnosSeleccionados")
                  : t("evaluaciones.alumnosSeleccionadosCount", { count: alumnosIds.length })}
              </p>
            </div>
          )}

          {tipoEvaluacion && !puedeMostrarFormulario && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
              {tipoEvaluacion === "grupal"
                ? t("evaluaciones.elegirAlumnos")
                : t("evaluaciones.elegirAlumnoMsg")}
            </div>
          )}

          {puedeMostrarFormulario && (
            <>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t("evaluaciones.fechaLabel")}</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Momento de evaluación */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t("evaluaciones.momentoLabel")}</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMomentoEvaluacion("ahora")}
                className={`text-left px-4 py-3 rounded-lg border text-sm transition ${
                  momentoEvaluacion === "ahora"
                    ? "bg-white text-zinc-950 border-white font-medium"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                <span className="block font-semibold">{t("evaluaciones.momentoAhora")}</span>
                <span className="block text-xs opacity-70 mt-1">{t("evaluaciones.momentoAhoraDesc")}</span>
              </button>

              <button
                type="button"
                onClick={() => setMomentoEvaluacion("profesor")}
                className={`text-left px-4 py-3 rounded-lg border text-sm transition ${
                  momentoEvaluacion === "profesor"
                    ? "bg-white text-zinc-950 border-white font-medium"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                <span className="block font-semibold">{t("evaluaciones.momentoDespues")}</span>
                <span className="block text-xs opacity-70 mt-1">{t("evaluaciones.momentoDespuesDesc")}</span>
              </button>

              <button
                type="button"
                onClick={() => setMomentoEvaluacion("alumno")}
                className={`text-left px-4 py-3 rounded-lg border text-sm transition ${
                  momentoEvaluacion === "alumno"
                    ? "bg-white text-zinc-950 border-white font-medium"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                <span className="block font-semibold">{t("evaluaciones.momentoAlumno")}</span>
                <span className="block text-xs opacity-70 mt-1">{t("evaluaciones.momentoAlumnoDesc")}</span>
              </button>
            </div>
          </div>

          {/* Ejercicios */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <label className="block text-sm font-medium text-zinc-400">
                {t("evaluaciones.ejerciciosLabel")}{" "}
                <span className="text-zinc-600 font-normal">{t("evaluaciones.ejerciciosSeleccionados", { count: ejerciciosSeleccionados.length })}</span>
              </label>
              <button
                type="button"
                onClick={abrirModalEjercicio}
                className="bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-emerald-600 transition text-sm"
              >
                {t("evaluaciones.agregarEjercicioBtn")}
              </button>
            </div>

            {ejerciciosSeleccionados.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-zinc-400 text-sm">
                {t("evaluaciones.sinEjerciciosEvaluacion")}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{t("evaluaciones.ordenEvaluacion")}</p>
                {ejerciciosSeleccionados.map((item) => {
                  const ejercicio = ejercicios.find((ej) => ej.id === item.ejercicio_id);
                  return (
                    <div
                      key={item.ejercicio_id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
                    >
                      <span className="text-sm text-zinc-300">
                        #{item.orden} {ejercicio ? campoBilingue(ejercicio, "nombre", idioma) : "Ejercicio"}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarEjercicioSeleccionado(item.ejercicio_id)}
                        className="text-red-400 hover:text-red-300 text-sm font-semibold"
                        title="Quitar ejercicio"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })}
                <p className="text-xs text-zinc-500">
                  {t("evaluaciones.ordenInfo")}
                </p>
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t("evaluaciones.notasLabel")}</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder={t("evaluaciones.notasPlaceholder")}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={guardar}
              disabled={!puedeMostrarFormulario || ejerciciosSeleccionados.length === 0 || guardando}
              className="bg-white text-zinc-950 font-semibold px-6 py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {guardando ? t("common.guardando") : t("evaluaciones.crearBtn")}
            </button>
            <BackButton fallback="/evaluaciones" />
          </div>
            </>
          )}
        </div>
      </div>
      {modalEjercicioAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">{t("evaluaciones.modalAgregarEjercicioTitulo")}</h2>
              <p className="text-zinc-400 text-sm mt-1">
                {t("evaluaciones.modalAgregarEjercicioDesc")}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  {t("evaluaciones.modalSeleccionarBanco")}
                </label>
                <select
                  value={ejercicioModalId}
                  onChange={(e) => setEjercicioModalId(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="">{t("evaluaciones.modalSeleccionarEjercicio")}</option>
                  {ejercicios.map((ejercicio) => {
                    const yaSeleccionado = ejerciciosSeleccionados.some(
                      (item) => item.ejercicio_id === ejercicio.id
                    );

                    return (
                      <option key={ejercicio.id} value={ejercicio.id} disabled={yaSeleccionado}>
                        {campoBilingue(ejercicio, "nombre", idioma)}{yaSeleccionado ? ` ${t("evaluaciones.modalYaAgregado")}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                type="button"
                onClick={verHistorialEjercicio}
                disabled={!ejercicioModalId || tipoEvaluacion !== "individual"}
                className="w-full border border-blue-700 text-blue-300 rounded-lg px-4 py-3 text-sm hover:bg-blue-950/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("evaluaciones.modalVerRM")}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                onClick={() => setModalEjercicioAbierto(false)}
                className="border border-zinc-700 text-zinc-300 font-semibold px-5 py-3 rounded-lg hover:bg-zinc-800 transition"
              >
                {t("common.cancelar")}
              </button>
              <button
                type="button"
                onClick={agregarEjercicioDesdeModal}
                disabled={!ejercicioModalId}
                className="bg-emerald-500 text-white font-semibold px-5 py-3 rounded-lg hover:bg-emerald-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("evaluaciones.modalGuardar")}
              </button>
            </div>
          </div>
        </div>
      )}
      {historialAbierto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {t("evaluaciones.modalRMTitulo", { nombre: historialEjercicioNombre })}
              </h2>
              <button
                type="button"
                onClick={() => setHistorialAbierto(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {historialLoading ? (
              <p className="text-zinc-400">{t("evaluaciones.modalRMCargando")}</p>
            ) : historialRMActual === null ? (
              <p className="text-zinc-400">
                {t("evaluaciones.modalRMSinRegistro")}
              </p>
            ) : (
              <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-5 text-center">
                <p className="text-sm text-emerald-300 mb-2">{t("evaluaciones.modalRMVigente")}</p>
                <p className="text-4xl font-bold text-white">{t("evaluaciones.modalRMValor", { valor: historialRMActual })}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

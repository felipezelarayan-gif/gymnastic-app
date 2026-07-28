"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import SkeletonEvaluaciones from "@/components/SkeletonEvaluaciones";
import TipoEvaluacionSelector from "@/components/TipoEvaluacionSelector";
import { useIdioma } from "@/lib/i18n-context";

type Alumno = { id: string; nombre: string; profesor_id?: string | null };
type TipoEvaluacion = "individual" | "grupal" | null;
type EvaluacionFMSDraft = {
  tipoEvaluacion?: TipoEvaluacion;
  alumnoId?: string;
  alumnosIds?: string[];
  fecha?: string;
  momentoEvaluacion?: "ahora" | "profesor" | "alumno";
  notas?: string;
  testsSeleccionados?: string[];
};

const DRAFT_KEY = "evaluacion_fms_crear_draft";

const TESTS_FMS = [
  "Sentadilla profunda",
  "Paso de valla",
  "Estocada en linea",
  "Movilidad de hombro",
  "Elevacion activa de pierna",
  "Estabilidad de tronco",
  "Estabilidad rotatoria",
];

export default function CrearEvaluacionFMS() {
  const router = useRouter();
  const { t } = useIdioma();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [tipoEvaluacion, setTipoEvaluacion] = useState<TipoEvaluacion>(null);
  const [alumnoId, setAlumnoId] = useState("");
  const [alumnosIds, setAlumnosIds] = useState<string[]>([]);
  const [fecha, setFecha] = useState("");
  const [momentoEvaluacion, setMomentoEvaluacion] = useState<"ahora" | "profesor" | "alumno">("profesor");
  const [notas, setNotas] = useState("");
  const [testsSeleccionados, setTestsSeleccionados] = useState<string[]>([...TESTS_FMS]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  // Restaurar borrador de localStorage después de la hidratación (solo cliente)
  useEffect(() => {
    const draft = (() => {
      try {
        const draftRaw = localStorage.getItem(DRAFT_KEY);
        return draftRaw ? (JSON.parse(draftRaw) as EvaluacionFMSDraft) : {};
      } catch (error) {
        console.error("No se pudo leer el borrador de evaluacion FMS", error);
        localStorage.removeItem(DRAFT_KEY);
        return {};
      }
    })();

    if (draft.tipoEvaluacion) setTipoEvaluacion(draft.tipoEvaluacion);
    if (draft.alumnoId) setAlumnoId(draft.alumnoId);
    if (Array.isArray(draft.alumnosIds)) setAlumnosIds(draft.alumnosIds);
    if (draft.fecha) setFecha(draft.fecha);
    if (draft.momentoEvaluacion) setMomentoEvaluacion(draft.momentoEvaluacion);
    if (typeof draft.notas === "string") setNotas(draft.notas);
    if (Array.isArray(draft.testsSeleccionados) && draft.testsSeleccionados.length > 0) {
      setTestsSeleccionados(draft.testsSeleccionados);
    }
    if (!draft.fecha) setFecha(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    async function cargarDatos() {
      const { data: sessionData } = await supabase.auth.getSession();
      const profesorActualId = sessionData.session?.user.id;

      if (!profesorActualId) {
        alert("No se pudo identificar al profesor. Volve a iniciar sesion.");
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("alumnos")
        .select("id, nombre, profesor_id")
        .eq("profesor_id", profesorActualId)
        .order("nombre");

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setAlumnos(data || []);
      setLoading(false);
    }

    cargarDatos();
  }, [router]);

  useEffect(() => {
    if (exito) return;

    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        tipoEvaluacion,
        alumnoId,
        alumnosIds,
        fecha,
        momentoEvaluacion,
        notas,
        testsSeleccionados,
      })
    );
  }, [exito, tipoEvaluacion, alumnoId, alumnosIds, fecha, momentoEvaluacion, notas, testsSeleccionados]);

  const puedeMostrarFormulario = Boolean(
    tipoEvaluacion &&
      ((tipoEvaluacion === "individual" && alumnoId) ||
        (tipoEvaluacion === "grupal" && alumnosIds.length > 0))
  );

  async function guardar() {
    const alumnosParaEvaluar =
      tipoEvaluacion === "individual" ? [alumnoId].filter(Boolean) : alumnosIds;

    if (testsSeleccionados.length === 0) {
      alert("Selecciona al menos un test FMS.");
      return;
    }

    if (alumnosParaEvaluar.length === 0) return;

    setGuardando(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setGuardando(false);
      alert("No se pudo identificar al profesor. Volve a iniciar sesion.");
      return;
    }

    const alumnosPropiosIds = new Set(
      alumnos
        .filter((alumno) => alumno.profesor_id === userId)
        .map((alumno) => alumno.id)
    );

    if (!alumnosParaEvaluar.every((id) => alumnosPropiosIds.has(id))) {
      setGuardando(false);
      alert("Hay alumnos seleccionados que no pertenecen a este profesor.");
      return;
    }

    const fechaAsignacion = fecha || new Date().toISOString().split("T")[0];
    const puedeCargarAlumno = momentoEvaluacion === "alumno";

    const evaluacionesPayload = alumnosParaEvaluar.map((id) => ({
      alumno_id: id,
      profesor_id: userId,
      estado: "pendiente",
      asignada_al_alumno: puedeCargarAlumno,
      puede_cargar_alumno: puedeCargarAlumno,
      permitir_carga_alumno: puedeCargarAlumno,
      fecha_asignacion: fechaAsignacion,
      fecha_realizacion: null,
      puntaje_total: 0,
      hay_dolor: false,
      hay_asimetrias: false,
      cerrada_incompleta: false,
      observaciones: notas || null,
    }));

    const { data: evaluacionesCreadas, error: evaluacionError } = await supabase
      .from("evaluaciones_fms")
      .insert(evaluacionesPayload)
      .select("id, alumno_id");

    if (evaluacionError || !evaluacionesCreadas || evaluacionesCreadas.length === 0) {
      setGuardando(false);
      alert(evaluacionError?.message || "No se pudo crear la evaluacion FMS.");
      return;
    }

    const tests = evaluacionesCreadas.flatMap((evaluacion) =>
      testsSeleccionados.map((testNombre) => ({
        evaluacion_fms_id: evaluacion.id,
        test_nombre: testNombre,
        asignado: true,
        completado: false,
      }))
    );

    const { error: testsError } = await supabase
      .from("evaluaciones_fms_tests")
      .insert(tests);

    setGuardando(false);

    if (testsError) {
      alert(testsError.message);
      return;
    }

    localStorage.removeItem(DRAFT_KEY);

    if (momentoEvaluacion === "ahora" && tipoEvaluacion === "individual") {
      router.push(`/evaluaciones/realizar/fms/${evaluacionesCreadas[0].id}`);
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
          <p className="text-4xl mb-4">OK</p>
          <h2 className="text-2xl font-bold">Evaluacion FMS creada</h2>
          <p className="text-zinc-400 mt-2">
            {tipoEvaluacion === "grupal"
              ? `Se crearon ${alumnosIds.length} evaluaciones FMS individuales.`
              : "La evaluacion FMS quedo creada correctamente."}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Link href="/evaluaciones/realizar?tipo=fms" className="bg-white text-zinc-950 font-semibold px-5 py-2 rounded-lg hover:bg-zinc-200 transition">
              Ir a realizar FMS
            </Link>
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
          <h1 className="text-3xl font-bold">Crear Test FMS</h1>
          <p className="text-zinc-400 mt-2">
            Programa una evaluacion de movimiento funcional individual o grupal.
          </p>
        </header>

        <div className="mb-6 rounded-xl border border-blue-900/50 bg-blue-950/20 p-4 text-sm text-blue-300">
          Esta evaluacion se guarda como borrador local en este dispositivo hasta que la crees.
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 mb-8">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Tests a incluir
          </h3>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setTestsSeleccionados([...TESTS_FMS])}
              className="border border-zinc-700 text-zinc-300 px-3 py-1 rounded-lg hover:bg-zinc-800 transition text-xs"
            >
              Seleccionar todos
            </button>
            <button
              type="button"
              onClick={() => setTestsSeleccionados([])}
              className="border border-zinc-700 text-zinc-300 px-3 py-1 rounded-lg hover:bg-zinc-800 transition text-xs"
            >
              Limpiar selección
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {TESTS_FMS.map((test, index) => {
              const seleccionado = testsSeleccionados.includes(test);
              return (
                <button
                  key={test}
                  type="button"
                  onClick={() =>
                    setTestsSeleccionados((prev) =>
                      prev.includes(test)
                        ? prev.filter((t) => t !== test)
                        : [...prev, test]
                    )
                  }
                  className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg border transition ${
                    seleccionado
                      ? "bg-white text-zinc-950 border-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  <span className="text-zinc-600">{index + 1}.</span> {test}
                </button>
              );
            })}
          </div>
          <p className="text-zinc-500 text-xs mt-3">
            {testsSeleccionados.length} de {TESTS_FMS.length} tests incluidos. Cada test se puntúa de 0 a 3. Máximo: 21 puntos.
          </p>
        </div>

        <div className="space-y-6">
          <TipoEvaluacionSelector
            value={tipoEvaluacion}
            onChange={(tipo) => {
              setTipoEvaluacion(tipo);
              setAlumnoId("");
              setAlumnosIds([]);
            }}
          />

          {!tipoEvaluacion && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
              Primero elegi si queres crear una evaluacion individual o grupal.
            </div>
          )}

          {tipoEvaluacion === "individual" && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Alumno *</label>
              <select
                value={alumnoId}
                onChange={(e) => setAlumnoId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="">Selecciona un alumno</option>
                {alumnos.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {tipoEvaluacion === "grupal" && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Alumnos *</label>
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
                  ? "No hay alumnos seleccionados."
                  : `${alumnosIds.length} alumno(s) seleccionados.`}
              </p>
            </div>
          )}

          {tipoEvaluacion && !puedeMostrarFormulario && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
              {tipoEvaluacion === "grupal"
                ? "Elegi uno o mas alumnos para continuar."
                : "Elegi un alumno para continuar."}
            </div>
          )}

          {puedeMostrarFormulario && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Fecha *</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Momento de evaluacion *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { key: "ahora", titulo: "Ahora", desc: "Guardar y realizar" },
                    { key: "profesor", titulo: "Mas tarde", desc: "Por profesor" },
                    { key: "alumno", titulo: "Alumno", desc: "Carga mas tarde" },
                  ].map((opcion) => (
                    <button
                      key={opcion.key}
                      type="button"
                      onClick={() => setMomentoEvaluacion(opcion.key as "ahora" | "profesor" | "alumno")}
                      className={`text-left px-4 py-3 rounded-lg border text-sm transition ${
                        momentoEvaluacion === opcion.key
                          ? "bg-white text-zinc-950 border-white font-medium"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      <span className="block font-semibold">{opcion.titulo}</span>
                      <span className="block text-xs opacity-70 mt-1">{opcion.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Notas (opcional)</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Contexto, lesiones previas, condiciones a tener en cuenta..."
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={guardar}
                  disabled={guardando}
                  className="bg-white text-zinc-950 font-semibold px-6 py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {guardando ? "Guardando..." : "Crear evaluacion"}
                </button>
                <BackButton fallback="/evaluaciones" />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

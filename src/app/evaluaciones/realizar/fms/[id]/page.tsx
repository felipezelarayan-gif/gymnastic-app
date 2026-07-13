"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import SkeletonEvaluaciones from "@/components/SkeletonEvaluaciones";
import FMSInfoModal from "@/components/fms/FMSInfoModal";
import { formatearFechaCorta } from "@/lib/utils/formatearFecha";

type EvaluacionFMS = {
  id: string;
  alumno_id: string;
  profesor_id?: string | null;
  estado?: string | null;
  fecha_asignacion: string | null;
  fecha_realizacion: string | null;
  observaciones: string | null;
};

type Alumno = {
  id: string;
  nombre: string;
  profesor_id?: string | null;
};

type TestFMS = {
  id: string;
  evaluacion_fms_id: string;
  test_nombre: string;
  asignado: boolean;
  completado: boolean;
  puntaje: number | null;
  puntaje_derecho: number | null;
  puntaje_izquierdo: number | null;
  dolor: boolean;
  asimetria: boolean;
  observaciones: string | null;
};

const PUNTAJE_LABELS: Record<number, string> = {
  0: "Dolor",
  1: "No pudo",
  2: "Compensa",
  3: "Correcto",
};

const PUNTAJE_COLORS: Record<number, string> = {
  0: "bg-red-900/40 border-red-700 text-red-400",
  1: "bg-orange-900/40 border-orange-700 text-orange-400",
  2: "bg-yellow-900/40 border-yellow-700 text-yellow-400",
  3: "bg-emerald-900/40 border-emerald-700 text-emerald-400",
};

const TESTS_BILATERALES = [
  "Paso de valla",
  "Estocada en linea",
  "Movilidad de hombro",
  "Elevacion activa de pierna",
  "Estabilidad rotatoria",
];

function normalizarTexto(valor: string) {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function esTestBilateral(testNombre: string) {
  const nombreNormalizado = normalizarTexto(testNombre);

  return TESTS_BILATERALES.some((test) =>
    nombreNormalizado.includes(normalizarTexto(test))
  );
}

function calcularPuntajeBilateral(derecho: number | null, izquierdo: number | null) {
  if (derecho === null || izquierdo === null) return null;
  return Math.min(derecho, izquierdo);
}

function totalLabel(total: number, maximo: number) {
  if (maximo <= 0) return "Sin tests cargados";

  const porcentaje = (total / maximo) * 100;

  if (porcentaje <= 25) return "Alto riesgo de lesion";
  if (porcentaje <= 50) return "Disfunciones a trabajar";
  if (porcentaje <= 75) return "Compensaciones a trabajar";
  if (porcentaje < 100) return "Adecuado, pero mejorable";
  return "Movimiento funcional adecuado";
}

function totalColor(total: number, maximo: number) {
  if (maximo <= 0) return "text-zinc-400";

  const porcentaje = (total / maximo) * 100;

  if (porcentaje <= 25) return "text-red-400";
  if (porcentaje <= 50) return "text-orange-400";
  if (porcentaje <= 75) return "text-yellow-400";
  return "text-emerald-400";
}

export default function RealizarEvaluacionFMSDetalle() {
  const params = useParams();
  const evaluacionId = String(params.id || "");

  const [loading, setLoading] = useState(true);
  const [evaluacion, setEvaluacion] = useState<EvaluacionFMS | null>(null);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [tests, setTests] = useState<TestFMS[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [profesorId, setProfesorId] = useState<string | null>(null);
  const [testInfoAbierto, setTestInfoAbierto] = useState<string | null>(null);

  useEffect(() => {
    async function cargarEvaluacion() {
      if (!evaluacionId) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const profesorActualId = sessionData.session?.user.id;

      if (!profesorActualId) {
        alert("No se pudo identificar al profesor. Volve a iniciar sesion.");
        window.location.href = "/login";
        return;
      }

      setProfesorId(profesorActualId);

      const { data: evaluacionData, error: evaluacionError } = await supabase
        .from("evaluaciones_fms")
        .select("id, alumno_id, profesor_id, estado, fecha_asignacion, fecha_realizacion, observaciones")
        .eq("id", evaluacionId)
        .eq("profesor_id", profesorActualId)
        .single();

      if (evaluacionError || !evaluacionData) {
        alert(evaluacionError?.message || "No se pudo cargar la evaluacion FMS.");
        setLoading(false);
        return;
      }

      const [{ data: alumnoData, error: alumnoError }, { data: testsData, error: testsError }] = await Promise.all([
        supabase
          .from("alumnos")
          .select("id, nombre, profesor_id")
          .eq("id", evaluacionData.alumno_id)
          .eq("profesor_id", profesorActualId)
          .single(),
        supabase
          .from("evaluaciones_fms_tests")
          .select("id, evaluacion_fms_id, test_nombre, asignado, completado, puntaje, puntaje_derecho, puntaje_izquierdo, dolor, asimetria, observaciones")
          .eq("evaluacion_fms_id", evaluacionId)
          .order("created_at", { ascending: true }),
      ]);

      if (alumnoError) {
        alert(alumnoError.message);
        setLoading(false);
        return;
      }

      if (testsError) {
        alert(testsError.message);
        setLoading(false);
        return;
      }

      setEvaluacion(evaluacionData);
      setAlumno(alumnoData);
      setTests((testsData || []) as TestFMS[]);
      setLoading(false);
    }

    cargarEvaluacion();
  }, [evaluacionId]);

  async function validarEvaluacionPropia() {
    if (!evaluacion || !profesorId) {
      alert("No se pudo validar la evaluacion actual.");
      return false;
    }

    const { data: evaluacionPropia, error } = await supabase
      .from("evaluaciones_fms")
      .select("id, alumno_id, profesor_id, estado")
      .eq("id", evaluacion.id)
      .eq("profesor_id", profesorId)
      .maybeSingle();

    if (error) {
      alert(error.message);
      return false;
    }

    if (!evaluacionPropia) {
      alert("No tenes permiso para modificar esta evaluacion.");
      return false;
    }

    if (evaluacionPropia.alumno_id !== evaluacion.alumno_id) {
      alert("La evaluacion no coincide con el alumno cargado.");
      return false;
    }

    return true;
  }

  function setPuntaje(testId: string, valor: number) {
    setTests((prev) =>
      prev.map((test) => {
        if (test.id !== testId) return test;

        const nuevoPuntaje = test.puntaje === valor ? null : valor;

        return {
          ...test,
          puntaje: nuevoPuntaje,
          dolor: nuevoPuntaje === 0,
          asimetria: false,
          completado: nuevoPuntaje !== null,
        };
      })
    );
  }

  function setPuntajeLado(testId: string, lado: "derecho" | "izquierdo", valor: number) {
    setTests((prev) =>
      prev.map((test) => {
        if (test.id !== testId) return test;

        const campo = lado === "derecho" ? "puntaje_derecho" : "puntaje_izquierdo";
        const puntajeLadoActual = test[campo];
        const nuevoPuntajeLado = puntajeLadoActual === valor ? null : valor;
        const nuevoDerecho = lado === "derecho" ? nuevoPuntajeLado : test.puntaje_derecho;
        const nuevoIzquierdo = lado === "izquierdo" ? nuevoPuntajeLado : test.puntaje_izquierdo;
        const nuevoPuntaje = calcularPuntajeBilateral(nuevoDerecho, nuevoIzquierdo);

        return {
          ...test,
          [campo]: nuevoPuntajeLado,
          puntaje: nuevoPuntaje,
          dolor: nuevoDerecho === 0 || nuevoIzquierdo === 0,
          asimetria:
            nuevoDerecho !== null && nuevoIzquierdo !== null
              ? nuevoDerecho !== nuevoIzquierdo
              : false,
          completado: nuevoPuntaje !== null,
        };
      })
    );
  }


  function actualizarObservaciones(testId: string, valor: string) {
    setTests((prev) =>
      prev.map((test) =>
        test.id === testId ? { ...test, observaciones: valor } : test
      )
    );
  }

  const valoresCompletos = tests.length > 0 && tests.every((test) => test.puntaje !== null);
  const total = valoresCompletos
    ? tests.reduce((sum, test) => sum + (test.puntaje ?? 0), 0)
    : null;
  const completados = tests.filter((test) => test.puntaje !== null).length;
  const hayDolor = tests.some((test) => test.dolor || test.puntaje === 0);
  const hayAsimetrias = tests.some((test) => test.asimetria);
  const puntajeMaximo = tests.length * 3;

  async function guardarEvaluacion() {
    if (guardando || !evaluacion || total === null) return;

    if (!valoresCompletos) {
      alert("Completa el puntaje de todos los tests FMS.");
      return;
    }

    setGuardando(true);

    const evaluacionValida = await validarEvaluacionPropia();
    if (!evaluacionValida) {
      setGuardando(false);
      return;
    }

    for (const test of tests) {
      const { error: testError } = await supabase
        .from("evaluaciones_fms_tests")
        .update({
          puntaje: test.puntaje,
          puntaje_derecho: test.puntaje_derecho,
          puntaje_izquierdo: test.puntaje_izquierdo,
          dolor: test.puntaje_derecho === 0 || test.puntaje_izquierdo === 0 || test.puntaje === 0,
          asimetria:
            test.puntaje_derecho !== null && test.puntaje_izquierdo !== null
              ? test.puntaje_derecho !== test.puntaje_izquierdo
              : false,
          observaciones: test.observaciones || null,
          completado: test.puntaje !== null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", test.id)
        .eq("evaluacion_fms_id", evaluacion.id);

      if (testError) {
        setGuardando(false);
        alert(testError.message);
        return;
      }
    }

    const { error: evaluacionError } = await supabase
      .from("evaluaciones_fms")
      .update({
        estado: "cargado",
        fecha_realizacion: evaluacion.fecha_realizacion || new Date().toISOString(),
        puntaje_total: total,
        hay_dolor: hayDolor,
        hay_asimetrias: hayAsimetrias,
        updated_at: new Date().toISOString(),
      })
      .eq("id", evaluacion.id)
      .eq("profesor_id", profesorId);

    setGuardando(false);

    if (evaluacionError) {
      alert(evaluacionError.message);
      return;
    }

    setExito(true);
  }

  if (loading) {
    return <SkeletonEvaluaciones />;
  }

  if (!evaluacion) {
    return <main className="min-h-screen bg-zinc-950 text-white p-8">No se encontro la evaluacion FMS.</main>;
  }

  if (exito) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">OK</p>
          <h2 className="text-2xl font-bold">Evaluacion FMS guardada</h2>
          {total !== null && (
            <p className={`text-xl font-bold mt-1 ${totalColor(total, puntajeMaximo)}`}>
              {total}/{puntajeMaximo} - {totalLabel(total, puntajeMaximo)}
            </p>
          )}
          <BackButton fallback="/evaluaciones/realizar?tipo=fms" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <BackButton fallback="/evaluaciones/realizar/fms" />
        </div>

        <header className="mb-8">
          <p className="text-sm text-zinc-500 mb-2">Evaluacion FMS</p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{alumno?.nombre || "Alumno"}</h1>
              <p className="text-zinc-400 mt-2">Fecha a realizar: {formatearFechaCorta(evaluacion.fecha_asignacion) || "Sin fecha"}</p>
              {evaluacion.observaciones && <p className="text-zinc-500 mt-2">{evaluacion.observaciones}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold">{completados}/{tests.length}</p>
              <p className="text-xs text-zinc-500">completados</p>
            </div>
          </div>

          <div className="mt-4 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${tests.length > 0 ? (completados / tests.length) * 100 : 0}%` }}
            />
          </div>
        </header>

        <div className="space-y-4">
          {tests.map((test, index) => {
            const puntajeActual = test.puntaje;
            const bilateral = esTestBilateral(test.test_nombre);

            return (
              <div key={test.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
  <p className="text-xs text-zinc-500 mb-0.5">Patron {index + 1}</p>
  <div className="flex items-center gap-2">
    <h3 className="font-semibold text-white">{test.test_nombre}</h3>
      <button
        type="button"
        onClick={() => setTestInfoAbierto(test.test_nombre)}
        className="rounded-md border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-white transition"
        aria-label={`Ver guia de ${test.test_nombre}`}
      >
        Ver guía
      </button>
  </div>
</div>
                  {puntajeActual !== null && (
                    <span className={`ml-4 shrink-0 text-sm font-bold px-3 py-1 rounded-full border ${PUNTAJE_COLORS[puntajeActual]}`}>
                      {puntajeActual}
                    </span>
                  )}
                </div>

                {bilateral ? (
                  <div className="space-y-3">
                    {([
                      ["derecho", "Derecho", test.puntaje_derecho],
                      ["izquierdo", "Izquierdo", test.puntaje_izquierdo],
                    ] as const).map(([lado, label, puntajeLado]) => (
                      <div key={lado}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                          Lado {label}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {[0, 1, 2, 3].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setPuntajeLado(test.id, lado, val)}
                              className={`py-2.5 rounded-lg border text-sm font-medium transition ${
                                puntajeLado === val
                                  ? PUNTAJE_COLORS[val]
                                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                              }`}
                            >
                              <span className="block text-lg leading-none">{val}</span>
                              <span className="block text-[10px] mt-0.5 opacity-70">{PUNTAJE_LABELS[val]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-zinc-500">
                      Puntaje del patron: {puntajeActual ?? "sin completar"} {puntajeActual !== null ? "(menor lado)" : ""}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPuntaje(test.id, val)}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition ${
                          puntajeActual === val
                            ? PUNTAJE_COLORS[val]
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                        }`}
                      >
                        <span className="block text-lg leading-none">{val}</span>
                        <span className="block text-[10px] mt-0.5 opacity-70">{PUNTAJE_LABELS[val]}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {(test.dolor || test.puntaje === 0) && (
                    <span className="px-3 py-1 rounded-full bg-red-900/40 border border-red-700 text-red-300 text-xs font-medium">
                      Dolor detectado
                    </span>
                  )}

                  {test.asimetria && (
                    <span className="px-3 py-1 rounded-full bg-yellow-900/40 border border-yellow-700 text-yellow-300 text-xs font-medium">
                      Asimetría detectada
                    </span>
                  )}
                </div>

                <textarea
                  value={test.observaciones || ""}
                  onChange={(e) => actualizarObservaciones(test.id, e.target.value)}
                  placeholder="Observaciones del patron..."
                  rows={2}
                  className="mt-3 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>
            );
          })}
        </div>

        {total !== null && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">Puntaje total</p>
            <p className={`text-5xl font-bold ${totalColor(total, puntajeMaximo)}`}>{total}<span className="text-2xl text-zinc-600">/{puntajeMaximo}</span></p>
            <p className={`mt-2 text-sm font-medium ${totalColor(total, puntajeMaximo)}`}>{totalLabel(total, puntajeMaximo)}</p>
            {(hayDolor || hayAsimetrias) && (
              <div className="mt-4 space-y-2">
                {hayDolor && (
                  <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-left">
                    <p className="text-sm font-semibold text-red-300">Alerta: dolor registrado</p>
                    <p className="text-xs text-red-200/80 mt-1">
                      Hay al menos un patron con dolor. Revisar antes de interpretar el puntaje total.
                    </p>
                  </div>
                )}

                {hayAsimetrias && (
                  <div className="rounded-lg border border-yellow-700 bg-yellow-900/30 px-4 py-3 text-left">
                    <p className="text-sm font-semibold text-yellow-300">Asimetrias registradas</p>
                    <p className="text-xs text-yellow-200/80 mt-1">
                      Hay diferencias entre lado derecho e izquierdo en al menos un patron bilateral.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-6">
          <button
            onClick={guardarEvaluacion}
            disabled={!valoresCompletos || guardando}
            className="bg-white text-zinc-950 font-semibold px-6 py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando..." : "Guardar evaluacion"}
          </button>
          <BackButton fallback="/evaluaciones/realizar/fms" />
        </div>
      </div>

      <FMSInfoModal
        abierto={testInfoAbierto !== null}
        onClose={() => setTestInfoAbierto(null)}
        testNombre={testInfoAbierto || ""}
        tipo="profesor"
      />
    </main>
  );
}

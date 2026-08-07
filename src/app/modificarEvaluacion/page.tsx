"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { recalcularRMActual } from "@/lib/recalcularRMActual";
import BackButton from "@/components/BackButton";
import { useIdioma } from "@/lib/i18n-context";

type ResultadoRM = {
  id: string;
  ejercicio_id: string;
  ejercicio: string;
  peso_usado: number | null;
  repeticiones: number | null;
  rm_final: number | null;
};

type ResultadoFMS = {
  id: string;
  test_nombre: string;
  puntaje: number | null;
  puntaje_derecho: number | null;
  puntaje_izquierdo: number | null;
  observaciones: string | null;
};

const PUNTAJE_COLORS: Record<number, string> = {
  0: "bg-red-900/40 border-red-700 text-red-400",
  1: "bg-orange-900/40 border-orange-700 text-orange-400",
  2: "bg-yellow-900/40 border-yellow-700 text-yellow-400",
  3: "bg-emerald-900/40 border-emerald-700 text-emerald-400",
};

function calcularRMEpley(peso: number | null, repeticiones: number | null) {
  if (!peso || !repeticiones) return null;
  if (repeticiones === 1) return Number(peso.toFixed(2));
  return Number((peso * (1 + repeticiones / 30)).toFixed(2));
}

function ModificarEvaluacionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const evaluacionId = searchParams.get("evaluacionId") || "";
  const subtipo = (searchParams.get("subtipo") as "rm" | "fms") || "rm";
  const { t } = useIdioma();

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alumnoId, setAlumnoId] = useState<string>("");
  const [resultadosRM, setResultadosRM] = useState<ResultadoRM[]>([]);
  const [resultadosFMS, setResultadosFMS] = useState<ResultadoFMS[]>([]);

  // Estados de edición RM
  const [editPeso, setEditPeso] = useState<Record<string, string>>({});
  const [editReps, setEditReps] = useState<Record<string, string>>({});

  // Estados de edición FMS
  const [editPuntaje, setEditPuntaje] = useState<Record<string, number | null>>({});
  const [editPuntajeD, setEditPuntajeD] = useState<Record<string, number | null>>({});
  const [editPuntajeI, setEditPuntajeI] = useState<Record<string, number | null>>({});
  const [editObs, setEditObs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!evaluacionId) {
      setError("Falta el ID de la evaluación.");
      setLoading(false);
      return;
    }
    cargarEvaluacion();
  }, [evaluacionId, subtipo]);

  async function cargarEvaluacion() {
    setLoading(true);
    setError(null);

    try {
      if (subtipo === "rm") {
        const { data, error: evalError } = await supabase
          .from("evaluaciones_rm")
          .select("id, alumno_id, nombre, estado")
          .eq("id", evaluacionId)
          .single();

        if (evalError || !data) {
          setError("No se pudo cargar la evaluación RM.");
          setLoading(false);
          return;
        }

        setAlumnoId(data.alumno_id);

        const { data: resultadosData, error: resultadosError } = await supabase
          .from("evaluaciones_rm_resultados")
          .select("id, ejercicio_id, peso_usado, repeticiones, rm_final, ejercicio:ejercicios(nombre)")
          .eq("evaluacion_rm_id", evaluacionId)
          .order("orden", { ascending: true });

        if (resultadosError) {
          setError(resultadosError.message);
          setLoading(false);
          return;
        }

        const resultados: ResultadoRM[] = (resultadosData || []).map((r: any) => ({
          id: r.id,
          ejercicio_id: r.ejercicio_id,
          ejercicio: r.ejercicio?.nombre || "Ejercicio",
          peso_usado: r.peso_usado,
          repeticiones: r.repeticiones,
          rm_final: r.rm_final,
        }));

        setResultadosRM(resultados);

        const pesos: Record<string, string> = {};
        const reps: Record<string, string> = {};
        resultados.forEach((r) => {
          pesos[r.id] = r.peso_usado?.toString() || "";
          reps[r.id] = r.repeticiones?.toString() || "";
        });
        setEditPeso(pesos);
        setEditReps(reps);
      } else {
        const { data, error: evalError } = await supabase
          .from("evaluaciones_fms")
          .select("id, alumno_id, estado")
          .eq("id", evaluacionId)
          .single();

        if (evalError || !data) {
          setError("No se pudo cargar la evaluación FMS.");
          setLoading(false);
          return;
        }

        setAlumnoId(data.alumno_id);

        const { data: testsData, error: testsError } = await supabase
          .from("evaluaciones_fms_tests")
          .select("id, test_nombre, puntaje, puntaje_derecho, puntaje_izquierdo, observaciones")
          .eq("evaluacion_fms_id", evaluacionId)
          .order("created_at", { ascending: true });

        if (testsError) {
          setError(testsError.message);
          setLoading(false);
          return;
        }

        const tests: ResultadoFMS[] = (testsData || []).map((t: any) => ({
          id: t.id,
          test_nombre: t.test_nombre,
          puntaje: t.puntaje,
          puntaje_derecho: t.puntaje_derecho,
          puntaje_izquierdo: t.puntaje_izquierdo,
          observaciones: t.observaciones,
        }));

        setResultadosFMS(tests);

        const puntajes: Record<string, number | null> = {};
        const puntajesD: Record<string, number | null> = {};
        const puntajesI: Record<string, number | null> = {};
        const obs: Record<string, string> = {};
        tests.forEach((t) => {
          puntajes[t.id] = t.puntaje;
          puntajesD[t.id] = t.puntaje_derecho;
          puntajesI[t.id] = t.puntaje_izquierdo;
          obs[t.id] = t.observaciones || "";
        });
        setEditPuntaje(puntajes);
        setEditPuntajeD(puntajesD);
        setEditPuntajeI(puntajesI);
        setEditObs(obs);
      }
    } catch (e) {
      setError("Error inesperado al cargar la evaluación.");
    } finally {
      setLoading(false);
    }
  }

  function calcularRMFinal(peso: string, reps: string): number | null {
    const pesoNum = peso === "" ? null : Number(peso);
    const repsNum = reps === "" ? null : Number(reps);
    return calcularRMEpley(pesoNum, repsNum);
  }

  async function guardarCambios() {
    setGuardando(true);
    setError(null);

    try {
      if (subtipo === "rm") {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id ?? null;

        for (const resultado of resultadosRM) {
          const peso = editPeso[resultado.id] === "" ? null : Number(editPeso[resultado.id]);
          const reps = editReps[resultado.id] === "" ? null : Number(editReps[resultado.id]);
          const rmFinal = calcularRMFinal(editPeso[resultado.id] || "", editReps[resultado.id] || "");

          const { error: resultadoError } = await supabase
            .from("evaluaciones_rm_resultados")
            .update({
              peso_usado: peso,
              repeticiones: reps,
              rm_final: rmFinal,
              rm_estimado: rmFinal,
              metodo: reps === 1 ? "directo" : "indirecto",
              completado: true,
              actualizado_en: new Date().toISOString(),
            })
            .eq("id", resultado.id)
            .eq("evaluacion_rm_id", evaluacionId);

          if (resultadoError) throw resultadoError;

          // Actualizar historial
          const { data: historialExistente } = await supabase
            .from("rms_historial")
            .select("id")
            .eq("evaluacion_rm_id", evaluacionId)
            .eq("evaluacion_rm_resultado_id", resultado.id)
            .maybeSingle();

          const historialPayload = {
            alumno_id: alumnoId,
            ejercicio_id: resultado.ejercicio_id,
            peso_kg: peso,
            repeticiones: reps,
            rm_calculado: rmFinal,
            fecha: new Date().toISOString(),
            registrado_por: userId,
            origen: "evaluacion_rm",
            evaluacion_rm_id: evaluacionId,
            evaluacion_rm_resultado_id: resultado.id,
          };

          const historialResponse = historialExistente?.id
            ? await supabase.from("rms_historial").update(historialPayload).eq("id", historialExistente.id)
            : await supabase.from("rms_historial").insert(historialPayload);

          if (historialResponse.error) throw historialResponse.error;
        }

        // Recalcular RM actuales
        console.log("🧮 Recalculando RM actuales para alumno:", alumnoId);
        for (const resultado of resultadosRM) {
          console.log(`   → Ejercicio: ${resultado.ejercicio} (id: ${resultado.ejercicio_id})`);
          try {
            await recalcularRMActual({
              alumnoId,
              ejercicioId: resultado.ejercicio_id,
            });
            console.log(`   ✅ RM recalculado para ${resultado.ejercicio}`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Error desconocido";
            console.error(`   ❌ Error recalculando RM para ${resultado.ejercicio}:`, msg);
            throw new Error(`No se pudo recalcular el RM de "${resultado.ejercicio}": ${msg}`);
          }
        }
      } else {
        // FMS
        for (const test of resultadosFMS) {
          const puntaje = editPuntaje[test.id] ?? null;
          const puntajeD = editPuntajeD[test.id] ?? null;
          const puntajeI = editPuntajeI[test.id] ?? null;
          const observaciones = editObs[test.id] || null;

          const { error: testError } = await supabase
            .from("evaluaciones_fms_tests")
            .update({
              puntaje,
              puntaje_derecho: puntajeD,
              puntaje_izquierdo: puntajeI,
              dolor: puntajeD === 0 || puntajeI === 0 || puntaje === 0,
              asimetria: puntajeD !== null && puntajeI !== null ? puntajeD !== puntajeI : false,
              observaciones,
              completado: puntaje !== null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", test.id)
            .eq("evaluacion_fms_id", evaluacionId);

          if (testError) throw testError;
        }

        // Actualizar total FMS
        const testsActualizados = resultadosFMS.map((t) => ({
          ...t,
          puntaje: editPuntaje[t.id] ?? t.puntaje,
        }));
        const total = testsActualizados.reduce((sum, t) => sum + (t.puntaje ?? 0), 0);
        const hayDolor = testsActualizados.some((t) => t.puntaje === 0);

        const { error: fmsError } = await supabase
          .from("evaluaciones_fms")
          .update({
            puntaje_total: total,
            hay_dolor: hayDolor,
            updated_at: new Date().toISOString(),
          })
          .eq("id", evaluacionId);

        if (fmsError) throw fmsError;
      }

      console.log("✅ Evaluación modificada correctamente");
      router.back();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      console.error("❌ Error guardando:", msg);
      setError(msg);
    } finally {
      setGuardando(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-zinc-400">Cargando evaluación...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <BackButton fallback="/home" />
          <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-5">
            <p className="text-red-300 font-semibold">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-5">
        <BackButton fallback="/home" />

        <header>
          <p className="text-sm text-zinc-500">Profesor</p>
          <h1 className="text-3xl font-bold">
            Modificar {subtipo === "rm" ? "Evaluación RM" : "Evaluación FMS"}
          </h1>
          <p className="text-zinc-400 mt-2">
            Editá los resultados y guardá los cambios.
          </p>
        </header>

        {subtipo === "rm" ? (
          <section className="space-y-4">
            {resultadosRM.length === 0 ? (
              <p className="text-zinc-400">Sin ejercicios cargados.</p>
            ) : (
              resultadosRM.map((r) => {
                const rmFinal = calcularRMFinal(editPeso[r.id] || "", editReps[r.id] || "");
                return (
                  <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="font-semibold text-zinc-200 mb-3">{r.ejercicio}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Peso (kg)</label>
                        <input
                          type="number"
                          placeholder="kg"
                          value={editPeso[r.id] || ""}
                          onChange={(e) => setEditPeso((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Repeticiones</label>
                        <input
                          type="number"
                          placeholder="reps"
                          value={editReps[r.id] || ""}
                          onChange={(e) => setEditReps((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    {rmFinal !== null && (
                      <p className="mt-2 text-sm text-emerald-400 font-semibold">
                        RM calculado: {rmFinal} kg
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </section>
        ) : (
          <section className="space-y-4">
            {resultadosFMS.length === 0 ? (
              <p className="text-zinc-400">Sin tests cargados.</p>
            ) : (
              resultadosFMS.map((t) => {
                const esBilateral = t.puntaje_derecho !== null || t.puntaje_izquierdo !== null;
                return (
                  <div key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="font-semibold text-zinc-200 mb-3">{t.test_nombre}</p>

                    {esBilateral ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-zinc-500 mb-2">Derecho</p>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3].map((valor) => (
                              <button
                                key={valor}
                                type="button"
                                onClick={() =>
                                  setEditPuntajeD((prev) => ({
                                    ...prev,
                                    [t.id]: prev[t.id] === valor ? null : valor,
                                  }))
                                }
                                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                                  editPuntajeD[t.id] === valor
                                    ? PUNTAJE_COLORS[valor]
                                    : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                                }`}
                              >
                                {valor}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 mb-2">Izquierdo</p>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3].map((valor) => (
                              <button
                                key={valor}
                                type="button"
                                onClick={() =>
                                  setEditPuntajeI((prev) => ({
                                    ...prev,
                                    [t.id]: prev[t.id] === valor ? null : valor,
                                  }))
                                }
                                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                                  editPuntajeI[t.id] === valor
                                    ? PUNTAJE_COLORS[valor]
                                    : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                                }`}
                              >
                                {valor}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {[0, 1, 2, 3].map((valor) => (
                          <button
                            key={valor}
                            type="button"
                            onClick={() =>
                              setEditPuntaje((prev) => ({
                                ...prev,
                                [t.id]: prev[t.id] === valor ? null : valor,
                              }))
                            }
                            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                              editPuntaje[t.id] === valor
                                ? PUNTAJE_COLORS[valor]
                                : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                            }`}
                          >
                            {valor}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="block text-xs text-zinc-500 mb-1">Observaciones</label>
                      <input
                        type="text"
                        placeholder="Observaciones..."
                        value={editObs[t.id] || ""}
                        onChange={(e) => setEditObs((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={guardando}
            className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardarCambios}
            disabled={guardando}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 transition-colors disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ModificarEvaluacionPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-zinc-400">Cargando evaluación...</p>
        </div>
      </main>
    }>
      <ModificarEvaluacionContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import { recalcularRMActual } from "@/lib/recalcularRMActual";

type VerEvaluacionModalProps = {
  open: boolean;
  onClose: () => void;
  evaluacionId: string;
  subtipo: "rm" | "fms";
  completada?: boolean;
  permitirCargaAlumno?: boolean;
  vista?: "alumno" | "profesor";
};

type ResultadoRM = {
  id: string;
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

type EvaluacionRM = {
  id: string;
  nombre?: string | null;
  fecha_realizacion: string | null;
  fecha_asignacion: string | null;
  observaciones: string | null;
  estado: string | null;
  resultados?: {
    ejercicio: {
      nombre: string;
    } | null;
  }[];
};

type EvaluacionFMS = {
  id: string;
  fecha_realizacion: string | null;
  fecha_asignacion: string | null;
  observaciones: string | null;
  estado: string | null;
  tests?: {
    test_nombre: string;
  }[];
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

function calcularRMEpley(peso: number | null, repeticiones: number | null) {
  if (!peso || !repeticiones) return null;
  if (repeticiones === 1) return Number(peso.toFixed(2));
  return Number((peso * (1 + repeticiones / 30)).toFixed(2));
}

export default function VerEvaluacionModal({
  open,
  onClose,
  evaluacionId,
  subtipo,
  completada = false,
  permitirCargaAlumno = false,
  vista = "alumno",
}: VerEvaluacionModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { formatearFechaCorta } = useFormatoFecha();
  const [evaluacion, setEvaluacion] = useState<EvaluacionRM | EvaluacionFMS | null>(null);
  const [resultadosRM, setResultadosRM] = useState<ResultadoRM[]>([]);
  const [resultadosFMS, setResultadosFMS] = useState<ResultadoFMS[]>([]);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Estados para edición RM
  const [editPeso, setEditPeso] = useState<Record<string, string>>({});
  const [editReps, setEditReps] = useState<Record<string, string>>({});

  // Estados para edición FMS
  const [editPuntaje, setEditPuntaje] = useState<Record<string, number | null>>({});
  const [editPuntajeD, setEditPuntajeD] = useState<Record<string, number | null>>({});
  const [editPuntajeI, setEditPuntajeI] = useState<Record<string, number | null>>({});
  const [editObs, setEditObs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !evaluacionId) return;

    let cancelled = false;

    async function cargarEvaluacion() {
      setLoading(true);

      try {
        if (subtipo === "rm") {
          const { data, error } = await supabase
            .from("evaluaciones_rm")
            .select(
              "id, nombre, fecha_realizacion, fecha_asignacion, observaciones, estado"
            )
            .eq("id", evaluacionId)
            .single();

          if (error || !data) {
            console.error("Error cargando evaluación RM:", error);
            setLoading(false);
            return;
          }

          if (!cancelled) {
            setEvaluacion(data as EvaluacionRM);
          }

          const { data: ejerciciosData } = await supabase
            .from("evaluaciones_rm_resultados")
            .select("id, peso_usado, repeticiones, rm_final, ejercicio:ejercicios(nombre)")
            .eq("evaluacion_rm_id", evaluacionId)
            .order("orden", { ascending: true });

          if (!cancelled) {
            const resultados = (ejerciciosData || []).map((r: any) => ({
              id: r.id,
              ejercicio: r.ejercicio?.nombre || "Ejercicio",
              peso_usado: r.peso_usado,
              repeticiones: r.repeticiones,
              rm_final: r.rm_final,
            }));
            setResultadosRM(resultados);
          }
        } else {
          const { data, error } = await supabase
            .from("evaluaciones_fms")
            .select("id, fecha_realizacion, fecha_asignacion, observaciones, estado")
            .eq("id", evaluacionId)
            .single();

          if (error || !data) {
            console.error("Error cargando evaluación FMS:", error);
            setLoading(false);
            return;
          }

          if (!cancelled) {
            setEvaluacion(data as EvaluacionFMS);
          }

          const { data: testsData } = await supabase
            .from("evaluaciones_fms_tests")
            .select("id, test_nombre, puntaje, puntaje_derecho, puntaje_izquierdo, observaciones")
            .eq("evaluacion_fms_id", evaluacionId)
            .order("created_at", { ascending: true });

          if (!cancelled) {
            setResultadosFMS((testsData || []) as ResultadoFMS[]);
          }
        }
      } catch (error) {
        console.error("Error inesperado:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    cargarEvaluacion();

    return () => {
      cancelled = true;
    };
  }, [open, evaluacionId, subtipo]);

  // Inicializar estados de edición cuando se cargan los datos
  useEffect(() => {
    if (editando && subtipo === "rm" && resultadosRM.length > 0) {
      const pesos: Record<string, string> = {};
      const reps: Record<string, string> = {};
      resultadosRM.forEach((r) => {
        pesos[r.id] = r.peso_usado?.toString() || "";
        reps[r.id] = r.repeticiones?.toString() || "";
      });
      setEditPeso(pesos);
      setEditReps(reps);
    }
    if (editando && subtipo === "fms" && resultadosFMS.length > 0) {
      const puntajes: Record<string, number | null> = {};
      const puntajesD: Record<string, number | null> = {};
      const puntajesI: Record<string, number | null> = {};
      const obs: Record<string, string> = {};
      resultadosFMS.forEach((t) => {
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
  }, [editando, subtipo, resultadosRM, resultadosFMS]);

  if (!open) return null;

  const esRM = subtipo === "rm";
  const esProfesor = vista === "profesor";
  const titulo = esRM ? "Evaluación RM" : "Evaluación FMS";
  const items = esRM
    ? resultadosRM.map((r) => r.ejercicio).filter(Boolean)
    : resultadosFMS.map((t) => t.test_nombre).filter(Boolean);

  function PUNTAJE_COLORS(puntaje: number | null) {
    if (puntaje === null) return "";
    if (puntaje === 0) return "bg-red-900/40 border-red-700 text-red-400";
    if (puntaje === 1) return "bg-orange-900/40 border-orange-700 text-orange-400";
    if (puntaje === 2) return "bg-yellow-900/40 border-yellow-700 text-yellow-400";
    return "bg-emerald-900/40 border-emerald-700 text-emerald-400";
  }

  function irARealizar() {
    router.push(`/evaluaciones/realizar/${subtipo}/${evaluacionId}`);
    onClose();
  }

  function abrirEdicion() {
    setEditando(true);
  }

  function cerrarEdicion() {
    setEditando(false);
  }

  function actualizarPesoRM(resultadoId: string, valor: string) {
    setEditPeso((prev) => ({ ...prev, [resultadoId]: valor }));
  }

  function actualizarRepsRM(resultadoId: string, valor: string) {
    setEditReps((prev) => ({ ...prev, [resultadoId]: valor }));
  }

  function calcularRMFinal(peso: string, reps: string): number | null {
    const pesoNum = peso === "" ? null : Number(peso);
    const repsNum = reps === "" ? null : Number(reps);
    return calcularRMEpley(pesoNum, repsNum);
  }

  function setPuntajeFMS(testId: string, valor: number) {
    setEditPuntaje((prev) => ({ ...prev, [testId]: prev[testId] === valor ? null : valor }));
  }

  function setPuntajeLadoFMS(testId: string, lado: "d" | "i", valor: number) {
    if (lado === "d") {
      setEditPuntajeD((prev) => ({ ...prev, [testId]: prev[testId] === valor ? null : valor }));
    } else {
      setEditPuntajeI((prev) => ({ ...prev, [testId]: prev[testId] === valor ? null : valor }));
    }
  }

  function actualizarObsFMS(testId: string, valor: string) {
    setEditObs((prev) => ({ ...prev, [testId]: valor }));
  }

  async function guardarEdicion() {
    setGuardando(true);

    try {
      if (subtipo === "rm") {
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

          // Actualizar historial y RM actual
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData.session?.user.id ?? null;

          const { data: historialExistente } = await supabase
            .from("rms_historial")
            .select("id")
            .eq("evaluacion_rm_id", evaluacionId)
            .eq("evaluacion_rm_resultado_id", resultado.id)
            .maybeSingle();

          const historialPayload = {
            alumno_id: (evaluacion as EvaluacionRM).id,
            peso_kg: peso,
            repeticiones: reps,
            rm_calculado: rmFinal,
            fecha: new Date().toISOString(),
            registrado_por: userId,
            origen: "evaluacion_rm",
            evaluacion_rm_id: evaluacionId,
            evaluacion_rm_resultado_id: resultado.id,
          };

          if (historialExistente?.id) {
            await supabase.from("rms_historial").update(historialPayload).eq("id", historialExistente.id);
          }
        }

        // Recalcular RM actuales
        for (const resultado of resultadosRM) {
          try {
            await recalcularRMActual({
              alumnoId: (evaluacion as EvaluacionRM).id,
              ejercicioId: resultado.id,
            });
          } catch (e) {
            console.error("Error recalculando RM:", e);
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

        await supabase
          .from("evaluaciones_fms")
          .update({
            puntaje_total: total,
            hay_dolor: hayDolor,
            updated_at: new Date().toISOString(),
          })
          .eq("id", evaluacionId);
      }

      setEditando(false);
      onClose();
    } catch (error) {
      console.error("Error guardando edición:", error);
      alert("Ocurrió un error al guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  }

  // Modal de edición
  if (editando) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-amber-800 bg-zinc-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-xl font-bold text-amber-300">Modificar {titulo}</h3>
            <button
              type="button"
              onClick={cerrarEdicion}
              className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto flex-1 pr-1 space-y-4">
            {esRM ? (
              resultadosRM.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin ejercicios cargados.</p>
              ) : (
                resultadosRM.map((r) => {
                  const rmFinal = calcularRMFinal(editPeso[r.id] || "", editReps[r.id] || "");
                  return (
                    <div key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                      <p className="font-semibold text-zinc-200 mb-3">{r.ejercicio}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Peso (kg)</label>
                          <input
                            type="number"
                            placeholder="kg"
                            value={editPeso[r.id] || ""}
                            onChange={(e) => actualizarPesoRM(r.id, e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-500 mb-1">Repeticiones</label>
                          <input
                            type="number"
                            placeholder="reps"
                            value={editReps[r.id] || ""}
                            onChange={(e) => actualizarRepsRM(r.id, e.target.value)}
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
              )
            ) : (
              resultadosFMS.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin tests cargados.</p>
              ) : (
                resultadosFMS.map((t) => {
                  const esBilateral = t.puntaje_derecho !== null || t.puntaje_izquierdo !== null;
                  return (
                    <div key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
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
                                  onClick={() => setPuntajeLadoFMS(t.id, "d", valor)}
                                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                                    editPuntajeD[t.id] === valor
                                      ? PUNTAJE_COLORS(valor)
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
                                  onClick={() => setPuntajeLadoFMS(t.id, "i", valor)}
                                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                                    editPuntajeI[t.id] === valor
                                      ? PUNTAJE_COLORS(valor)
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
                              onClick={() => setPuntajeFMS(t.id, valor)}
                              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                                editPuntaje[t.id] === valor
                                  ? PUNTAJE_COLORS(valor)
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
                          onChange={(e) => actualizarObsFMS(t.id, e.target.value)}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>

          <div className="mt-4 flex justify-end gap-3 shrink-0 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={cerrarEdicion}
              disabled={guardando}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardarEdicion}
              disabled={guardando}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition-colors disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-xl font-bold text-zinc-100">{titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-32 rounded bg-zinc-800" />
              <div className="h-4 w-48 rounded bg-zinc-800" />
              <div className="h-4 w-40 rounded bg-zinc-800" />
              <div className="h-20 w-full rounded-xl bg-zinc-800" />
            </div>
          ) : evaluacion ? (
            <>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Tipo</p>
                  <p className="text-sm text-zinc-200">{esRM ? "Evaluación RM" : "Evaluación FMS"}</p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 mb-1">
                    {completada ? "Fecha completada" : "Fecha a realizar"}
                  </p>
                  <p className="text-sm text-zinc-200">
                    {formatearFechaCorta(
                      completada
                        ? evaluacion.fecha_realizacion
                        : (evaluacion as any).fecha_asignacion
                    ) || "Sin fecha"}
                  </p>
                </div>

                {evaluacion.observaciones && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Observaciones</p>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{evaluacion.observaciones}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wide">
                  {esRM ? "Ejercicios" : "Tests"}
                </p>

                {!completada && items.length === 0 && (
                  <p className="text-sm text-zinc-500">Sin items cargados.</p>
                )}

                {!completada && items.length > 0 && (
                  <ul className="space-y-1">
                    {items.map((nombre, index) => (
                      <li key={index} className="text-sm text-zinc-300">
                        {index + 1}. {nombre}
                      </li>
                    ))}
                  </ul>
                )}

                {completada && esRM && resultadosRM.length > 0 && (
                  <div className="space-y-3">
                    {resultadosRM.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                      >
                        <p className="font-semibold text-zinc-200">{r.ejercicio}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-400">
                          <span>Peso: {r.peso_usado ?? "-"} kg</span>
                          <span>Reps: {r.repeticiones ?? "-"}</span>
                          <span className="text-emerald-400 font-semibold">
                            RM: {r.rm_final ?? "-"} kg
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {completada && !esRM && resultadosFMS.length > 0 && (
                  <div className="space-y-3">
                    {resultadosFMS.map((t) => {
                      const bilateral = t.puntaje_derecho !== null || t.puntaje_izquierdo !== null;
                      return (
                        <div
                          key={t.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-zinc-200">{t.test_nombre}</p>
                            {t.puntaje !== null && (
                              <span className={`shrink-0 text-sm font-bold px-3 py-1 rounded-full border ${PUNTAJE_COLORS(t.puntaje)}`}>
                                {t.puntaje}
                              </span>
                            )}
                          </div>
                          {bilateral && (
                            <div className="mt-2 flex gap-3 text-sm text-zinc-500">
                              <span>D: {t.puntaje_derecho ?? "-"}</span>
                              <span>I: {t.puntaje_izquierdo ?? "-"}</span>
                            </div>
                          )}
                          {t.observaciones && (
                            <p className="text-xs text-zinc-500 mt-2">{t.observaciones}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {completada && items.length === 0 && (
                  <p className="text-sm text-zinc-500">Sin resultados registrados.</p>
                )}
              </div>

              {!completada && !esProfesor && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  {permitirCargaAlumno ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <p className="text-sm text-zinc-300">
                        Esta evaluación está lista para ser realizada. Podés cargar los resultados ahora.
                      </p>
                      <button
                        type="button"
                        onClick={irARealizar}
                        className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
                      >
                        Realizar evaluación
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-300">
                      Esta evaluación fue asignada para ser realizada por tu profesor. Podés ver los{" "}
                      {esRM ? "ejercicios" : "tests"}, pero no podés cargar resultados.
                    </p>
                  )}
                </div>
              )}

              {!completada && esProfesor && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-300">
                    <span className="font-semibold text-zinc-200">{items.length}</span>{" "}
                    {esRM ? "ejercicio" : "test"}
                    {items.length !== 1 ? "s" : ""} a evaluar.
                  </p>
                </div>
              )}

              {completada && esProfesor && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <button
                    type="button"
                    onClick={abrirEdicion}
                    className="w-full rounded-xl border border-amber-700 bg-amber-950/30 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:border-amber-500 hover:bg-amber-950/50 transition-colors"
                  >
                    Modificar resultados
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-zinc-400 text-sm">No se pudo cargar la información de la evaluación.</p>
          )}
        </div>

        <div className="mt-4 flex justify-end shrink-0 border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { obtenerRMsActualesAlumno } from "@/lib/rmActual";
import { recalcularRMActual } from "@/lib/recalcularRMActual";
import BackButton from "@/components/BackButton";
import SkeletonEvaluaciones from "@/components/SkeletonEvaluaciones";
import { useIdioma } from "@/lib/i18n-context";
import { campoBilingue } from "@/lib/utils/campoBilingue";
import { formatearFechaCorta } from "@/lib/utils/formatearFecha";

type ModoCarga = "protocolo" | "rapida" | null;

type EvaluacionRM = {
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

type IntentoProtocolo = {
  numero: number;
  peso: number | null;
  repeticiones: number | null;
  resultado: "logrado" | "fallado" | null;
};

type SerieAproximacion = {
  numero: number;
  porcentaje: number;
  porcentajeLabel?: string;
  repeticiones: number;
  descanso: string;
};

type ResultadoRM = {
  id: string;
  evaluacion_rm_id: string;
  ejercicio_id: string;
  orden: number | null;
  metodo: string | null;
  peso_usado: number | null;
  repeticiones: number | null;
  rm_estimado: number | null;
  rm_final: number | null;
  completado: boolean;
  observaciones: string | null;
  ejercicio?: {
    id: string;
    nombre: string;
  } | null;
  rm_referencia?: number | null;
  intentos_protocolo?: IntentoProtocolo[];
  rm_actual?: number | null;
};

function calcularRMEpley(peso: number | null, repeticiones: number | null) {
  if (!peso || !repeticiones) return null;
  if (repeticiones === 1) return Number(peso.toFixed(2));
  return Number((peso * (1 + repeticiones / 30)).toFixed(2));
}

const SERIES_APROXIMACION: SerieAproximacion[] = [
  { numero: 1, porcentaje: 40, repeticiones: 5, descanso: "1-2 min" },
  { numero: 2, porcentaje: 60, repeticiones: 3, descanso: "1-2 min" },
  { numero: 3, porcentaje: 75, repeticiones: 2, descanso: "1-2 min" },
  { numero: 4, porcentaje: 85, repeticiones: 1, descanso: "3 min" },
  { numero: 5, porcentaje: 90, porcentajeLabel: "90-95", repeticiones: 1, descanso: "3 min" },
];

function crearIntentosIniciales(): IntentoProtocolo[] {
  return Array.from({ length: 5 }, (_, index) => ({
    numero: index + 1,
    peso: null,
    repeticiones: null,
    resultado: null,
  }));
}


function calcularPesoSugerido(rmReferencia: number | null | undefined, porcentaje: number) {
  if (!rmReferencia) return null;
  return Number(((rmReferencia * porcentaje) / 100).toFixed(2));
}

function formatearPorcentajeSerie(serie: SerieAproximacion) {
  return serie.porcentajeLabel || String(serie.porcentaje);
}

function formatearPesoSugeridoSerie(rmReferencia: number | null | undefined, serie: SerieAproximacion, t?: (key: string, params?: Record<string, string | number>) => string) {
  const peso = calcularPesoSugerido(rmReferencia, serie.porcentaje);

  if (!peso) return "—";

  if (serie.porcentajeLabel === "90-95") {
    return t ? t("evaluaciones.pesoSugeridoDesde", { peso: String(peso) }) : `${peso} kg desde 90%`;
  }

  return t ? t("evaluaciones.pesoSugerido", { peso: String(peso) }) : `${peso} kg`;
}

function contarIntentosFallados(intentos: IntentoProtocolo[]) {
  return intentos.filter((intento) => intento.resultado === "fallado").length;
}

function intentoBloqueado(intentos: IntentoProtocolo[], index: number) {
  const anteriores = intentos.slice(0, index);
  return contarIntentosFallados(anteriores) >= 2;
}

function obtenerMejorIntento(intentos: IntentoProtocolo[]) {
  const logrados = intentos
    .filter((intento) => intento.resultado === "logrado" && intento.peso && intento.repeticiones)
    .map((intento) => ({
      ...intento,
      rm: calcularRMEpley(intento.peso, intento.repeticiones),
    }))
    .filter((intento) => intento.rm !== null);

  if (logrados.length === 0) return null;

  return logrados.reduce((mejor, actual) => {
    if ((actual.rm || 0) > (mejor.rm || 0)) return actual;
    return mejor;
  });
}

export default function RealizarEvaluacionRMDetalle() {
  const params = useParams();
  const evaluacionId = String(params.id || "");
  const { t, idioma } = useIdioma();

  const [loading, setLoading] = useState(true);
  const [modoCarga, setModoCarga] = useState<ModoCarga>(null);
  const [evaluacion, setEvaluacion] = useState<EvaluacionRM | null>(null);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [resultados, setResultados] = useState<ResultadoRM[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);
  const [profesorId, setProfesorId] = useState<string | null>(null);

  useEffect(() => {
    async function cargarEvaluacion() {
      if (!evaluacionId) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const profesorActualId = sessionData.session?.user.id;

      if (!profesorActualId) {
        alert(t("evaluaciones.errorSinProfesor"));
        window.location.href = "/login";
        return;
      }

      setProfesorId(profesorActualId);

      const { data: evaluacionData, error: evaluacionError } = await supabase
        .from("evaluaciones_rm")
        .select("id, alumno_id, profesor_id, estado, fecha_asignacion, fecha_realizacion, observaciones")
        .eq("id", evaluacionId)
        .eq("profesor_id", profesorActualId)
        .single();

      if (evaluacionError || !evaluacionData) {
        alert(evaluacionError?.message || t("evaluaciones.errorCargarEvaluacion"));
        setLoading(false);
        return;
      }

      const [
        { data: alumnoData, error: alumnoError },
        { data: resultadosData, error: resultadosError },
        { data: rmsActualesData, error: rmsActualesError },
      ] = await Promise.all([
        supabase
          .from("alumnos")
          .select("id, nombre, profesor_id")
          .eq("id", evaluacionData.alumno_id)
          .eq("profesor_id", profesorActualId)
          .single(),
        supabase
          .from("evaluaciones_rm_resultados")
          .select("id, evaluacion_rm_id, ejercicio_id, orden, metodo, peso_usado, repeticiones, rm_estimado, rm_final, completado, observaciones, ejercicio:ejercicios(id, nombre, nombre_es, nombre_en)")
          .eq("evaluacion_rm_id", evaluacionId)
          .order("orden", { ascending: true }),
        obtenerRMsActualesAlumno(evaluacionData.alumno_id),
      ]);

      if (alumnoError) {
        alert(alumnoError.message);
        setLoading(false);
        return;
      }

      if (resultadosError) {
        alert(resultadosError.message);
        setLoading(false);
        return;
      }

      if (rmsActualesError) {
        alert(rmsActualesError.message);
        setLoading(false);
        return;
      }

      setEvaluacion(evaluacionData);
      setAlumno(alumnoData);
      const rmsActualesPorEjercicio = new Map(
        (rmsActualesData || []).map((rm) => [rm.ejercicio_id, rm.rm_calculado])
      );

      const resultadosNormalizados = (resultadosData || []).map((resultado) => ({
        ...resultado,
        ejercicio: Array.isArray(resultado.ejercicio)
          ? resultado.ejercicio[0] || null
          : resultado.ejercicio,
      })) as unknown as ResultadoRM[];

      setResultados(
        resultadosNormalizados.map((resultado) => ({
          ...resultado,
          rm_actual: rmsActualesPorEjercicio.get(resultado.ejercicio_id) ?? null,
          rm_referencia: rmsActualesPorEjercicio.get(resultado.ejercicio_id) ?? null,
          intentos_protocolo: crearIntentosIniciales(),
        }))
      );
      setLoading(false);
    }

    cargarEvaluacion();
  }, [evaluacionId]);
  async function validarEvaluacionPropia() {
    if (!evaluacion || !profesorId) {
      alert(t("evaluaciones.errorSinPermiso"));
      return false;
    }

    const { data: evaluacionPropia, error } = await supabase
      .from("evaluaciones_rm")
      .select("id, alumno_id, profesor_id, estado")
      .eq("id", evaluacion.id)
      .eq("profesor_id", profesorId)
      .maybeSingle();

    if (error) {
      alert(error.message);
      return false;
    }

    if (!evaluacionPropia) {
      alert(t("evaluaciones.errorSinPermiso"));
      return false;
    }

    if (evaluacionPropia.alumno_id !== evaluacion.alumno_id) {
      alert(t("evaluaciones.errorAlumnoNoCoincide"));
      return false;
    }

    return true;
  }

  function actualizarResultadoRapido(
    resultadoId: string,
    campo: "peso_usado" | "repeticiones",
    valor: string
  ) {
    const numero = valor === "" ? null : Number(valor);

    setResultados((prev) =>
      prev.map((resultado) => {
        if (resultado.id !== resultadoId) return resultado;

        const actualizado = {
          ...resultado,
          [campo]: numero,
        };

        const rmEstimado = calcularRMEpley(
          actualizado.peso_usado,
          actualizado.repeticiones
        );

        return {
          ...actualizado,
          rm_estimado: rmEstimado,
          rm_final: rmEstimado,
        };
      })
    );
  }

  async function guardarEvaluacionRapida() {
    if (guardando || !evaluacion) return;
    const incompletos = resultados.filter(
      (resultado) => !resultado.peso_usado || !resultado.repeticiones || !resultado.rm_final
    );

      if (incompletos.length > 0) {
        alert(t("evaluaciones.errorCompletarEjercicios"));
        return;
      }

    setGuardando(true);

    const evaluacionValida = await validarEvaluacionPropia();
    if (!evaluacionValida) {
      setGuardando(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id ?? null;

    for (const resultado of resultados) {
      const { error: resultadoError } = await supabase
        .from("evaluaciones_rm_resultados")
        .update({
          metodo: resultado.repeticiones === 1 ? "directo" : "indirecto",
          peso_usado: resultado.peso_usado,
          repeticiones: resultado.repeticiones,
          formula: "epley",
          rm_estimado: resultado.rm_estimado,
          rm_final: resultado.rm_final,
          completado: true,
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", resultado.id)
        .eq("evaluacion_rm_id", evaluacion.id);

      if (resultadoError) {
        setGuardando(false);
        alert(resultadoError.message);
        return;
      }

      const { data: historialExistente, error: buscarHistorialError } = await supabase
        .from("rms_historial")
        .select("id")
        .eq("evaluacion_rm_id", evaluacion.id)
        .eq("evaluacion_rm_resultado_id", resultado.id)
        .maybeSingle();

      if (buscarHistorialError) {
        setGuardando(false);
        alert(buscarHistorialError.message);
        return;
      }

      const historialPayload = {
        alumno_id: evaluacion.alumno_id,
        ejercicio_id: resultado.ejercicio_id,
        peso_kg: resultado.peso_usado,
        repeticiones: resultado.repeticiones,
        rm_calculado: resultado.rm_final,
        fecha: new Date().toISOString(),
        registrado_por: userId,
        origen: "evaluacion_rm",
        evaluacion_rm_id: evaluacion.id,
        evaluacion_rm_resultado_id: resultado.id,
      };

      const historialResponse = historialExistente?.id
        ? await supabase.from("rms_historial").update(historialPayload).eq("id", historialExistente.id)
        : await supabase.from("rms_historial").insert(historialPayload);

      if (historialResponse.error) {
        setGuardando(false);
        alert(historialResponse.error.message);
        return;
      }

      try {
        await recalcularRMActual({
          alumnoId: evaluacion.alumno_id,
          ejercicioId: resultado.ejercicio_id,
        });
      } catch (error) {
        setGuardando(false);
        alert(error instanceof Error ? error.message : t("evaluaciones.errorRecalcularRM"));
        return;
      }
    }

    const { error: evaluacionError } = await supabase
      .from("evaluaciones_rm")
      .update({
        estado: "cargado",
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

  function actualizarRMReferencia(resultadoId: string, valor: string) {
    const numero = valor === "" ? null : Number(valor);
    setResultados((prev) =>
      prev.map((resultado) =>
        resultado.id === resultadoId ? { ...resultado, rm_referencia: numero } : resultado
      )
    );
  }

  function actualizarIntentoProtocolo(
    resultadoId: string,
    numeroIntento: number,
    campo: "peso" | "repeticiones" | "resultado",
    valor: string
  ) {
    setResultados((prev) =>
      prev.map((resultado) => {
        if (resultado.id !== resultadoId) return resultado;

        const intentos = resultado.intentos_protocolo || crearIntentosIniciales();
        const nuevosIntentos = intentos.map((intento) => {
          if (intento.numero !== numeroIntento) return intento;

          if (campo === "resultado") {
            return { ...intento, resultado: valor as "logrado" | "fallado" | null };
          }

          return { ...intento, [campo]: valor === "" ? null : Number(valor) };
        });

        const mejorIntento = obtenerMejorIntento(nuevosIntentos);

        return {
          ...resultado,
          intentos_protocolo: nuevosIntentos,
          peso_usado: mejorIntento?.peso ?? null,
          repeticiones: mejorIntento?.repeticiones ?? null,
          rm_estimado: mejorIntento?.rm ?? null,
          rm_final: mejorIntento?.rm ?? null,
        };
      })
    );
  }

  async function guardarEvaluacionProtocolo() {
    if (guardando || !evaluacion) return;

    const incompletos = resultados.filter((resultado) => {
      const mejorIntento = obtenerMejorIntento(resultado.intentos_protocolo || []);
      return !resultado.rm_referencia || !mejorIntento || !mejorIntento.rm;
    });

    if (incompletos.length > 0) {
      alert(t("evaluaciones.errorCompletarProtocolo"));
      return;
    }

    setGuardando(true);

    const evaluacionValida = await validarEvaluacionPropia();
    if (!evaluacionValida) {
      setGuardando(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id ?? null;

    for (const resultado of resultados) {
      const intentos = resultado.intentos_protocolo || [];
      const mejorIntento = obtenerMejorIntento(intentos);

      if (!mejorIntento || !mejorIntento.rm) {
        setGuardando(false);
        alert(t("evaluaciones.errorSinIntentoLogrado"));
        return;
      }

      const metodo = mejorIntento.repeticiones === 1 ? "directo" : "indirecto";
      const protocolo = {
        rm_referencia: resultado.rm_referencia,
        series_aproximacion: SERIES_APROXIMACION.map((serie) => ({
          ...serie,
          porcentaje_mostrado: formatearPorcentajeSerie(serie),
          peso_sugerido: calcularPesoSugerido(resultado.rm_referencia, serie.porcentaje),
        })),
        descanso_intentos_maximos: "3-5 min",
        intentos,
      };

      const { error: resultadoError } = await supabase
        .from("evaluaciones_rm_resultados")
        .update({
          metodo,
          peso_usado: mejorIntento.peso,
          repeticiones: mejorIntento.repeticiones,
          formula: "epley",
          rm_estimado: mejorIntento.rm,
          rm_final: mejorIntento.rm,
          completado: true,
          protocolo,
          progreso: { intentos },
          mejor_intento_numero: mejorIntento.numero,
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", resultado.id)
        .eq("evaluacion_rm_id", evaluacion.id);

      if (resultadoError) {
        setGuardando(false);
        alert(resultadoError.message);
        return;
      }

      const { data: historialExistente, error: buscarHistorialError } = await supabase
        .from("rms_historial")
        .select("id")
        .eq("evaluacion_rm_id", evaluacion.id)
        .eq("evaluacion_rm_resultado_id", resultado.id)
        .maybeSingle();

      if (buscarHistorialError) {
        setGuardando(false);
        alert(buscarHistorialError.message);
        return;
      }

      const historialPayload = {
        alumno_id: evaluacion.alumno_id,
        ejercicio_id: resultado.ejercicio_id,
        peso_kg: mejorIntento.peso,
        repeticiones: mejorIntento.repeticiones,
        rm_calculado: mejorIntento.rm,
        fecha: new Date().toISOString(),
        registrado_por: userId,
        origen: "evaluacion_rm",
        evaluacion_rm_id: evaluacion.id,
        evaluacion_rm_resultado_id: resultado.id,
      };

      const historialResponse = historialExistente?.id
        ? await supabase.from("rms_historial").update(historialPayload).eq("id", historialExistente.id)
        : await supabase.from("rms_historial").insert(historialPayload);

      if (historialResponse.error) {
        setGuardando(false);
        alert(historialResponse.error.message);
        return;
      }

      try {
        await recalcularRMActual({
          alumnoId: evaluacion.alumno_id,
          ejercicioId: resultado.ejercicio_id,
        });
      } catch (error) {
        setGuardando(false);
        alert(error instanceof Error ? error.message : t("evaluaciones.errorRecalcularRM"));
        return;
      }
    }

    const { error: evaluacionError } = await supabase
      .from("evaluaciones_rm")
      .update({
        estado: "cargado",
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
    return <main className="min-h-screen bg-zinc-950 text-white p-8">{t("evaluaciones.noEncontrada")}</main>;
  }

  if (exito) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-4">✅</p>
          <h2 className="text-2xl font-bold">{t("evaluaciones.exitoGuardar")}</h2>
          <p className="text-zinc-400 mt-2">
            {t("evaluaciones.exitoGuardarDesc")}
          </p>
          <BackButton fallback="/evaluaciones/realizar?tipo=rm" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <BackButton fallback="/evaluaciones/realizar?tipo=rm" />
        </div>

        <header className="mb-8">
          <p className="text-sm text-zinc-500 mb-2">{t("evaluaciones.realizarTitulo")}</p>
          <h1 className="text-3xl font-bold">{alumno?.nombre || t("alumnos.sinNombre")}</h1>
          <p className="text-zinc-400 mt-2">{t("evaluaciones.realizarFecha", { fecha: formatearFechaCorta(evaluacion.fecha_asignacion) || t("evaluaciones.realizarSinFecha") })}</p>
          {evaluacion.observaciones && <p className="text-zinc-500 mt-2">{evaluacion.observaciones}</p>}
        </header>

        {!modoCarga ? (
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-2">{t("evaluaciones.realizarPregunta")}</h2>
            <p className="text-zinc-400 mb-6">
              {t("evaluaciones.realizarDescripcion")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setModoCarga("protocolo")}
                className="text-left bg-zinc-950 border border-zinc-700 rounded-xl p-5 hover:border-white transition"
              >
                <p className="text-xl font-bold mb-2">{t("evaluaciones.protocolo")}</p>
                <p className="text-sm text-zinc-400">
                  {t("evaluaciones.protocoloDesc")}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setModoCarga("rapida")}
                className="text-left bg-zinc-950 border border-zinc-700 rounded-xl p-5 hover:border-white transition"
              >
                <p className="text-xl font-bold mb-2">{t("evaluaciones.cargaRapida")}</p>
                <p className="text-sm text-zinc-400">
                  {t("evaluaciones.cargaRapidaDesc")}
                </p>
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {modoCarga === "protocolo" ? t("evaluaciones.protocolo") : t("evaluaciones.cargaRapida")}
                </h2>
                <p className="text-zinc-400">{t("evaluaciones.ejerciciosAsignados", { count: resultados.length })}</p>
              </div>
              <button
                type="button"
                onClick={() => setModoCarga(null)}
                className="border border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-800 transition"
              >
                {t("evaluaciones.cambiarModo")}
              </button>
            </div>

            {resultados.map((resultado, index) => (
              <div key={resultado.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">{t("evaluaciones.ejercicioLabel", { orden: resultado.orden || index + 1 })}</p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-xl font-semibold">{resultado.ejercicio ? campoBilingue(resultado.ejercicio, "nombre", idioma) : t("alumnos.ejercicioSinNombre")}</h3>
                  <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm text-zinc-300">
                    {resultado.rm_actual ? t("evaluaciones.rmActualLabel", { valor: resultado.rm_actual }) : t("evaluaciones.sinRMActual")}
                  </span>
                </div>

                {modoCarga === "protocolo" ? (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                      <label className="block text-xs text-zinc-500 mb-1">{t("evaluaciones.rmReferencia")}</label>
                      <input
                        type="number"
                        placeholder="kg"
                        value={resultado.rm_referencia ?? ""}
                        onChange={(e) => actualizarRMReferencia(resultado.id, e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-500"
                      />
                      <p className="text-xs text-zinc-500 mt-2">
                        {t("evaluaciones.rmReferenciaInfo")}
                      </p>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-xs uppercase tracking-wide text-zinc-500 mb-3">{t("evaluaciones.seriesAproximacion")}</p>
                      <div className="space-y-2 text-sm">
                        {SERIES_APROXIMACION.map((serie) => (
                          <div key={serie.numero} className="flex items-center justify-between border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
                            <span>{t("evaluaciones.serieInfo", { numero: serie.numero, reps: serie.repeticiones, porcentaje: formatearPorcentajeSerie(serie), descanso: serie.descanso })}</span>
                            <span className="text-zinc-300">
                              {formatearPesoSugeridoSerie(resultado.rm_referencia, serie, t)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                      <p className="text-xs uppercase tracking-wide text-zinc-500 mb-3">{t("evaluaciones.intentosMaximos")}</p>
                      <div className="space-y-3">
                        {(resultado.intentos_protocolo || crearIntentosIniciales()).map((intento, intentoIndex) => {
                          const bloqueado = intentoBloqueado(resultado.intentos_protocolo || [], intentoIndex);
                          return (
                            <div key={intento.numero} className={`grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-lg border border-zinc-800 p-3 ${bloqueado ? "opacity-40" : ""}`}>
                              <div className="font-semibold text-zinc-300">{t("evaluaciones.intentoLabel", { numero: intento.numero })}</div>
                              <input
                                type="number"
                                placeholder={t("evaluaciones.pesoLabel")}
                                value={intento.peso ?? ""}
                                disabled={bloqueado}
                                onChange={(e) => actualizarIntentoProtocolo(resultado.id, intento.numero, "peso", e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-500 disabled:cursor-not-allowed"
                              />
                              <input
                                type="number"
                                placeholder={t("evaluaciones.repsLabel")}
                                value={intento.repeticiones ?? ""}
                                disabled={bloqueado}
                                onChange={(e) => actualizarIntentoProtocolo(resultado.id, intento.numero, "repeticiones", e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-500 disabled:cursor-not-allowed"
                              />
                              <select
                                value={intento.resultado ?? ""}
                                disabled={bloqueado}
                                onChange={(e) => actualizarIntentoProtocolo(resultado.id, intento.numero, "resultado", e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-500 disabled:cursor-not-allowed"
                              >
                                <option value="">{t("evaluaciones.resultadoLabel")}</option>
                                <option value="logrado">{t("evaluaciones.logrado")}</option>
                                <option value="fallado">{t("evaluaciones.fallado")}</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-zinc-500 mt-3">
                        {t("evaluaciones.descansoIntentos")}
                      </p>
                    </div>

                    <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-4">
                      {(() => {
                        const mejorIntento = obtenerMejorIntento(resultado.intentos_protocolo || []);
                        return mejorIntento ? (
                          <p className="text-emerald-300" dangerouslySetInnerHTML={{
                            __html: t("evaluaciones.mejorIntento", {
                              peso: mejorIntento.peso ?? 0,
                              reps: mejorIntento.repeticiones ?? 0,
                              rm: mejorIntento.rm ?? 0
                            })
                          }} />
                        ) : (
                          <p className="text-zinc-400">{t("evaluaciones.sinIntentosLogrados")}</p>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">{t("evaluaciones.pesoUsado")}</label>
                      <input
                        type="number"
                        placeholder="kg"
                        value={resultado.peso_usado ?? ""}
                        onChange={(e) => actualizarResultadoRapido(resultado.id, "peso_usado", e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">{t("evaluaciones.repsLabel")}</label>
                      <input
                        type="number"
                        placeholder="reps"
                        value={resultado.repeticiones ?? ""}
                        onChange={(e) => actualizarResultadoRapido(resultado.id, "repeticiones", e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">{t("evaluaciones.rmFinal")}</label>
                      <div className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white min-h-[42px] flex items-center">
                        {resultado.rm_final ? `${resultado.rm_final} kg` : "—"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={modoCarga === "rapida" ? guardarEvaluacionRapida : guardarEvaluacionProtocolo}
                disabled={guardando || !modoCarga}
                className="bg-white text-zinc-950 font-semibold px-6 py-3 rounded-lg hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {guardando ? t("common.guardando") : t("evaluaciones.guardarEvaluacion")}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
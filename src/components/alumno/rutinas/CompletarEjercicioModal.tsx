"use client";
import React, { useMemo, useRef } from "react";
import DescansoTimer, { DescansoTimerHandle } from "./DescansoTimer";
import TemporizadorSeries from "@/components/rutinas/TemporizadorSeries";

type CompletarEjercicioModalProps = {
  open: boolean;
  ejercicio: any | null;
  onClose: () => void;
  onCompletar: () => void;
  rpe?: string;
  setRpe?: (value: string) => void;
  rirReal?: string;
  setRirReal?: (value: string) => void;
  seriesRealizadas?: Record<number, { peso: string; repeticiones: string }>;
  setSeriesRealizadas?: React.Dispatch<
    React.SetStateAction<Record<number, { peso: string; repeticiones: string }>>
  >;
  seriesAvanzadas?: any[];
  opcionesRPE?: number[];
  opcionesRIR?: number[];
  guardandoEjercicio?: boolean;
  pesoSugerido?: string | null;
};

function obtenerVideoUrl(ejercicio: any | null) {
  return (
    ejercicio?.video_url ||
    ejercicio?.youtube_url ||
    ejercicio?.url_video ||
    ejercicio?.ejercicios?.video_url ||
    ejercicio?.ejercicios?.youtube_url ||
    null
  );
}

function obtenerYoutubeId(url?: string | null) {
  if (!url) return null;

  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^?&/]+)/,
  );

  return match?.[1] || null;
}

function obtenerMiniaturaVideo(url?: string | null) {
  const youtubeId = obtenerYoutubeId(url);
  return youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;
}

function obtenerTotalSeries(ejercicio: any | null, seriesAvanzadas: any[]) {
  if (ejercicio?.tipo_configuracion === "avanzado" && seriesAvanzadas.length > 0) {
    return seriesAvanzadas.length;
  }

  const series = Number(ejercicio?.series);
  return Number.isFinite(series) && series > 0 ? series : 1;
}

function obtenerDescansoSegundos(ejercicio: any | null) {
  const descanso =
    ejercicio?.descanso_segundos ??
    ejercicio?.descansoSegundos ??
    ejercicio?.descanso_seconds ??
    ejercicio?.descanso ??
    ejercicio?.descanso_planificado ??
    ejercicio?.descansoPlanificado;

  if (descanso === null || descanso === undefined || descanso === "") {
    return null;
  }

  if (typeof descanso === "number" && Number.isFinite(descanso)) {
    if (descanso <= 0) return null;
    return descanso <= 10 ? Math.round(descanso * 60) : Math.round(descanso);
  }

  if (typeof descanso !== "string") {
    return null;
  }

  const texto = descanso.trim().toLowerCase();
  const textoNormalizado = texto
    .replace(/″|”|“/g, '"')
    .replace(/′|’|‘/g, "'");

  if (
    !textoNormalizado ||
    textoNormalizado === "0" ||
    textoNormalizado === "sin descanso" ||
    textoNormalizado === "sin descanso planificado"
  ) {
    return null;
  }

  const soloSegundosConComillas = textoNormalizado.match(/^(\d+)\s*("|''|')$/);
  if (soloSegundosConComillas) {
    // Formato con comillas (2' o 2") se interpreta como minutos
    return Number(soloSegundosConComillas[1]) * 60;
  }

  const minutosSegundosMatch = textoNormalizado.match(/^(\d+)\s*:\s*(\d+)$/);
  if (minutosSegundosMatch) {
    const minutos = Number(minutosSegundosMatch[1]);
    const segundos = Number(minutosSegundosMatch[2]);
    return minutos * 60 + segundos;
  }

  const minutosMatch = textoNormalizado.match(/(\d+(?:[,.]\d+)?)\s*(min|m)(?![a-z])/);
  const segundosMatch = textoNormalizado.match(/(\d+)\s*(seg|segundos|s|"|'')/);

  if (minutosMatch || segundosMatch) {
    const minutos = minutosMatch ? Number(minutosMatch[1].replace(",", ".")) : 0;
    const segundos = segundosMatch ? Number(segundosMatch[1]) : 0;
    const total = Math.round(minutos * 60 + segundos);
    return total > 0 ? total : null;
  }

  const numero = Number(textoNormalizado.replace(",", "."));
  if (Number.isFinite(numero) && numero > 0) {
    return numero <= 10 ? Math.round(numero * 60) : Math.round(numero);
  }

  return null;
}

function normalizarPesoInicial(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "";
  return String(valor).replace(" kg", "").trim();
}

function formatearObjetivoPesoSerie(serie: any) {
  if (serie?.porcentaje_rm !== null && serie?.porcentaje_rm !== undefined && serie?.porcentaje_rm !== "") {
    const porcentaje = String(serie.porcentaje_rm).replace("%", "").trim();
    const pesoCalculado = serie?.peso_objetivo;

    if (porcentaje === "0") {
      return "0%RM = Peso corporal";
    }

    if (pesoCalculado !== undefined && pesoCalculado !== null && pesoCalculado !== "") {
      return `${porcentaje}%RM = ${pesoCalculado} kg`;
    }

    return `${porcentaje}%RM`;
  }

  if (serie?.peso !== null && serie?.peso !== undefined && serie?.peso !== "") {
    return `${serie.peso} kg`;
  }

  return null;
}

const CompletarEjercicioModal: React.FC<CompletarEjercicioModalProps> = ({
  open,
  ejercicio,
  onClose,
  onCompletar,
  rpe = "",
  setRpe,
  rirReal = "",
  setRirReal,
  seriesRealizadas = {},
  setSeriesRealizadas,
  seriesAvanzadas = [],
  opcionesRPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  opcionesRIR = [0, 1, 2, 3, 4, 5, 6],
  guardandoEjercicio = false,
  pesoSugerido,
}) => {
  const esAvanzado = ejercicio?.tipo_configuracion === "avanzado";
  const seriesParaMostrar = seriesAvanzadas.length > 0 ? seriesAvanzadas : [];
  const videoUrl = obtenerVideoUrl(ejercicio);
  const miniaturaVideo = obtenerMiniaturaVideo(videoUrl);
  const esEjercicioPorTiempo = ejercicio?.tipo_prescripcion === "tiempo" && Boolean(ejercicio?.duracion);
  const esPesoCorporal = ejercicio?.porcentaje_rm === "0" || pesoSugerido === "Peso corporal";
  const ocultarCargaSeriesPorTiempoPesoCorporal = esEjercicioPorTiempo && esPesoCorporal;

  const pesoPlanificado = normalizarPesoInicial(
    pesoSugerido || ejercicio?.peso || ejercicio?.peso_kg || ejercicio?.pesoPlanificado || ejercicio?.peso_planificado,
  );

  const totalSeries = useMemo(
    () => obtenerTotalSeries(ejercicio, seriesParaMostrar),
    [ejercicio, seriesParaMostrar],
  );
  const descansoInicial = useMemo(
    () => obtenerDescansoSegundos(ejercicio),
    [ejercicio],
  );
  const timerRef = useRef<DescansoTimerHandle>(null);
  const manejarEstadoTimer = () => undefined;
  // Verificar si todas las series están completas
  const todasLasSeriesCompletas =
    totalSeries > 0 &&
    Array.from({ length: totalSeries }, (_, i) => i + 1).every((numSerie) => {
      const valores = seriesRealizadas[numSerie];
      if (esEjercicioPorTiempo) {
        return valores?.peso !== undefined && valores?.peso !== "";
      }
      return Boolean(valores?.peso && valores?.repeticiones);
    });

  const textoBotonFinalizar = !todasLasSeriesCompletas && !rpe
    ? "Completá las series y el RPE"
    : !todasLasSeriesCompletas
      ? "Completá todas las series"
      : !rpe
        ? "Completá el RPE"
        : "Finalizar ejercicio";


  React.useEffect(() => {
    if (!open || !setSeriesRealizadas) return;

    if (esEjercicioPorTiempo || esPesoCorporal) {
      setSeriesRealizadas((actual) => {
        const siguiente = { ...actual };
        let cambio = false;

        Array.from({ length: totalSeries }, (_, i) => i + 1).forEach((numSerie) => {
          const actualSerie = siguiente[numSerie] || { peso: "", repeticiones: "" };
          const pesoFinal = esPesoCorporal && !actualSerie.peso ? "0" : actualSerie.peso;
          const repsFinal = esEjercicioPorTiempo ? "0" : actualSerie.repeticiones;

          if (actualSerie.peso !== pesoFinal || actualSerie.repeticiones !== repsFinal) {
            siguiente[numSerie] = {
              peso: pesoFinal,
              repeticiones: repsFinal,
            };
            cambio = true;
          }
        });

        return cambio ? siguiente : actual;
      });
    }
  }, [open, esEjercicioPorTiempo, esPesoCorporal, totalSeries, setSeriesRealizadas]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      {/* Bottom sheet */}
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:mb-6 sm:rounded-3xl">
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-zinc-700" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2 space-y-5">
          {/* Header del modal */}
          <div className="border-b border-zinc-800 pb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
              Registrar ejercicio
            </p>
            <h2 className="text-lg font-bold leading-snug text-zinc-100">
              {ejercicio?.nombre_ejercicio || ejercicio?.nombre || "Ejercicio"}
            </h2>
          </div>
          {/* Video card */}
          {videoUrl && (
            <div className="bg-zinc-800 rounded-2xl p-4">
              <div className="font-semibold text-zinc-200 mb-3">Video</div>

              <div className="flex gap-3 items-center">
                {miniaturaVideo ? (
                  <img
                    src={miniaturaVideo}
                    alt="Miniatura del video"
                    className="h-20 w-28 rounded-xl object-cover bg-zinc-900"
                  />
                ) : (
                  <div className="h-20 w-28 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500 text-xs">
                    Video
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-400 mb-3">
                    Video de referencia del ejercicio.
                  </p>
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    Ver
                  </a>
                </div>
              </div>
            </div>
          )}
          {esEjercicioPorTiempo && (
            <TemporizadorSeries
              series={totalSeries}
              duracionTrabajo={ejercicio?.duracion || ""}
              descanso={ejercicio?.descanso}
            />
          )}
          {/* Resultado card */}
          <div className="bg-zinc-800 rounded-2xl p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="font-semibold text-zinc-200">Resultado</div>
              {descansoInicial !== null && !esEjercicioPorTiempo && (
                <div className="w-44 shrink-0">
                  <DescansoTimer
                    ref={timerRef}
                    descansoInicial={descansoInicial}
                    totalSeries={totalSeries}
                    onEstadoCambio={manejarEstadoTimer}
                  />
                </div>
              )}
            </div>

            {esAvanzado ? (
              <div>
                {pesoPlanificado && (
                  <p className="text-sm font-semibold text-emerald-400 mb-3">
                    Peso: {pesoPlanificado} kg
                  </p>
                )}

                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Serie por serie
                </p>

                {seriesParaMostrar.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[64px_1fr_1fr_40px] gap-2 items-center">
                      <span className="text-sm text-zinc-500 font-medium">
                        Serie
                      </span>
                      <p className="text-xs text-zinc-500 mb-1 font-medium">
                        Repeticiones
                      </p>
                      <p className="text-xs text-zinc-500 mb-1 font-medium">
                        Peso (kg)
                      </p>
                      <div />
                    </div>
                    {seriesParaMostrar.map((serie) => {
                      const serieCompletada = seriesRealizadas[serie.numero_serie]?.peso && seriesRealizadas[serie.numero_serie]?.repeticiones;
                      return (
                        <div
                          key={serie.id || serie.numero_serie}
                          className="grid grid-cols-[64px_1fr_1fr_40px] gap-2 items-center"
                        >
                          <span className="text-sm text-zinc-500 font-medium">
                            Serie {serie.numero_serie}
                          </span>
                          <div>
                            {serie.repeticiones && (
                              <p className="text-[11px] text-zinc-600 mb-1">
                                Objetivo: {serie.repeticiones} reps
                              </p>
                            )}
                            <input
                              type="number"
                              value={seriesRealizadas[serie.numero_serie]?.repeticiones || ""}
                              onChange={(event) =>
                                setSeriesRealizadas?.((actual) => ({
                                  ...actual,
                                  [serie.numero_serie]: {
                                    repeticiones: event.target.value,
                                    peso: actual[serie.numero_serie]?.peso || "",
                                  },
                                }))
                              }
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                            />
                          </div>
                          <div>
                            {formatearObjetivoPesoSerie(serie) && (
                              <p className="text-[11px] text-zinc-600 mb-1">
                                Objetivo: {formatearObjetivoPesoSerie(serie)}
                              </p>
                            )}
                            <input
                              type="number"
                              value={seriesRealizadas[serie.numero_serie]?.peso || ""}
                              onChange={(event) =>
                                setSeriesRealizadas?.((actual) => ({
                                  ...actual,
                                  [serie.numero_serie]: {
                                    repeticiones: actual[serie.numero_serie]?.repeticiones || "",
                                    peso: event.target.value,
                                  },
                                }))
                              }
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                            />
                          </div>
                          <div
                            aria-label={serieCompletada ? "Serie completa" : "Serie incompleta"}
                            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                              serieCompletada
                                ? "bg-emerald-500 text-white"
                                : "bg-zinc-800 text-zinc-600"
                            }`}
                          >
                            {serieCompletada ? "✓" : "○"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">
                    No hay series avanzadas cargadas para este ejercicio.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {(pesoPlanificado || ejercicio?.repeticiones || esEjercicioPorTiempo) && (
                  <div className="flex flex-wrap gap-2 text-sm font-semibold text-emerald-400">
                    {pesoPlanificado && <span>Peso: {pesoPlanificado} kg</span>}
                    {esEjercicioPorTiempo ? (
                      <span>Tiempo: {ejercicio?.duracion} por serie</span>
                    ) : ejercicio?.repeticiones ? (
                      <span>Repeticiones: {ejercicio.repeticiones}</span>
                    ) : null}
                  </div>
                )}
                {!ocultarCargaSeriesPorTiempoPesoCorporal &&
                  Array.from({ length: totalSeries }, (_, i) => i + 1).map((numSerie) => {
                    const serieCompletada = esEjercicioPorTiempo
                      ? seriesRealizadas[numSerie]?.peso !== undefined && seriesRealizadas[numSerie]?.peso !== ""
                      : seriesRealizadas[numSerie]?.peso && seriesRealizadas[numSerie]?.repeticiones;
                    return (
                      <div key={numSerie} className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-zinc-400 w-20 shrink-0">
                          Serie {numSerie}:
                        </span>
                        {!esEjercicioPorTiempo && (
                          <div className="flex-1">
                            <p className="text-xs text-zinc-500 mb-1 font-medium">
                              Repeticiones
                            </p>
                            <input
                              type="number"
                              value={seriesRealizadas[numSerie]?.repeticiones || ""}
                              onChange={(event) =>
                                setSeriesRealizadas?.((actual) => ({
                                  ...actual,
                                  [numSerie]: {
                                    repeticiones: event.target.value,
                                    peso: actual[numSerie]?.peso || "",
                                  },
                                }))
                              }
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs text-zinc-500 mb-1 font-medium">
                            Peso (kg)
                          </p>
                          <input
                            type="number"
                            value={seriesRealizadas[numSerie]?.peso ?? (esPesoCorporal ? "0" : "")}
                            onChange={(event) =>
                              setSeriesRealizadas?.((actual) => ({
                                ...actual,
                                [numSerie]: {
                                  repeticiones: esEjercicioPorTiempo ? "0" : actual[numSerie]?.repeticiones || "",
                                  peso: event.target.value,
                                },
                              }))
                            }
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                          />
                        </div>
                        <div
                          aria-label={serieCompletada ? "Serie completa" : "Serie incompleta"}
                          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            serieCompletada
                              ? "bg-emerald-500 text-white"
                              : "bg-zinc-800 text-zinc-600"
                          }`}
                        >
                          {serieCompletada ? "✓" : "○"}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className={`${ocultarCargaSeriesPorTiempoPesoCorporal ? "grid grid-cols-1" : "grid grid-cols-2"} gap-3 mt-4`}>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  RPE *
                </label>
                <select
                  value={rpe}
                  onChange={(event) => setRpe?.(event.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="">—</option>
                  {opcionesRPE.map((valor) => (
                    <option key={valor} value={String(valor)}>
                      {valor}
                      {valor === 1 ? " · muy fácil" : valor === 10 ? " · máximo" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {!ocultarCargaSeriesPorTiempoPesoCorporal && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    RIR <span className="text-zinc-600 normal-case font-normal">(opcional)</span>
                  </label>
                  <select
                    value={rirReal}
                    onChange={(event) => setRirReal?.(event.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value="">—</option>
                    {opcionesRIR.map((valor) => (
                      <option key={valor} value={String(valor)}>
                        {valor}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-800 bg-zinc-900 px-5 py-4">
          {/* Footer */}
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 px-4 py-2 rounded-xl bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={guardandoEjercicio || !todasLasSeriesCompletas || !rpe}
              className={`flex-1 px-4 py-2 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2 ${
                guardandoEjercicio || !todasLasSeriesCompletas || !rpe
                  ? "bg-zinc-700 opacity-50 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
              onClick={() => {
                timerRef.current?.detenerAlarma();
                if (todasLasSeriesCompletas && rpe) {
                  onCompletar();
                }
              }}
            >
              {guardandoEjercicio && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {guardandoEjercicio ? "Guardando..." : textoBotonFinalizar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletarEjercicioModal;
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useIdioma } from "@/lib/i18n-context";
import { reproducirAlarma } from "@/lib/utils/alarma";

export type RutinaEjercicioBloque = {
  id: string;
  nombre_ejercicio: string;
  nombre_es?: string | null;
  nombre_en?: string | null;
  repeticiones?: string | null;
  bloque_orden?: number | null;
};

export type BloqueRutinaData = {
  bloque_id: string;
  rutina_id: string;
  modo: "amrap" | "circuito";
  tiempo_limite?: string | null;
  rondas_objetivo?: number | null;
  descanso_entre_rondas?: string | null;
  duracion_ronda?: string | null;
  tipo_tiempo_circuito?: "descanso_entre_rondas" | "duracion_ronda" | null;
  ejercicios: RutinaEjercicioBloque[];
};

export type BloqueCompletado = {
  bloque_id: string;
  rutina_id: string;
  rutina_asignacion_id: string;
  modo: "amrap" | "circuito";
  nombre_bloque: string;
  rondas_realizadas: number;
  tiempo_empleado_seg: number;
  objetivo_logrado: boolean | null;
  rpe: number;
  rir: number | null;
  ejercicios: RutinaEjercicioBloque[];
};

type Props = {
  bloque: BloqueRutinaData;
  asignacionId: string;
  completado: boolean;
  asignacionCompletada: boolean;
  deshaciendo: boolean;
  onGuardar: (datos: BloqueCompletado) => void;
  onDeshacer: () => void;
};

type Fase = "inactivo" | "corriendo" | "enDescanso" | "finalizando";

// Convierte los formatos de tiempo usados por la app a segundos.
// Soporta "2'30''" / "30''" / "20'" (formato del editor de rutinas), "1:30" (mm:ss),
// "20m" (minutos) y números planos (segundos).
function parsearSegundos(valor?: string | null): number | null {
  if (!valor) return null;
  const limpio = valor.trim().toLowerCase();
  if (!limpio) return null;

  // Formato M'SS'' — el que genera SelectorTiempo.
  const formato = limpio.match(/^(?:(\d+)'\s*)?(?:(\d+)'')?$/);
  if (formato && (formato[1] !== undefined || formato[2] !== undefined)) {
    return Number(formato[1] || 0) * 60 + Number(formato[2] || 0);
  }

  if (limpio.includes(":")) {
    const [min, seg] = limpio.split(":");
    const m = parseInt(min, 10) || 0;
    const s = parseInt(seg, 10) || 0;
    return m * 60 + s;
  }

  const numeros = parseFloat(limpio.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeros)) return null;
  return limpio.endsWith("m") ? Math.round(numeros * 60) : Math.round(numeros);
}

function formatearTiempo(totalSegundos: number): string {
  const seg = Math.max(0, Math.floor(totalSegundos));
  const minutos = Math.floor(seg / 60);
  const resto = seg % 60;
  return `${String(minutos).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

export default function BloqueEntrenamientoCard({
  bloque,
  asignacionId,
  completado,
  asignacionCompletada,
  deshaciendo,
  onGuardar,
  onDeshacer,
}: Props) {
  const { t } = useIdioma();
  const [fase, setFase] = useState<Fase>("inactivo");
  const [tiempoRestante, setTiempoRestante] = useState<number | null>(null);
  const [tiempoDescansoRestante, setTiempoDescansoRestante] = useState<number | null>(null);
  const [rondaActual, setRondaActual] = useState(1);
  const [segundosCorridos, setSegundosCorridos] = useState(0);
  const [rondasInput, setRondasInput] = useState("");
  const [rpe, setRpe] = useState("");
  const [rir, setRir] = useState("");
  const [error, setError] = useState<string | null>(null);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rondaRef = useRef(1);
  const trabajoRef = useRef<number | null>(null);
  const descansoRef = useRef<number | null>(null);

  const esAmrap = bloque.modo === "amrap";

  const duracionTotalSeg = esAmrap ? parsearSegundos(bloque.tiempo_limite) : null;
  const duracionRondaSeg = parsearSegundos(bloque.duracion_ronda);
  const descansoSeg = parsearSegundos(bloque.descanso_entre_rondas);
  const totalRondas =
    bloque.rondas_objetivo && bloque.rondas_objetivo > 0 ? bloque.rondas_objetivo : null;

  // Circuito con duración fija por ronda (countdown) vs. circuito con descanso entre rondas.
  const esCircuitoPorRonda =
    !esAmrap && bloque.tipo_tiempo_circuito === "duracion_ronda" && duracionRondaSeg !== null;

  const mostrarContadorRondas = !esAmrap && totalRondas !== null;
  const mostrarBotonTerminarRonda = !esAmrap && !esCircuitoPorRonda;

  const etiquetaCronometro =
    fase === "enDescanso"
      ? t("alumno.bloque.descansoEnCurso")
      : esAmrap || esCircuitoPorRonda
        ? t("alumno.bloque.tiempoRestante")
        : t("alumno.bloque.tiempoTranscurrido");

  const valorCronometro =
    fase === "enDescanso"
      ? tiempoDescansoRestante ?? 0
      : esAmrap || esCircuitoPorRonda
        ? tiempoRestante ?? 0
        : segundosCorridos;

  function detenerTemporizador() {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  }

  // Un único intervalo activo mientras el bloque corre (trabajo o descanso).
  // `segundosCorridos` acumula el tiempo total del bloque (trabajo + descansos).
  // Las transiciones de fase se resuelven dentro del callback para no encadenar efectos.
  useEffect(() => {
    if (fase !== "corriendo" && fase !== "enDescanso") return;

    const id = setInterval(() => {
      setSegundosCorridos((prev) => prev + 1);

      if (fase === "enDescanso") {
        const restante = Math.max(0, (descansoRef.current ?? 0) - 1);
        descansoRef.current = restante;
        setTiempoDescansoRestante(restante);

        if (restante === 0) {
          detenerTemporizador();
          reproducirAlarma();

          const siguienteRonda = rondaRef.current + 1;
          rondaRef.current = siguienteRonda;
          setRondaActual(siguienteRonda);

          descansoRef.current = null;
          setTiempoDescansoRestante(null);

          trabajoRef.current = duracionRondaSeg;
          setTiempoRestante(duracionRondaSeg);
          setFase("corriendo");
        }

        return;
      }

      // Circuito con descanso entre rondas: cronómetro ascendente, sin countdown.
      if (!esAmrap && !esCircuitoPorRonda) return;

      const restante = Math.max(0, (trabajoRef.current ?? 0) - 1);
      trabajoRef.current = restante;
      setTiempoRestante(restante);

      if (restante !== 0) return;

      detenerTemporizador();
      reproducirAlarma();

      if (esAmrap) {
        setFase("finalizando");
        return;
      }

      const alcanzoUltimaRonda = totalRondas !== null && rondaRef.current >= totalRondas;
      if (alcanzoUltimaRonda) {
        setFase("finalizando");
        return;
      }

      if (descansoSeg && descansoSeg > 0) {
        descansoRef.current = descansoSeg;
        setTiempoDescansoRestante(descansoSeg);
        setFase("enDescanso");
        return;
      }

      const siguienteRonda = rondaRef.current + 1;
      rondaRef.current = siguienteRonda;
      setRondaActual(siguienteRonda);

      trabajoRef.current = duracionRondaSeg;
      setTiempoRestante(duracionRondaSeg);
    }, 1000);

    intervaloRef.current = id;

    return () => clearInterval(id);
  }, [fase, esAmrap, esCircuitoPorRonda, totalRondas, descansoSeg, duracionRondaSeg]);

  function iniciar() {
    if (asignacionCompletada || completado) return;
    setError(null);
    setRondasInput("");
    setRpe("");
    setRir("");
    setSegundosCorridos(0);

    rondaRef.current = 1;
    setRondaActual(1);

    descansoRef.current = null;
    setTiempoDescansoRestante(null);

    const trabajoInicial = esAmrap
      ? duracionTotalSeg
      : esCircuitoPorRonda
        ? duracionRondaSeg
        : null;
    trabajoRef.current = trabajoInicial;
    setTiempoRestante(trabajoInicial);

    setFase("corriendo");
  }

  // Cierra la ronda actual (circuito con descanso entre rondas).
  function terminarRonda() {
    if (fase !== "corriendo") return;

    const alcanzoUltimaRonda = totalRondas !== null && rondaRef.current >= totalRondas;
    if (alcanzoUltimaRonda) {
      setFase("finalizando");
      return;
    }

    if (descansoSeg && descansoSeg > 0) {
      descansoRef.current = descansoSeg;
      setTiempoDescansoRestante(descansoSeg);
      setFase("enDescanso");
      return;
    }

    const siguienteRonda = rondaRef.current + 1;
    rondaRef.current = siguienteRonda;
    setRondaActual(siguienteRonda);
  }

  function cancelar() {
    detenerTemporizador();
    setFase("inactivo");
    setSegundosCorridos(0);
    trabajoRef.current = null;
    setTiempoRestante(null);
    descansoRef.current = null;
    setTiempoDescansoRestante(null);
    rondaRef.current = 1;
    setRondaActual(1);
    setRondasInput("");
    setRpe("");
    setRir("");
    setError(null);
  }

  function finalizar() {
    detenerTemporizador();
    setFase("finalizando");
  }

  function confirmarGuardado() {
    const rondas = parseInt(rondasInput, 10);
    const rpeNum = parseInt(rpe, 10);
    const rirNum = rir ? parseInt(rir, 10) : null;

    if (!Number.isFinite(rondas) || rondas < 0 || rondasInput.trim() === "") {
      setError(t("alumno.bloque.errorRondas"));
      return;
    }
    if (!Number.isFinite(rpeNum) || rpeNum < 1) {
      setError(t("alumno.bloque.errorRpe"));
      return;
    }

    const objetivo =
      bloque.rondas_objetivo && bloque.rondas_objetivo > 0
        ? rondas >= bloque.rondas_objetivo
        : null;

    onGuardar({
      bloque_id: bloque.bloque_id,
      rutina_id: bloque.rutina_id,
      rutina_asignacion_id: asignacionId,
      modo: bloque.modo,
      nombre_bloque: esAmrap ? "AMRAP" : t("alumno.bloque.circuitoTitulo"),
      rondas_realizadas: rondas,
      tiempo_empleado_seg: segundosCorridos,
      objetivo_logrado: objetivo,
      rpe: rpeNum,
      rir: Number.isFinite(rirNum) ? rirNum : null,
      ejercicios: bloque.ejercicios,
    });

    setFase("inactivo");
    setSegundosCorridos(0);
    trabajoRef.current = null;
    setTiempoRestante(null);
    descansoRef.current = null;
    setTiempoDescansoRestante(null);
    rondaRef.current = 1;
    setRondaActual(1);
  }

  const opcionesRPE = Array.from({ length: 10 }, (_, i) => i + 1);
  const opcionesRIR = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div
      className={`p-4 transition-colors ${
        completado ? "bg-emerald-950/20" : "hover:bg-zinc-800/30"
      }`}
    >
      <div className="flex gap-4">
        <div
          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 ${
            completado
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {completado ? "✓" : "◆"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`font-semibold text-base leading-snug ${
                completado ? "text-zinc-400" : "text-white"
              }`}
            >
              {esAmrap ? "AMRAP" : t("alumno.bloque.circuitoTitulo")}
            </h4>
            <span className="text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-700/40 px-2.5 py-0.5 uppercase tracking-wider">
              {esAmrap ? "AMRAP" : t("alumno.bloque.circuitoTag")}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-zinc-500 text-sm mt-1">
            {esAmrap && (
              <span>
                {t("alumno.bloque.tiempoLabel")}:{" "}
                <span className="text-zinc-300 font-medium">
                  {formatearTiempo(duracionTotalSeg ?? 0)}
                </span>
              </span>
            )}
            {bloque.rondas_objetivo ? (
              <span>
                {t("alumno.bloque.rondasObjetivo")}:{" "}
                <span className="text-zinc-300 font-medium">
                  {bloque.rondas_objetivo}
                </span>
              </span>
            ) : (
              <span>{t("alumno.bloque.sinRondasObjetivo")}</span>
            )}
            {!esAmrap && bloque.duracion_ronda && (
              <span>
                {t("alumno.bloque.duracionRonda")}:{" "}
                <span className="text-zinc-300 font-medium">
                  {bloque.duracion_ronda}
                </span>
              </span>
            )}
            {!esAmrap && bloque.descanso_entre_rondas && (
              <span>
                {t("alumno.bloque.descansoRonda")}:{" "}
                <span className="text-zinc-300 font-medium">
                  {bloque.descanso_entre_rondas}
                </span>
              </span>
            )}
          </div>


          <ol className="mt-3 space-y-1.5">
            {bloque.ejercicios.map((ej, idx) => (
              <li key={ej.id} className="flex items-baseline gap-2 text-sm">
                <span className="text-zinc-600 tabular-nums shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-zinc-200">{ej.nombre_ejercicio}</span>
                {ej.repeticiones && (
                  <span className="text-zinc-500 shrink-0">
                    {ej.repeticiones} {t("alumno.bloque.repsAbrev")}
                  </span>
                )}
              </li>
            ))}
          </ol>

          {completado ? (
            <button
              type="button"
              onClick={onDeshacer}
              disabled={deshaciendo}
              className="mt-4 w-full text-sm font-semibold rounded-xl py-2.5 border border-zinc-700 text-zinc-400 hover:text-yellow-400 hover:border-yellow-700/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deshaciendo ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  {t("alumno.deshaciendo")}
                </span>
              ) : (
                "↩ " + t("alumno.deshacer")
              )}
            </button>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {fase === "inactivo" && (
                <button
                  type="button"
                  onClick={iniciar}
                  disabled={asignacionCompletada}
                  className={`w-full text-sm font-semibold rounded-xl py-2.5 transition-colors ${
                    asignacionCompletada
                      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                      : "bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600"
                  }`}
                >
                  {t("alumno.bloque.comenzar")}
                </button>
              )}

              {(fase === "corriendo" || fase === "enDescanso") && (
                <>
                  {mostrarContadorRondas && (
                    <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2">
                      <span className="text-xs uppercase tracking-wider text-zinc-500">
                        {t("alumno.bloque.rondaActual")}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-zinc-200">
                        {rondaActual}
                        {totalRondas ? ` ${t("alumno.bloque.deTotal")} ${totalRondas}` : ""}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                      fase === "enDescanso"
                        ? "border-cyan-700/60 bg-cyan-500/5"
                        : "border-zinc-700 bg-zinc-950/60"
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider text-zinc-500">
                      {etiquetaCronometro}
                    </span>
                    <span
                      className={`text-2xl font-bold tabular-nums ${
                        fase === "enDescanso" ? "text-cyan-300" : "text-amber-400"
                      }`}
                    >
                      {formatearTiempo(valorCronometro)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {fase === "corriendo" && mostrarBotonTerminarRonda && (
                      <button
                        type="button"
                        onClick={terminarRonda}
                        className="flex-1 text-sm font-semibold rounded-xl py-2.5 bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600 transition-colors"
                      >
                        {t("alumno.bloque.terminarRonda")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={finalizar}
                      className={`flex-1 text-sm font-semibold rounded-xl py-2.5 transition-colors ${
                        fase === "corriendo" && mostrarBotonTerminarRonda
                          ? "border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500"
                          : "bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600"
                      }`}
                    >
                      {t("alumno.bloque.finalizar")}
                    </button>
                    <button
                      type="button"
                      onClick={cancelar}
                      className="flex-1 text-sm font-semibold rounded-xl py-2.5 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-700/50 transition-colors"
                    >
                      {t("common.cancelar")}
                    </button>
                  </div>
                </>
              )}


              {fase === "finalizando" && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      {t("alumno.bloque.rondasLabel")}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={rondasInput}
                      onChange={(e) => setRondasInput(e.target.value)}
                      placeholder={t("alumno.bloque.rondasPlaceholder")}
                      className="w-full bg-zinc-900 rounded-xl px-3 py-2.5 border border-zinc-700 text-white tabular-nums focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      {t("alumno.bloque.rpeLabel")}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {opcionesRPE.map((valor) => (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => setRpe(String(valor))}
                          className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                            rpe === String(valor)
                              ? "bg-emerald-500 text-white"
                              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          }`}
                        >
                          {valor}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      {t("alumno.bloque.rirLabel")}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {opcionesRIR.map((valor) => (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => setRir(String(valor))}
                          className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                            rir === String(valor)
                              ? "bg-emerald-500 text-white"
                              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          }`}
                        >
                          {valor}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmarGuardado}
                      className="flex-1 text-sm font-semibold rounded-xl py-2.5 bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600 transition-colors"
                    >
                      {t("common.guardar")}
                    </button>
                    <button
                      type="button"
                      onClick={cancelar}
                      className="flex-1 text-sm font-semibold rounded-xl py-2.5 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-700/50 transition-colors"
                    >
                      {t("alumno.bloque.descartar")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


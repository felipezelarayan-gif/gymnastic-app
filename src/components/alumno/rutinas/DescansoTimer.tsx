"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useIdioma } from "@/lib/i18n-context";

export type TimerEstado = {
  seriesCompletadas: number;
  serieActual: number;
  temporizadorActivo: boolean;
  segundosRestantes: number;
  todasLasSeriesCompletadas: boolean;
  alarmaActiva: boolean;
};

export type DescansoTimerHandle = {
  guardarSerie: () => void;
  iniciarDescanso: () => void;
  pausar: () => void;
  reanudar: () => void;
  reiniciar: () => void;
  detenerAlarma: () => void;
  agregar15s: () => void;
  getEstado: () => TimerEstado;
};

type DescansoTimerProps = {
  descansoInicial: number | null;
  totalSeries: number;
  onEstadoCambio?: (estado: TimerEstado) => void;
};

function formatearTiempo(segundos: number) {
  const minutos = Math.floor(segundos / 60);
  const segundosRestantes = segundos % 60;
  return `${minutos}:${String(segundosRestantes).padStart(2, "0")}`;
}

function reproducirAlarmaDescanso() {
  try {
    const AudioContextConstructor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) return;

    const audioContext = new AudioContextConstructor();
    const ahora = audioContext.currentTime;
    const frecuencias = [880, 1046, 880];

    frecuencias.forEach((frecuencia, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const inicio = ahora + index * 0.22;
      const fin = inicio + 0.16;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frecuencia, inicio);
      gain.gain.setValueAtTime(0.0001, inicio);
      gain.gain.exponentialRampToValueAtTime(0.2, inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, fin);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(inicio);
      oscillator.stop(fin);
    });

    window.setTimeout(() => {
      void audioContext.close();
    }, 1000);

    if (navigator.vibrate) {
      navigator.vibrate([200, 80, 200]);
    }
  } catch {
    // Algunos navegadores bloquean audio programático. En ese caso, solo no suena.
  }
}

const DescansoTimer = forwardRef<DescansoTimerHandle, DescansoTimerProps>(
  ({ descansoInicial, totalSeries, onEstadoCambio }, ref) => {
    const [seriesCompletadas, setSeriesCompletadas] = useState(0);
    const [temporizadorActivo, setTemporizadorActivo] = useState(false);
    const [segundosRestantes, setSegundosRestantes] = useState(descansoInicial ?? 0);
    const [todasLasSeriesCompletadas, setTodasLasSeriesCompletadas] = useState(false);
    const [alarmaActiva, setAlarmaActiva] = useState(false);

    const descansoValido = descansoInicial !== null && descansoInicial !== undefined && descansoInicial > 0;
    const serieActual = Math.min(seriesCompletadas + 1, totalSeries);

    const estadoRef = useRef<TimerEstado>({
      seriesCompletadas: 0,
      serieActual: 1,
      temporizadorActivo: false,
      segundosRestantes: descansoInicial ?? 0,
      todasLasSeriesCompletadas: false,
      alarmaActiva: false,
    });

    useEffect(() => {
      estadoRef.current = {
        seriesCompletadas,
        serieActual,
        temporizadorActivo,
        segundosRestantes,
        todasLasSeriesCompletadas,
        alarmaActiva,
      };
    }, [
      seriesCompletadas,
      serieActual,
      temporizadorActivo,
      segundosRestantes,
      todasLasSeriesCompletadas,
      alarmaActiva,
    ]);

    useEffect(() => {
      onEstadoCambio?.(estadoRef.current);
    }, [
      onEstadoCambio,
      seriesCompletadas,
      serieActual,
      temporizadorActivo,
      segundosRestantes,
      todasLasSeriesCompletadas,
      alarmaActiva,
    ]);

    useEffect(() => {
      setSeriesCompletadas(0);
      setTemporizadorActivo(false);
      setSegundosRestantes(descansoInicial ?? 0);
      setTodasLasSeriesCompletadas(false);
      setAlarmaActiva(false);
    }, [descansoInicial, totalSeries]);

    useEffect(() => {
      if (!alarmaActiva) {
        if (navigator.vibrate) {
          navigator.vibrate(0);
        }
        return;
      }

      reproducirAlarmaDescanso();

      const intervaloAlarma = window.setInterval(() => {
        reproducirAlarmaDescanso();
      }, 1400);

      return () => {
        window.clearInterval(intervaloAlarma);
        if (navigator.vibrate) {
          navigator.vibrate(0);
        }
      };
    }, [alarmaActiva]);

    useEffect(() => {
      if (!temporizadorActivo) return;

      if (segundosRestantes <= 0) {
        const nuevosDescansosCompletados = Math.min(seriesCompletadas + 1, totalSeries);

        setTemporizadorActivo(false);
        setAlarmaActiva(true);
        setSeriesCompletadas(nuevosDescansosCompletados);
        setTodasLasSeriesCompletadas(nuevosDescansosCompletados >= totalSeries);
        setSegundosRestantes(descansoInicial ?? 0);
        return;
      }

      const intervalo = window.setInterval(() => {
        setSegundosRestantes((actual) => Math.max(actual - 1, 0));
      }, 1000);

      return () => window.clearInterval(intervalo);
    }, [temporizadorActivo, segundosRestantes, seriesCompletadas, totalSeries, descansoInicial]);

    function iniciarDescanso() {
      if (!descansoValido || temporizadorActivo || todasLasSeriesCompletadas || alarmaActiva) return;

      setSegundosRestantes(descansoInicial);
      setTemporizadorActivo(true);
    }

    function guardarSerie() {
      iniciarDescanso();
    }

    function pausar() {
      setTemporizadorActivo(false);
    }

    function reanudar() {
      if (descansoValido && segundosRestantes > 0 && !todasLasSeriesCompletadas && !alarmaActiva) {
        setTemporizadorActivo(true);
      }
    }

    function reiniciar() {
      setTemporizadorActivo(false);
      setSegundosRestantes(descansoInicial ?? 0);
    }

    function detenerAlarma() {
      setAlarmaActiva(false);
    }

    function agregar15s() {
      setSegundosRestantes((actual) => actual + 15);
    }

    useImperativeHandle(ref, () => ({
      guardarSerie,
      iniciarDescanso,
      pausar,
      reanudar,
      reiniciar,
      detenerAlarma,
      agregar15s,
      getEstado: () => estadoRef.current,
    }));

    const { t } = useIdioma();
    const textoBoton = !descansoValido
      ? t("alumno.modal.sinDescanso")
      : temporizadorActivo
        ? formatearTiempo(segundosRestantes)
        : todasLasSeriesCompletadas
          ? t("alumno.modal.descansosCompletos")
          : t("alumno.modal.iniciarDescanso", { serie: Math.min(seriesCompletadas + 1, totalSeries), total: totalSeries });

    return (
      <>
        <button
          type="button"
          onClick={iniciarDescanso}
          disabled={!descansoValido || temporizadorActivo || todasLasSeriesCompletadas || alarmaActiva}
          className={`w-full rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
            temporizadorActivo
              ? "bg-blue-500/15 text-blue-300 border border-blue-500/40 tabular-nums"
              : todasLasSeriesCompletadas
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-700/50"
                : "bg-zinc-900 text-zinc-200 border border-zinc-700 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
          }`}
        >
          {textoBoton}
        </button>

        <p className="mt-2 text-[11px] text-zinc-500 leading-tight">
          {t("alumno.modal.cronometroPrueba")}
        </p>

        {alarmaActiva && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-2xl border border-amber-500/70 bg-zinc-900 p-6 shadow-2xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="text-lg font-bold text-amber-300">{t("alumno.modal.descansoFinalizado")}</h3>
              <p className="mt-2 text-sm text-zinc-400">
                {t("alumno.modal.alarmaSeguirSonando")}
              </p>
              <button
                type="button"
                onClick={detenerAlarma}
                className="mt-5 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-black hover:bg-amber-400 transition-colors"
              >
                {t("alumno.modal.detenerAlarma")}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
);

DescansoTimer.displayName = "DescansoTimer";

export default DescansoTimer;
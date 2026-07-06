"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FaseTemporizador = "idle" | "trabajo" | "descanso" | "finalizado";

type TemporizadorSeriesProps = {
  series: number;
  duracionTrabajo: string;
  descanso?: string | null;
  onFinalizado?: () => void;
};

function tiempoASegundos(valor?: string | null) {
  if (!valor) return 0;

  const limpio = valor.trim();
  const match = limpio.match(/^(?:(\d+)'\s*)?(?:(\d+)'')?$/);

  if (!match) return 0;

  const minutos = Number(match[1] ?? 0);
  const segundos = Number(match[2] ?? 0);

  return minutos * 60 + segundos;
}

function formatearSegundos(total: number) {
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;

  if (minutos === 0) return `${segundos}''`;
  return `${minutos}'${String(segundos).padStart(2, "0")}''`;
}

function reproducirBeep(tipo: "normal" | "doble" | "final" = "normal") {
  if (typeof window === "undefined") return;

  const frecuencia = tipo === "final" ? 520 : tipo === "doble" ? 1040 : 880;
  const duracion = tipo === "final" ? 0.32 : 0.09;
  const volumen = tipo === "final" ? 0.16 : tipo === "doble" ? 0.11 : 0.07;

  function beep(delay = 0) {
    window.setTimeout(() => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = tipo === "final" ? "triangle" : "sine";
        oscillator.frequency.value = frecuencia;
        gain.gain.value = volumen;

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duracion);

        oscillator.onended = () => {
          audioContext.close().catch(() => undefined);
        };
      } catch {
        // Algunos navegadores bloquean audio si no hubo interacción previa.
      }
    }, delay);
  }

  beep();

  if (tipo === "doble") {
    beep(140);
  }
}

export default function TemporizadorSeries({
  series,
  duracionTrabajo,
  descanso,
  onFinalizado,
}: TemporizadorSeriesProps) {
  const segundosTrabajo = useMemo(() => tiempoASegundos(duracionTrabajo), [duracionTrabajo]);
  const segundosDescanso = useMemo(() => tiempoASegundos(descanso), [descanso]);

  const [fase, setFase] = useState<FaseTemporizador>("idle");
  const [serieActual, setSerieActual] = useState(1);
  const [segundosRestantes, setSegundosRestantes] = useState(segundosTrabajo);
  const [pausado, setPausado] = useState(false);
  const ultimoBeepRef = useRef<number | null>(null);
  const cambioEnProgresoRef = useRef(false);

  useEffect(() => {
    if (fase !== "idle") return;
    setSegundosRestantes(segundosTrabajo);
  }, [fase, segundosTrabajo]);

  useEffect(() => {
    if (fase !== "trabajo" && fase !== "descanso") {
      ultimoBeepRef.current = null;
      return;
    }

    if (pausado) return;

    if (segundosRestantes > 0 && ultimoBeepRef.current !== segundosRestantes) {
      ultimoBeepRef.current = segundosRestantes;
      reproducirBeep(segundosRestantes <= 3 ? "doble" : "normal");
    }
  }, [fase, pausado, segundosRestantes]);

  useEffect(() => {
    if (fase === "idle" || fase === "finalizado" || pausado) return;

    const intervalo = window.setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev > 1) return prev - 1;

        if (!cambioEnProgresoRef.current) {
          cambioEnProgresoRef.current = true;
          avanzarFase();
        }

        return 0;
      });
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [fase, pausado, serieActual, segundosTrabajo, segundosDescanso]);

  function iniciar() {
    if (segundosTrabajo <= 0 || series <= 0) return;
    setSerieActual(1);
    setFase("trabajo");
    setPausado(false);
    setSegundosRestantes(segundosTrabajo);
    ultimoBeepRef.current = null;
    cambioEnProgresoRef.current = false;
  }

  function reiniciar() {
    setFase("idle");
    setSerieActual(1);
    setPausado(false);
    setSegundosRestantes(segundosTrabajo);
    ultimoBeepRef.current = null;
    cambioEnProgresoRef.current = false;
  }

  function avanzarFase() {
    if (fase === "trabajo") {
      reproducirBeep("final");

      if (segundosDescanso > 0) {
        setFase("descanso");
        setSegundosRestantes(segundosDescanso);
        ultimoBeepRef.current = null;
        cambioEnProgresoRef.current = false;
        return;
      }

      if (serieActual < series) {
        const proximaSerie = serieActual + 1;
        setSerieActual(proximaSerie);
        setFase("trabajo");
        setSegundosRestantes(segundosTrabajo);
        ultimoBeepRef.current = null;
        cambioEnProgresoRef.current = false;
        return;
      }

      setFase("finalizado");
      setPausado(false);
      ultimoBeepRef.current = null;
      cambioEnProgresoRef.current = false;
      onFinalizado?.();
      return;
    }

    if (fase === "descanso") {
      reproducirBeep("final");

      if (serieActual < series) {
        const proximaSerie = serieActual + 1;
        setSerieActual(proximaSerie);
        setFase("trabajo");
        setSegundosRestantes(segundosTrabajo);
        ultimoBeepRef.current = null;
        cambioEnProgresoRef.current = false;
        return;
      }

      setFase("finalizado");
      setPausado(false);
      ultimoBeepRef.current = null;
      cambioEnProgresoRef.current = false;
      onFinalizado?.();
    }
  }

  const porcentaje = (() => {
    const totalFase = fase === "descanso" ? segundosDescanso : segundosTrabajo;
    if (!totalFase) return 0;
    return Math.max(0, Math.min(100, ((totalFase - segundosRestantes) / totalFase) * 100));
  })();

  const etiquetaFase =
    fase === "trabajo"
      ? "Trabajo"
      : fase === "descanso"
        ? "Descanso"
        : fase === "finalizado"
          ? "Finalizado"
          : "Listo para iniciar";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
            Temporizador
          </p>
          <h4 className="mt-1 text-lg font-bold text-zinc-100">
            {etiquetaFase}
          </h4>
          <p className="mt-1 text-sm text-zinc-500">
            Serie {Math.min(serieActual, series)} de {series}
          </p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-black tabular-nums text-white">
            {fase === "idle" ? formatearSegundos(segundosTrabajo) : formatearSegundos(segundosRestantes)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Trabajo {duracionTrabajo}{descanso ? ` · Descanso ${descanso}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${fase === "idle" ? 0 : fase === "finalizado" ? 100 : porcentaje}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {fase === "idle" || fase === "finalizado" ? (
          <button
            type="button"
            onClick={iniciar}
            disabled={segundosTrabajo <= 0 || series <= 0}
            className="col-span-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Iniciar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPausado((prev) => !prev)}
            className="col-span-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-600"
          >
            {pausado ? "Continuar" : "Pausar"}
          </button>
        )}

        <button
          type="button"
          onClick={reiniciar}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          Reiniciar
        </button>
      </div>

      {fase !== "idle" && fase !== "finalizado" && (
        <button
          type="button"
          onClick={avanzarFase}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          Saltar fase
        </button>
      )}

      <p className="mt-3 text-[11px] text-zinc-500 leading-tight">
        ⏱️ Ten en cuenta que el cronómetro está en prueba y puede no funcionar mientras escuchas música, abres otras aplicaciones o el dispositivo está bloqueado.
      </p>
    </div>
  );
}

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useIdioma } from "@/lib/i18n-context";

type Props = {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  pendingDates?: string[];
  completedDates?: string[];
  overdueDates?: string[];
};

const DIAS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MESES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function WeeklyDatePicker({
  selectedDate,
  onDateChange,
  pendingDates = [],
  completedDates = [],
  overdueDates = [],
}: Props) {
  const { t, idioma } = useIdioma();
  const containerRef = useRef<HTMLDivElement>(null);
  // La ventana de 7 días se centra en la fecha seleccionada (hoy al cargar):
  // [seleccionada - 3] [seleccionada - 2] [seleccionada - 1] [seleccionada] [+1] [+2] [+3]
  const [semanaInicio, setSemanaInicio] = useState(() => {
    const fecha = new Date(selectedDate);
    fecha.setDate(fecha.getDate() - 3);
    return fecha;
  });

  // Ref sincronizado con semanaInicio para evitar closures stale en los handlers de swipe
  const semanaInicioRef = useRef(semanaInicio);
  semanaInicioRef.current = semanaInicio;

  // Refs para el gesto de swipe
  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef(0);

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(semanaInicio);
    fecha.setDate(semanaInicio.getDate() + i);
    return fecha;
  });

  function cambiarSemana(direccion: number) {
    const actual = semanaInicioRef.current;
    const nueva = new Date(actual);
    nueva.setDate(actual.getDate() + direccion * 7);
    setSemanaInicio(nueva);
  }

  function hoy() {
    const hoy = new Date();
    const centrado = new Date(hoy);
    centrado.setDate(centrado.getDate() - 3);
    setSemanaInicio(centrado);
    onDateChange(new Date());
  }

  function irALunes() {
    onDateChange(new Date(semanaInicio));
  }

  const diaActivo = useCallback((fecha: Date) => {
    return formatDateKey(fecha) === formatDateKey(selectedDate);
  }, [selectedDate]);

  // Handlers para desplazamiento horizontal (swipe) usando touch events
  // (los touch events no interfieren con el click de los botones de los días)
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchDeltaXRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return;
    const touch = e.touches[0];
    touchDeltaXRef.current = touch.clientX - touchStartXRef.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const delta = touchDeltaXRef.current;
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;

    // Umbral de ~50px para detectar el swipe
    if (Math.abs(delta) < 50) return;

    // Si se desliza a la izquierda → semana siguiente; a la derecha → semana anterior
    if (delta < 0) {
      cambiarSemana(1);
    } else {
      cambiarSemana(-1);
    }
  }, []);

  return (
    <div className="bg-zinc-900 rounded-xl p-4 shadow">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => cambiarSemana(-1)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800">←</button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {(idioma === "en" ? MESES_EN : MESES_ES)[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </span>
          {formatDateKey(selectedDate) !== formatDateKey(new Date()) && (
            <button type="button" onClick={hoy} className="rounded-lg border border-emerald-700 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-950">{t("weeklyDatePicker.hoy")}</button>
          )}
        </div>
        <button type="button" onClick={() => cambiarSemana(1)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800">→</button>
      </div>

      <div
        ref={containerRef}
        className="grid grid-cols-7 gap-1 select-none cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {diasSemana.map((fecha) => {
          const key = formatDateKey(fecha);
          const activo = diaActivo(fecha);
          const esHoy = key === formatDateKey(new Date());
          const tieneOverdue = overdueDates.includes(key);
          const tienePending = pendingDates.includes(key);
          const tieneCompletado = completedDates.includes(key);

          let dotClass = "";
          if (tieneOverdue) dotClass = "bg-red-400";
          else if (tienePending) dotClass = "bg-orange-400";
          else if (tieneCompletado) dotClass = "bg-zinc-500";

          return (
            <button key={key} type="button" onClick={() => onDateChange(fecha)}
              className={`flex flex-col items-center rounded-xl py-1.5 transition ${activo ? "bg-emerald-600 text-white" : esHoy ? "bg-zinc-800 text-zinc-200" : "hover:bg-zinc-800 text-zinc-400"}`}>
              <span className="text-xs">{(idioma === "en" ? DIAS_EN : DIAS_ES)[fecha.getDay()]}</span>
              <span className="text-lg font-semibold leading-tight">{fecha.getDate()}</span>
              {dotClass && <span className={`mt-0.5 h-1 w-1 rounded-full ${dotClass}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
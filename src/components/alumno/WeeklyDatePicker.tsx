"use client";

import { useRef, useState, useEffect, useCallback } from "react";

type Props = {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  datesWithActivity?: string[];
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes como inicio
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function WeeklyDatePicker({
  selectedDate,
  onDateChange,
  datesWithActivity = [],
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(selectedDate));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(weekStart, i));
  }

  const weekNumber = Math.ceil(
    ((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) /
      86400000 +
      1) /
      7
  );

  function prevWeek() {
    setWeekStart((prev) => addDays(prev, -7));
  }

  function nextWeek() {
    setWeekStart((prev) => addDays(prev, 7));
  }

  function goToToday() {
    const todayStart = getWeekStart(new Date());
    setWeekStart(todayStart);
    onDateChange(new Date());
  }

  const scrollToSelected = useCallback(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const children = container.children;
    const selectedKey = formatDateKey(selectedDate);
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      if (child.dataset.date === selectedKey) {
        const scrollLeft = child.offsetLeft - container.offsetWidth / 2 + child.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
        break;
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    scrollToSelected();
  }, [scrollToSelected]);

  useEffect(() => {
    scrollToSelected();
  }, [weekStart, scrollToSelected]);

  const isToday = (date: Date) => formatDateKey(date) === formatDateKey(today);
  const isSelected = (date: Date) => formatDateKey(date) === formatDateKey(selectedDate);
  const hasActivity = (date: Date) => datesWithActivity.includes(formatDateKey(date));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      {/* Header: mes/año + navegación */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevWeek}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-200">
            {MESES[weekStart.getMonth()]} {weekStart.getFullYear()}
          </span>
          <button
            type="button"
            onClick={goToToday}
            className="ml-1 text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            Hoy
          </button>
        </div>

        <button
          type="button"
          onClick={nextWeek}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Días de la semana - scroll horizontal */}
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {days.map((date) => {
          const daySelected = isSelected(date);
          const dayToday = isToday(date);
          const dayHasActivity = hasActivity(date);
          const diaSemana = DIAS[date.getDay()];
          const diaNum = date.getDate();

          return (
            <button
              key={formatDateKey(date)}
              data-date={formatDateKey(date)}
              type="button"
              onClick={() => onDateChange(date)}
              className={`snap-center flex flex-col items-center min-w-[52px] py-2 px-1 rounded-xl transition-all duration-150 ${
                daySelected
                  ? "bg-emerald-500/20 border border-emerald-500/50"
                  : dayToday
                  ? "bg-zinc-800/60 border border-zinc-700"
                  : "hover:bg-zinc-800/40 border border-transparent"
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                daySelected ? "text-emerald-400" : dayToday ? "text-white" : "text-zinc-500"
              }`}>
                {diaSemana}
              </span>

              <span className={`text-lg font-bold leading-none mb-1 ${
                daySelected ? "text-emerald-300" : dayToday ? "text-white" : "text-zinc-300"
              }`}>
                {diaNum}
              </span>

              <div className="h-1.5 flex items-center justify-center">
                {dayHasActivity && (
                  <span className={`block w-1.5 h-1.5 rounded-full ${
                    daySelected ? "bg-emerald-400" : "bg-emerald-500/60"
                  }`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
"use client";

import { useState, type ReactElement } from "react";
import { useIdioma } from "@/lib/i18n-context";
import { formatearFechaCorta } from "@/lib/utils/formatearFecha";

type CalendarioFiltroProps = {
  fechasConActividades: string[];
  fechaSeleccionada: string | null;
  onSeleccionarFecha: (fecha: string | null) => void;
  expandido?: boolean;
  onToggle?: () => void;
};

type Mes = {
  year: number;
  month: number; // 0-11
};

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Función auxiliar para obtener fecha en formato YYYY-MM-DD en zona horaria local
function obtenerFechaLocal(year: number, month: number, day: number): string {
  const fecha = new Date(year, month, day);
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

export default function CalendarioFiltro({
  fechasConActividades,
  fechaSeleccionada,
  onSeleccionarFecha,
  expandido = true,
  onToggle,
}: CalendarioFiltroProps) {
  const { t } = useIdioma();
  const [mesActual, setMesActual] = useState<Mes>(() => {
    const hoy = new Date();
    return { year: hoy.getFullYear(), month: hoy.getMonth() };
  });

  const primerDiaDelMes = new Date(mesActual.year, mesActual.month, 1);
  const ultimoDiaDelMes = new Date(mesActual.year, mesActual.month + 1, 0);
  const diasEnMes = ultimoDiaDelMes.getDate();
  const diaInicioSemana = primerDiaDelMes.getDay(); // 0 = Domingo

  // Normalizar fechas de actividades a formato YYYY-MM-DD
  const fechasSet = new Set(
    fechasConActividades.map(f => {
      // Si la fecha viene con timezone, extraer solo la parte de fecha
      if (f.includes('T')) {
        return f.split('T')[0];
      }
      return f;
    })
  );

  const irMesAnterior = () => {
    setMesActual(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const irMesSiguiente = () => {
    setMesActual(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const irHoy = () => {
    const hoy = new Date();
    setMesActual({ year: hoy.getFullYear(), month: hoy.getMonth() });
  };

  const seleccionarDia = (dia: number) => {
    const fechaStr = obtenerFechaLocal(mesActual.year, mesActual.month, dia);
    
    if (fechaSeleccionada === fechaStr) {
      onSeleccionarFecha(null);
    } else {
      onSeleccionarFecha(fechaStr);
    }
  };

  const limpiarSeleccion = () => {
    onSeleccionarFecha(null);
  };

  const esHoy = (dia: number) => {
    const hoy = new Date();
    return (
      dia === hoy.getDate() &&
      mesActual.month === hoy.getMonth() &&
      mesActual.year === hoy.getFullYear()
    );
  };

  const esSeleccionado = (dia: number) => {
    if (!fechaSeleccionada) return false;
    const fechaStr = obtenerFechaLocal(mesActual.year, mesActual.month, dia);
    return fechaSeleccionada === fechaStr;
  };

  const renderizarDias = (): ReactElement[] => {
    const dias: ReactElement[] = [];

    // Celdas vacías antes del primer día
    for (let i = 0; i < diaInicioSemana; i++) {
      dias.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaStr = obtenerFechaLocal(mesActual.year, mesActual.month, dia);
      const tieneActividad = fechasSet.has(fechaStr);
      const seleccionado = esSeleccionado(dia);
      const hoy = esHoy(dia);

      dias.push(
        <button
          key={dia}
          type="button"
          onClick={() => seleccionarDia(dia)}
          className={`
            relative min-h-[44px] md:min-h-[48px] rounded-lg flex items-center justify-center py-1.5
            text-xs md:text-sm font-medium transition-all
            ${seleccionado
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
              : hoy
                ? "border border-emerald-500 text-emerald-300 hover:bg-emerald-500/10"
                : "text-zinc-300 hover:bg-zinc-800"
            }
            ${tieneActividad && !seleccionado ? "font-semibold" : ""}
          `}
        >
          {dia}
          {tieneActividad && (
            <span
              className={`
                absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full
                ${seleccionado ? "bg-white" : "bg-emerald-400"}
              `}
            />
          )}
        </button>
      );
    }

    return dias;
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
      {/* Header con botón toggle */}
      <div className="flex items-center justify-between gap-2 p-3 md:p-4">
        <h3 className="text-sm md:text-base font-bold text-white">
          {t("alumno.historial.buscarPorFecha")}
        </h3>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="rounded-full border border-zinc-700 p-2 min-w-[44px] min-h-[44px] text-zinc-300 hover:border-zinc-500 hover:text-white transition"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${expandido ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {expandido && (
        <>
          {/* Navegación del calendario */}
          <div className="flex items-center justify-between px-3 md:px-4 mb-3">
            <button
              type="button"
              onClick={irMesAnterior}
              className="rounded-full border border-zinc-700 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-300 hover:border-zinc-500 hover:text-white transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-white">
                {MESES[mesActual.month]} {mesActual.year}
              </h3>
              <button
                type="button"
                onClick={irHoy}
                className="text-xs md:text-sm text-emerald-400 hover:text-emerald-300 font-semibold px-3 py-1.5"
              >
                Hoy
              </button>
            </div>

            <button
              type="button"
              onClick={irMesSiguiente}
              className="rounded-full border border-zinc-700 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-300 hover:border-zinc-500 hover:text-white transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 px-3 md:px-4 mb-1">
        {DIAS_SEMANA.map(dia => (
          <div
            key={dia}
            className="text-center text-xs md:text-sm font-semibold text-zinc-500 py-2"
          >
            {dia}
          </div>
        ))}
      </div>

      {/* Días del mes */}
      <div className="grid grid-cols-7 gap-1 px-3 md:px-4">
        {renderizarDias()}
      </div>

      {/* Información del día seleccionado */}
      {fechaSeleccionada && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">{t("alumno.historial.fechaSeleccionada")}</p>
              <p className="text-base font-semibold text-white mt-1">
                {formatearFechaCorta(fechaSeleccionada)}
              </p>
            </div>
            <button
              type="button"
              onClick={limpiarSeleccion}
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white transition"
            >
              {t("alumno.historial.limpiar")}
            </button>
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{t("alumno.historial.diaConEntrenamiento")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full border-2 border-emerald-500" />
          <span>{t("alumno.historial.hoy")}</span>
        </div>
      </div>
    </>
  )}
    </div>
  );
}

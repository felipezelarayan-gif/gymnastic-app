import React from "react";

type Alumno = {
  id: string;
  nombre: string;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  foto_url?: string | null;
};

type AlumnoCardProps = {
  alumno: Alumno;
  pendientes: number;
  finalizados: number;
  ultimoEntrenamiento: string;
  metricasLoading: boolean;
};

export const AlumnoCard = React.memo(function AlumnoCard({
  alumno,
  pendientes,
  finalizados,
  ultimoEntrenamiento,
  metricasLoading,
}: AlumnoCardProps) {
  function iniciales(nombre?: string | null, apellido?: string | null) {
    const primera = nombre?.charAt(0) || "";
    const segunda = apellido?.charAt(0) || "";
    return `${primera}${segunda}`.toUpperCase() || "A";
  }

  function nombreCompleto(alumno: Alumno) {
    return `${alumno.nombre || ""} ${alumno.apellido || ""}`.trim();
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 md:p-5 hover:border-zinc-700 hover:bg-zinc-800/70 transition">
      <div className="md:hidden flex items-center justify-between gap-2">
        <a
          href={`/alumnos/${alumno.id}`}
          className="flex items-center gap-3 min-w-0"
        >
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0 overflow-hidden">
            {alumno.foto_url ? (
              <img
                src={alumno.foto_url}
                alt="Foto de perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              iniciales(alumno.nombre, alumno.apellido)
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold truncate text-sm">
              {nombreCompleto(alumno)}
            </h3>
            <p className="text-xs text-emerald-400 mt-0.5">
              {metricasLoading ? "..." : pendientes} pendientes
            </p>
          </div>
        </a>

        <div className="flex gap-2 shrink-0">
          <a href={`/alumnos/${alumno.id}/historial`} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition">📋</a>
          <a href={`/alumnos/${alumno.id}/rutinas`} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition">🏋️</a>
          <a href={`/alumnos/${alumno.id}`} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition">👤</a>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-4">
        <a href={`/alumnos/${alumno.id}`} className="flex items-center gap-4 min-w-0 flex-1 hover:opacity-80 transition">
          <div className="h-[50px] w-[50px] rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0 overflow-hidden">
            {alumno.foto_url ? (
              <img src={alumno.foto_url} alt="Foto" className="h-full w-full object-cover" />
            ) : (
              iniciales(alumno.nombre, alumno.apellido)
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold truncate">
              {nombreCompleto(alumno)}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ultimo: {metricasLoading ? "..." : ultimoEntrenamiento}
            </p>
            <p className="text-xs text-zinc-500 mt-1.5">
              {alumno.email && <span>{alumno.email} · </span>}
              {metricasLoading ? "..." : `${finalizados} finalizados · ${pendientes} pendientes`}
            </p>
          </div>
        </a>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-2.5 text-center shrink-0">
          <p className="text-xl font-bold text-emerald-400">{metricasLoading ? "..." : pendientes}</p>
          <p className="text-xs text-zinc-500 leading-tight">Pendientes</p>
        </div>

        <div className="flex gap-2 shrink-0">
          <a href={`/alumnos/${alumno.id}`} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition">Perfil</a>
          <a href={`/alumnos/${alumno.id}/rutinas`} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition">Rutina</a>
          <a href={`/alumnos/${alumno.id}/historial`} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition">Historial</a>
        </div>
      </div>
    </div>
  );
});
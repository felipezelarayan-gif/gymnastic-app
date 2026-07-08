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
      <a
        href={`/alumnos/${alumno.id}`}
        className="md:hidden flex items-center gap-3"
      >
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center font-bold text-emerald-400 shrink-0 overflow-hidden">
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

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">
            {nombreCompleto(alumno)}
          </h3>

          <p className="text-xs text-emerald-400 mt-1">
            {metricasLoading ? "..." : pendientes} pendientes
          </p>
        </div>
      </a>

      <div className="hidden md:flex items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center text-xl font-bold text-emerald-400 shrink-0 overflow-hidden">
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
            <h3 className="text-lg font-semibold truncate">
              {nombreCompleto(alumno)}
            </h3>

            <p className="text-zinc-400 text-sm mt-1">
              Último entrenamiento:{" "}
              {metricasLoading
                ? "..."
                : ultimoEntrenamiento || "Sin entrenamientos completados"}
            </p>

            <div className="flex flex-wrap gap-2 mt-2 text-xs text-zinc-500">
              {alumno.email && <span>{alumno.email}</span>}
              {alumno.telefono && <span>· {alumno.telefono}</span>}
              <span>
                · {metricasLoading ? "..." : finalizados}{" "}
                finalizados
              </span>
              <span>
                · {metricasLoading ? "..." : pendientes}{" "}
                pendientes
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-center">
          <p className="text-xl font-bold text-emerald-400">
            {metricasLoading ? "..." : pendientes}
          </p>
          <p className="text-xs text-zinc-500">pendientes</p>
        </div>

        <div className="flex gap-2 shrink-0">
          <a
            href={`/alumnos/${alumno.id}`}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
          >
            Ver perfil
          </a>

          <a
            href={`/alumnos/${alumno.id}/rutinas`}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
          >
            Rutina
          </a>

          <a
            href={`/alumnos/${alumno.id}/historial`}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
          >
            Historial
          </a>
        </div>
      </div>
    </div>
  );
});
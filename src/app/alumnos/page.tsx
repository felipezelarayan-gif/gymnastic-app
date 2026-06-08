"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Alumno = {
  id: string;
  nombre: string;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  foto_url?: string | null;
  created_at?: string | null;
};

type RutinaAsignada = {
  id: string;
  rutina_id: string;
  alumno_id: string;
  completada?: boolean | null;
  fecha_completada?: string | null;
  fecha_asignacion?: string | null;
};

type RegistroEntrenamiento = {
  id: string;
  alumno_id: string;
  rutina_id?: string | null;
  completado?: boolean | null;
};

type OrdenarPor =
  | "nombre"
  | "antiguedad"
  | "entrenamientos_finalizados"
  | "entrenamientos_pendientes";

type Orden = "asc" | "desc";

export default function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [rutinasAsignadas, setRutinasAsignadas] = useState<RutinaAsignada[]>([]);
  const [registrosEntrenamiento, setRegistrosEntrenamiento] = useState<
    RegistroEntrenamiento[]
  >([]);

  const [busqueda, setBusqueda] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>("nombre");
  const [orden, setOrden] = useState<Orden>("asc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificarPermiso();
  }, []);

  async function verificarPermiso() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const user = sessionData.session.user;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (error || !profile || profile.rol !== "profe") {
      window.location.href = "/alumno";
      return;
    }

    await cargarDatos();
  }

  async function cargarDatos() {
    setLoading(true);

    const { data: alumnosData, error: alumnosError } = await supabase
      .from("alumnos")
      .select("*")
      .order("nombre", { ascending: true });

    if (alumnosError) {
      alert(alumnosError.message);
      setLoading(false);
      return;
    }

    const { data: rutinasData, error: rutinasError } = await supabase
      .from("rutina_asignaciones")
      .select(
        "id,rutina_id,alumno_id,completada,fecha_completada,fecha_asignacion"
      );

    if (rutinasError) {
      alert(rutinasError.message);
      setLoading(false);
      return;
    }

    const { data: registrosData, error: registrosError } = await supabase
      .from("registros_entrenamiento")
      .select("id,alumno_id,rutina_id,completado")
      .eq("completado", true);

    if (registrosError) {
      alert(registrosError.message);
      setLoading(false);
      return;
    }

    setAlumnos((alumnosData || []) as Alumno[]);
    setRutinasAsignadas((rutinasData || []) as RutinaAsignada[]);
    setRegistrosEntrenamiento((registrosData || []) as RegistroEntrenamiento[]);
    setLoading(false);
  }

  function iniciales(nombre?: string | null, apellido?: string | null) {
    const primera = nombre?.charAt(0) || "";
    const segunda = apellido?.charAt(0) || "";
    return `${primera}${segunda}`.toUpperCase() || "A";
  }

  function nombreCompleto(alumno: Alumno) {
    return `${alumno.nombre || ""} ${alumno.apellido || ""}`.trim();
  }

  function entrenamientosFinalizados(alumnoId: string) {
  return rutinasAsignadas.filter(
    (rutina) =>
      rutina.alumno_id === alumnoId &&
      rutina.completada === true
  ).length;
}

  function entrenamientosPendientes(alumnoId: string) {
  return rutinasAsignadas.filter(
    (rutina) =>
      rutina.alumno_id === alumnoId &&
      !rutina.completada
  ).length;
}

  function ultimoEntrenamiento(alumnoId: string) {
  const completadas = rutinasAsignadas
    .filter(
      (rutina) =>
        rutina.alumno_id === alumnoId &&
        rutina.completada === true
    )
    .sort((a, b) => {
      const fechaA = a.fecha_completada || a.fecha_asignacion || "";
      const fechaB = b.fecha_completada || b.fecha_asignacion || "";
      return fechaB.localeCompare(fechaA);
    });

  const ultima = completadas[0];

  if (!ultima) return "Sin entrenamientos completados";

  const fecha = ultima.fecha_completada || ultima.fecha_asignacion;
  if (!fecha) return "Sin fecha registrada";

  const fechaUltima = new Date(fecha);
  const hoy = new Date();

  const diferenciaMs = hoy.getTime() - fechaUltima.getTime();
  const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));

  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Hace 1 día";

  return `Hace ${dias} días`;
}

  const alumnosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    let resultado = alumnos.filter((alumno) => {
      const contenido = [
        alumno.nombre,
        alumno.apellido,
        alumno.email,
        alumno.telefono,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });

    resultado = [...resultado].sort((a, b) => {
      if (ordenarPor === "nombre") {
        const valorA = nombreCompleto(a).toLowerCase();
        const valorB = nombreCompleto(b).toLowerCase();

        return orden === "asc"
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA);
      }

      if (ordenarPor === "antiguedad") {
        const valorA = a.created_at || "";
        const valorB = b.created_at || "";

        return orden === "asc"
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA);
      }

      if (ordenarPor === "entrenamientos_finalizados") {
        const finalizadosA = entrenamientosFinalizados(a.id);
        const finalizadosB = entrenamientosFinalizados(b.id);

        return orden === "asc"
          ? finalizadosA - finalizadosB
          : finalizadosB - finalizadosA;
      }

      if (ordenarPor === "entrenamientos_pendientes") {
        const pendientesA = entrenamientosPendientes(a.id);
        const pendientesB = entrenamientosPendientes(b.id);

        return orden === "asc"
          ? pendientesA - pendientesB
          : pendientesB - pendientesA;
      }

      return 0;
    });

    return resultado;
  }, [
    alumnos,
    busqueda,
    ordenarPor,
    orden,
    rutinasAsignadas,
    registrosEntrenamiento,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando alumnos...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Alumnos</h1>
            <p className="text-zinc-400 mt-1">
              {alumnos.length}{" "}
              {alumnos.length === 1
                ? "alumno registrado"
                : "alumnos registrados"}
            </p>
          </div>

          <a
            href="/alumnos/nuevo"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600 transition"
          >
            + Agregar alumno
          </a>
        </header>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-5">
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, email o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 outline-none focus:border-emerald-500"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Ordenar por
              </label>

              <select
                value={ordenarPor}
                onChange={(e) => setOrdenarPor(e.target.value as OrdenarPor)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3"
              >
                <option value="nombre">Nombre</option>
                <option value="antiguedad">Antigüedad</option>
                <option value="entrenamientos_finalizados">
                  Entrenamientos finalizados
                </option>
                <option value="entrenamientos_pendientes">
                  Entrenamientos pendientes
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Orden</label>

              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value as Orden)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3"
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </div>
          </div>
        </section>

        {alumnosFiltrados.length === 0 ? (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-semibold">No se encontraron alumnos</h2>
            <p className="text-zinc-400 mt-2">
              Probá con otro nombre, email o teléfono.
            </p>
          </section>
        ) : (
          <div className="grid gap-3">
            {alumnosFiltrados.map((alumno) => (
              <div
                key={alumno.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 md:p-5 hover:border-zinc-700 hover:bg-zinc-800/70 transition"
              >
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
                      {entrenamientosPendientes(alumno.id)} pendientes
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
                        Último entrenamiento: {ultimoEntrenamiento(alumno.id)}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-zinc-500">
                        {alumno.email && <span>{alumno.email}</span>}
                        {alumno.telefono && <span>· {alumno.telefono}</span>}
                        <span>
                          · {entrenamientosFinalizados(alumno.id)} finalizados
                        </span>
                        <span>
                          · {entrenamientosPendientes(alumno.id)} pendientes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-center">
                    <p className="text-xl font-bold text-emerald-400">
                      {entrenamientosPendientes(alumno.id)}
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
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
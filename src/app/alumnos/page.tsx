"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getRolCached } from "@/lib/rol-cache";
import BackButton from "@/components/BackButton";
import { AlumnoCard } from "@/components/alumnos/AlumnoCard";

type Alumno = {
  id: string;
  nombre: string;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  foto_url?: string | null;
  created_at?: string | null;
  invitacion_pendiente?: boolean | null;
  user_id?: string | null;
  profesor_id?: string | null;
};

type RutinaAsignada = {
  alumno_id: string;
  completada?: boolean | null;
  fecha_completada?: string | null;
  fecha_asignacion?: string | null;
};

type OrdenarPor =
  | "nombre"
  | "antiguedad"
  | "entrenamientos_finalizados"
  | "entrenamientos_pendientes";

type Orden = "asc" | "desc";

type AlumnosPageCache = {
  alumnos: Alumno[];
  savedAt: string;
};

const ALUMNOS_CACHE_PREFIX = "alumnos_page_cache_v2";

function getAlumnosCacheKey(userId: string) {
  return `${ALUMNOS_CACHE_PREFIX}_${userId}`;
}

export default function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [rutinasAsignadas, setRutinasAsignadas] = useState<RutinaAsignada[]>(
    []
  );

  const [busqueda, setBusqueda] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>("entrenamientos_pendientes");
  const [orden, setOrden] = useState<Orden>("asc");
  const [loading, setLoading] = useState(true);
  const [metricasLoading, setMetricasLoading] = useState(false);
  const [actualizandoAlumnos, setActualizandoAlumnos] = useState(false);
  const [paginaActual, setPaginaActual] = useState(0);
  const [alumnosPorPagina, setAlumnosPorPagina] = useState(2);

  function cargarAlumnosDesdeCache(userId: string) {
    try {
      const cacheRaw = localStorage.getItem(getAlumnosCacheKey(userId));
      if (!cacheRaw) return false;

      const cache = JSON.parse(cacheRaw) as AlumnosPageCache;
      if (!Array.isArray(cache.alumnos)) return false;

      const cacheEsSeguro = cache.alumnos.every(
        (alumno) => alumno.profesor_id === userId
      );

      if (!cacheEsSeguro) {
        localStorage.removeItem(getAlumnosCacheKey(userId));
        return false;
      }

      setAlumnos(cache.alumnos);
      setLoading(false);
      setMetricasLoading(true);
      setActualizandoAlumnos(true);
      return true;
    } catch {
      return false;
    }
  }

  function guardarAlumnosEnCache(userId: string, alumnosParaGuardar: Alumno[]) {
    try {
      const cache: AlumnosPageCache = {
        alumnos: alumnosParaGuardar,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(getAlumnosCacheKey(userId), JSON.stringify(cache));
    } catch {
      // Si localStorage falla, la pantalla debe seguir funcionando normal.
    }
  }

  async function actualizarAlumnosManual() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      window.location.href = "/login";
      return;
    }

    try {
      localStorage.removeItem(getAlumnosCacheKey(userId));
    } catch {
      // Si localStorage falla, igual intentamos recargar desde la base.
    }

    await cargarDatos(userId, true);
  }

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

    const rol = await getRolCached(user.id);

    if (rol !== "profe") {
      window.location.href = "/alumno";
      return;
    }

    const tieneCache = cargarAlumnosDesdeCache(user.id);
    await cargarDatos(user.id, !tieneCache);
  }

  async function cargarDatos(userId?: string, mostrarLoading = true) {
    if (mostrarLoading) {
      setLoading(true);
    }
    if (!mostrarLoading) {
      setActualizandoAlumnos(true);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const cacheUserId = userId || sessionData.session?.user.id;
    const profesorActualId = cacheUserId;

    if (!profesorActualId) {
      window.location.href = "/login";
      return;
    }

    const { data: alumnosData, error: alumnosError } = await supabase
      .from("alumnos")
      .select(
        "id,nombre,apellido,email,telefono,foto_url,created_at,user_id,profesor_id"
      )
      .eq("profesor_id", profesorActualId)
      .order("nombre", { ascending: true });

    if (alumnosError) {
      alert(alumnosError.message);
      setActualizandoAlumnos(false);
      setLoading(false);
      return;
    }

    const alumnosFiltradosPorProfesor = (alumnosData || []) as Alumno[];

    // Extraer IDs de alumnos para filtrar asignaciones
    const idsAlumnos = alumnosFiltradosPorProfesor.map((a) => a.id);

    if (cacheUserId) {
      guardarAlumnosEnCache(cacheUserId, alumnosFiltradosPorProfesor);
    }

    if (idsAlumnos.length === 0) {
      setAlumnos(alumnosFiltradosPorProfesor);
      setRutinasAsignadas([]);
      setMetricasLoading(false);
      setActualizandoAlumnos(false);
      setLoading(false);
      return;
    }

    setMetricasLoading(true);
    // Solo traer columnas necesarias, filtradas por IDs de alumnos
    const { data: rutinasData, error: rutinasError } = await supabase
      .from("rutina_asignaciones")
      .select("alumno_id,completada,fecha_completada,fecha_asignacion")
      .in("alumno_id", idsAlumnos);

    if (rutinasError) {
      alert(rutinasError.message);
      setMetricasLoading(false);
      setActualizandoAlumnos(false);
      setLoading(false);
      return;
    }

    setAlumnos(alumnosFiltradosPorProfesor);
    setRutinasAsignadas((rutinasData || []) as RutinaAsignada[]);
    setMetricasLoading(false);
    setActualizandoAlumnos(false);
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

  // Pre-computar maps para evitar filtrar en cada render por cada alumno
  const { pendientesPorAlumno, finalizadosPorAlumno, ultimoEntrenamientoPorAlumno } =
    useMemo(() => {
      const pendientes = new Map<string, number>();
      const finalizados = new Map<string, number>();
      const ultimoFecha = new Map<string, string>();

      for (const rutina of rutinasAsignadas) {
        const id = rutina.alumno_id;

        if (rutina.completada === true) {
          finalizados.set(id, (finalizados.get(id) || 0) + 1);

          // Rastrear la fecha de la última asignación completada
          const fecha = rutina.fecha_completada || rutina.fecha_asignacion || "";
          const actual = ultimoFecha.get(id) || "";
          if (fecha > actual) {
            ultimoFecha.set(id, fecha);
          }
        } else {
          pendientes.set(id, (pendientes.get(id) || 0) + 1);
        }
      }

      // Convertir fechas a strings legibles
      const diasSemana = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ];

      const ultimoReadable = new Map<string, string>();
      for (const [id, fechaStr] of ultimoFecha) {
        const fechaUltima = new Date(fechaStr);
        const hoy = new Date();

        // Normalizar a medianoche para comparar solo fechas
        const soloFechaUltima = new Date(
          fechaUltima.getFullYear(),
          fechaUltima.getMonth(),
          fechaUltima.getDate()
        );
        const soloHoy = new Date(
          hoy.getFullYear(),
          hoy.getMonth(),
          hoy.getDate()
        );

        const diffMs = soloHoy.getTime() - soloFechaUltima.getTime();
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDias === 0) {
          ultimoReadable.set(id, "Hoy");
        } else if (diffDias === 1) {
          ultimoReadable.set(id, "Ayer");
        } else if (diffDias <= 6) {
          // Esta semana: mostrar el día de la semana
          const diaNombre = diasSemana[fechaUltima.getDay()];
          ultimoReadable.set(id, `${diaNombre} de esta semana`);
        } else {
          ultimoReadable.set(id, `Hace ${diffDias} días`);
        }
      }

      return {
        pendientesPorAlumno: pendientes,
        finalizadosPorAlumno: finalizados,
        ultimoEntrenamientoPorAlumno: ultimoReadable,
      };
    }, [rutinasAsignadas]);

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
        const finalizadosA = finalizadosPorAlumno.get(a.id) || 0;
        const finalizadosB = finalizadosPorAlumno.get(b.id) || 0;

        return orden === "asc"
          ? finalizadosA - finalizadosB
          : finalizadosB - finalizadosA;
      }

      if (ordenarPor === "entrenamientos_pendientes") {
        const pendientesA = pendientesPorAlumno.get(a.id) || 0;
        const pendientesB = pendientesPorAlumno.get(b.id) || 0;

        return orden === "asc"
          ? pendientesA - pendientesB
          : pendientesB - pendientesA;
      }

      return 0;
    });

    return resultado;
  }, [alumnos, busqueda, ordenarPor, orden, pendientesPorAlumno, finalizadosPorAlumno]);

  const totalPaginas = Math.max(1, Math.ceil(alumnosFiltrados.length / alumnosPorPagina));
  const paginaSegura = Math.min(paginaActual, totalPaginas - 1);
  const inicio = paginaSegura * alumnosPorPagina;
  const fin = inicio + alumnosPorPagina;
  const alumnosPaginados = alumnosFiltrados.slice(inicio, fin);

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
            <BackButton fallback="/" />
            <h1 className="text-3xl font-bold mt-4">Alumnos</h1>
            <p className="text-zinc-400 mt-1">
              {alumnos.length}{" "}
              {alumnos.length === 1
                ? "alumno registrado"
                : "alumnos registrados"}
              {actualizandoAlumnos && (
                <span className="ml-2 text-xs text-zinc-500">Actualizando...</span>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href="/alumnos/nuevo"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600 transition"
            >
              + Agregar alumno
            </a>
          </div>
        </header>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, email o teléfono..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(0); }}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl p-4 outline-none focus:border-emerald-500"
            />

            <div className="flex items-center gap-2 shrink-0">
              <label className="text-sm text-zinc-400 whitespace-nowrap">Mostrar:</label>
              <select
                value={alumnosPorPagina}
                onChange={(e) => { setAlumnosPorPagina(Number(e.target.value)); setPaginaActual(0); }}
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-4 text-sm"
              >
                <option value="2">2</option>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Ordenar por
              </label>

              <select
                value={ordenarPor}
                onChange={(e) => { setOrdenarPor(e.target.value as OrdenarPor); setPaginaActual(0); }}
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
                onChange={(e) => { setOrden(e.target.value as Orden); setPaginaActual(0); }}
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
          <>
            <div className="grid gap-3">
              {alumnosPaginados.map((alumno) => (
                <AlumnoCard
                  key={alumno.id}
                  alumno={alumno}
                  pendientes={pendientesPorAlumno.get(alumno.id) || 0}
                  finalizados={finalizadosPorAlumno.get(alumno.id) || 0}
                  ultimoEntrenamiento={ultimoEntrenamientoPorAlumno.get(alumno.id) || "Sin entrenamientos completados"}
                  metricasLoading={metricasLoading}
                />
              ))}
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.max(0, p - 1))}
                  disabled={paginaSegura === 0}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>

                <span className="text-sm text-zinc-400">
                  Página {paginaSegura + 1} de {totalPaginas}
                </span>

                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas - 1, p + 1))}
                  disabled={paginaSegura >= totalPaginas - 1}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import RutinaEntrenamientoView from "@/components/rutinas/RutinaEntrenamientoView";

// ─── Types ────────────────────────────────────────────────────────────────────

type Alumno = {
  id: string;
  nombre: string | null;
  apellido?: string | null;
  email?: string | null;
  profesor_id?: string | null;
};

type Rutina = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  objetivo?: string | null;
  estructura?: string | null;
  entrada_calor?: string | null;
  profesor_id?: string | null;
};

type RutinaAsignada = {
  asignacion_id: string;
  rutina_id: string;
  activa?: boolean | null;
  fecha_asignacion?: string | null;
  orden?: number | null;
  completada?: boolean | null;
  fecha_completada?: string | null;
  rutinas?: Rutina | null;
};

type RutinaModalSeleccionada = {
  alumno: Alumno;
  asignacionId: string;
};

type RutinaRelacion = Rutina | Rutina[] | null;

type RutinaAsignacionResponse = {
  id: string;
  rutina_id: string;
  activa?: boolean | null;
  fecha_asignacion?: string | null;
  orden?: number | null;
  completada?: boolean | null;
  fecha_completada?: string | null;
  rutinas?: RutinaRelacion;
};


type CacheRegistrarEntrenamientos = {
  alumnosEntrenando: Alumno[];
  alumnoSeleccionado: Alumno | null;
};

type AlumnoRelacion = Alumno | Alumno[] | null;

type AlumnoSugerenciaResponse = {
  alumno_id?: string | null;
  alumnos?: AlumnoRelacion;
  rm_calculado?: number | null;
  created_at?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = "registrar-entrenamientos-cache-v3";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nombreAlumno(alumno: Alumno): string {
  return `${alumno.nombre ?? ""} ${alumno.apellido ?? ""}`.trim() || "Alumno sin nombre";
}

function normalizarRutina(rutinas?: RutinaRelacion): Rutina | null {
  if (Array.isArray(rutinas)) return rutinas[0] || null;
  return rutinas || null;
}

function normalizarAlumnoRelacion(alumnos?: AlumnoRelacion): Alumno | null {
  if (Array.isArray(alumnos)) return alumnos[0] || null;
  return alumnos || null;
}


// ─── PanelAlumno ─────────────────────────────────────────────────────────────

function PanelAlumno({
  alumno,
  profesorId,
  onAbrirRutina,
}: {
  alumno: Alumno;
  profesorId: string | null;
  onAbrirRutina: (alumno: Alumno, asignacionId: string) => void;
}) {
  const alumnoId = alumno.id;
  const [loading, setLoading] = useState(true);
  const [rutinasAsignadas, setRutinasAsignadas] = useState<RutinaAsignada[]>([]);

  useEffect(() => {
    cargarRutinasAsignadas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnoId, profesorId]);

  async function cargarRutinasAsignadas() {
    setLoading(true);

    if (!profesorId) {
      setRutinasAsignadas([]);
      setLoading(false);
      return;
    }

    const { data: alumnoPropio, error: alumnoPropioError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("id", alumnoId)
      .eq("profesor_id", profesorId)
      .maybeSingle();

    if (alumnoPropioError) {
      alert(alumnoPropioError.message);
      setLoading(false);
      return;
    }

    if (!alumnoPropio) {
      setRutinasAsignadas([]);
      setLoading(false);
      return;
    }

    const asignacionesSelect = `
      id, rutina_id, activa, fecha_asignacion, orden,
      completada, fecha_completada, created_at,
      rutinas (id, nombre, descripcion, objetivo, estructura, entrada_calor, profesor_id)
    `;

    const { data: asignacionesActivasData, error: asignacionesActivasError } = await supabase
      .from("rutina_asignaciones")
      .select(asignacionesSelect)
      .eq("alumno_id", alumnoId)
      .eq("activa", true)
      .neq("completada", true)
      .order("fecha_asignacion", { ascending: true })
      .order("orden", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(3);

    const { data: asignacionesCompletadasData, error: asignacionesCompletadasError } = await supabase
      .from("rutina_asignaciones")
      .select(asignacionesSelect)
      .eq("alumno_id", alumnoId)
      .eq("completada", true)
      .order("fecha_completada", { ascending: false })
      .order("fecha_asignacion", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2);

    const asignacionesError = asignacionesActivasError || asignacionesCompletadasError;

    if (asignacionesError) {
      alert(asignacionesError.message);
      setLoading(false);
      return;
    }

    const asignacionesData = [
      ...(asignacionesActivasData || []),
      ...(asignacionesCompletadasData || []),
    ];

    const asignacionesPropias = ((asignacionesData || []) as RutinaAsignacionResponse[]).filter(
      (item) => {
        const rutina = normalizarRutina(item.rutinas);
        return rutina?.profesor_id === profesorId;
      }
    );

    const asignacionesTipadas = asignacionesPropias.map((item) => ({
      asignacion_id: item.id,
      rutina_id: item.rutina_id,
      activa: item.activa,
      fecha_asignacion: item.fecha_asignacion,
      orden: item.orden,
      completada: item.completada,
      fecha_completada: item.fecha_completada,
      rutinas: normalizarRutina(item.rutinas),
    })) as RutinaAsignada[];

    setRutinasAsignadas(asignacionesTipadas);
    setLoading(false);
  }

  const rutinasActivas = rutinasAsignadas.filter(
    (asignacion) => asignacion.activa !== false && asignacion.completada !== true
  );

  const rutinasCompletadas = rutinasAsignadas
    .filter((asignacion) => asignacion.completada === true || asignacion.activa === false)
    .sort((a, b) =>
      (b.fecha_completada || b.fecha_asignacion || "").localeCompare(
        a.fecha_completada || a.fecha_asignacion || ""
      )
    );

  if (loading) {
    return <p className="text-sm text-zinc-500">Cargando rutinas...</p>;
  }

  if (rutinasAsignadas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 p-6 text-center text-sm text-zinc-400">
        Este alumno no tiene rutinas asignadas.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
          Rutinas activas
        </h3>

        {rutinasActivas.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-500">
            No hay rutinas activas para registrar.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {rutinasActivas.map((asignacion) => {
              const rutina = asignacion.rutinas || { id: asignacion.rutina_id, nombre: "Rutina" };

              return (
                <button
                  key={asignacion.asignacion_id}
                  type="button"
                  onClick={() => onAbrirRutina(alumno, asignacion.asignacion_id)}
                  className="rounded-xl border border-blue-500 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/30 active:scale-[0.99]"
                >
                  {rutina.nombre}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {rutinasCompletadas.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
            Completadas recientes
          </h3>
          <div className="flex flex-wrap gap-2">
            {rutinasCompletadas.map((asignacion) => {
              const rutina = asignacion.rutinas || {
                id: asignacion.rutina_id,
                nombre: "Rutina completada",
              };

              return (
                <span
                  key={asignacion.asignacion_id}
                  className="rounded-xl border border-emerald-700 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200"
                >
                  ✓ {rutina.nombre}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RegistrarEntrenamientosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnosEntrenando, setAlumnosEntrenando] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [rutinaModalSeleccionada, setRutinaModalSeleccionada] = useState<RutinaModalSeleccionada | null>(null);
  const [rutinasModalCache, setRutinasModalCache] = useState<RutinaModalSeleccionada[]>([]);
  const [modalCompacto, setModalCompacto] = useState(true);
  const [panelRefreshKey, setPanelRefreshKey] = useState(0);
  const [alumnosConRutina, setAlumnosConRutina] = useState<Set<string>>(new Set());
  const [alumnosRecientes, setAlumnosRecientes] = useState<Alumno[]>([]);
  const [alumnosTopRM, setAlumnosTopRM] = useState<Alumno[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [profesorId, setProfesorId] = useState<string | null>(null);

  useEffect(() => {
    async function inicializar() {
      const { data: sessionData } = await supabase.auth.getSession();
      const profesorActualId = sessionData.session?.user.id;

      if (!profesorActualId) {
        window.location.href = "/login";
        return;
      }

      setProfesorId(profesorActualId);

      const cache = localStorage.getItem(CACHE_KEY);
      if (cache) {
        try {
          const data = JSON.parse(cache) as Partial<CacheRegistrarEntrenamientos>;
          setAlumnosEntrenando(data.alumnosEntrenando ?? []);
          setAlumnoSeleccionado(data.alumnoSeleccionado ?? null);
        } catch {
          localStorage.removeItem(CACHE_KEY);
        }
      }

      await cargarAlumnos(profesorActualId);
      await cargarAlumnosConRutina(profesorActualId);
      await cargarSugerenciasAlumnos(profesorActualId);
    }

    inicializar();
  }, []);

  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ alumnosEntrenando, alumnoSeleccionado }));
  }, [alumnosEntrenando, alumnoSeleccionado]);

  useEffect(() => {
    if (!rutinaModalSeleccionada) return;

    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cerrarModalRutina();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = overflowOriginal;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rutinaModalSeleccionada]);

  async function cargarAlumnos(profesorIdActual?: string) {
    setLoading(true);

    let query = supabase
      .from("alumnos")
      .select("id,nombre,apellido,email,profesor_id")
      .order("nombre", { ascending: true });

    if (profesorIdActual) {
      query = query.eq("profesor_id", profesorIdActual);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setAlumnos((data ?? []) as Alumno[]);
    setLoading(false);
  }

  async function cargarAlumnosConRutina(profesorIdActual?: string) {
    if (!profesorIdActual) {
      setAlumnosConRutina(new Set());
      return;
    }

    const { data: alumnosPropiosData, error: alumnosPropiosError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("profesor_id", profesorIdActual);

    if (alumnosPropiosError) {
      alert(alumnosPropiosError.message);
      return;
    }

    const alumnosPropiosIds = (alumnosPropiosData || [])
      .map((alumno) => alumno.id)
      .filter(Boolean);

    if (alumnosPropiosIds.length === 0) {
      setAlumnosConRutina(new Set());
      return;
    }

    const { data, error } = await supabase
      .from("rutina_asignaciones")
      .select("alumno_id, rutinas(id, profesor_id)")
      .in("alumno_id", alumnosPropiosIds)
      .neq("activa", false)
      .neq("completada", true);

    if (error) {
      alert(error.message);
      return;
    }

    const ids = new Set(
      (data ?? [])
        .filter((item) => {
          const rutina = normalizarRutina(item.rutinas as RutinaRelacion);
          return rutina?.profesor_id === profesorIdActual;
        })
        .map((item) => item.alumno_id)
        .filter(Boolean)
    );

    setAlumnosConRutina(ids);
  }

  async function cargarSugerenciasAlumnos(profesorIdActual?: string) {
    if (!profesorIdActual) {
      setAlumnosRecientes([]);
      setAlumnosTopRM([]);
      return;
    }

    const { data: alumnosPropiosData, error: alumnosPropiosError } = await supabase
      .from("alumnos")
      .select("id")
      .eq("profesor_id", profesorIdActual);

    if (alumnosPropiosError) {
      alert(alumnosPropiosError.message);
      return;
    }

    const alumnosPropiosIds = (alumnosPropiosData || [])
      .map((alumno) => alumno.id)
      .filter(Boolean);

    if (alumnosPropiosIds.length === 0) {
      setAlumnosRecientes([]);
      setAlumnosTopRM([]);
      return;
    }

    const { data: asignacionesActivas } = await supabase
      .from("rutina_asignaciones")
      .select("alumno_id")
      .in("alumno_id", alumnosPropiosIds)
      .eq("activa", true)
      .neq("completada", true);

    const idsActivos = new Set((asignacionesActivas ?? []).map((item) => item.alumno_id).filter(Boolean));

    if (idsActivos.size === 0) {
      setAlumnosRecientes([]);
      setAlumnosTopRM([]);
      return;
    }

    const tomarAlumno = (item: AlumnoSugerenciaResponse) => {
      const alumno = normalizarAlumnoRelacion(item.alumnos);
      if (!alumno || !idsActivos.has(alumno.id)) return null;
      return alumno;
    };

    const deduplicar = (items: Alumno[], excluir = new Set<string>(), limite = 3) => {
      const vistos = new Set<string>(excluir);
      const resultado: Alumno[] = [];

      for (const alumno of items) {
        if (vistos.has(alumno.id)) continue;
        vistos.add(alumno.id);
        resultado.push(alumno);
        if (resultado.length >= limite) break;
      }

      return resultado;
    };

    const { data: recientesData } = await supabase
      .from("registros_entrenamiento")
      .select("alumno_id, created_at, alumnos(id,nombre,apellido,email)")
      .in("alumno_id", Array.from(idsActivos))
      .order("created_at", { ascending: false })
      .limit(30);

    const recientes = deduplicar(
      ((recientesData || []) as AlumnoSugerenciaResponse[])
        .map(tomarAlumno)
        .filter((alumno): alumno is Alumno => Boolean(alumno))
    );

    const idsRecientes = new Set(recientes.map((alumno) => alumno.id));

    const { data: topRMData } = await supabase
      .from("rms_actuales")
      .select("alumno_id, rm_calculado, alumnos(id,nombre,apellido,email)")
      .in("alumno_id", Array.from(idsActivos))
      .order("rm_calculado", { ascending: false })
      .limit(30);

    const topRM = deduplicar(
      ((topRMData || []) as AlumnoSugerenciaResponse[])
        .map(tomarAlumno)
        .filter((alumno): alumno is Alumno => Boolean(alumno)),
      idsRecientes
    );

    setAlumnosRecientes(recientes);
    setAlumnosTopRM(topRM);
  }

  function agregarAlumno(alumno: Alumno) {
    const tieneRutinaActiva = alumnosConRutina.has(alumno.id);

    if (!tieneRutinaActiva) {
      alert("Este alumno no tiene rutinas activas asignadas. No se puede agregar a la lista de alumnos entrenando.");
      return;
    }

    const yaExiste = alumnosEntrenando.some((item) => item.id === alumno.id);
    if (!yaExiste) setAlumnosEntrenando((prev) => [...prev, alumno]);
    setAlumnoSeleccionado(alumno);
    setBusqueda("");
    cargarSugerenciasAlumnos(profesorId || undefined);
  }

  function quitarAlumno(alumno: Alumno) {
    setAlumnosEntrenando((prev) => prev.filter((item) => item.id !== alumno.id));
    if (alumnoSeleccionado?.id === alumno.id) setAlumnoSeleccionado(null);
    cargarSugerenciasAlumnos(profesorId || undefined);
  }

  function abrirModalRutina(alumno: Alumno, asignacionId: string) {
    const seleccion = { alumno, asignacionId };
    setRutinaModalSeleccionada(seleccion);
    setRutinasModalCache((prev) => {
      const yaExiste = prev.some((item) => item.asignacionId === asignacionId);
      if (yaExiste) return prev;
      return [...prev, seleccion];
    });
  }

  function cerrarModalRutina() {
    setRutinaModalSeleccionada(null);
  }

  function limpiarCacheModalRutinas() {
    setRutinaModalSeleccionada(null);
    setRutinasModalCache([]);
  }

  async function manejarRutinaFinalizada() {
    const asignacionFinalizadaId = rutinaModalSeleccionada?.asignacionId;
    cerrarModalRutina();

    if (asignacionFinalizadaId) {
      setRutinasModalCache((prev) =>
        prev.filter((item) => item.asignacionId !== asignacionFinalizadaId)
      );
    }

    setPanelRefreshKey((prev) => prev + 1);
    await cargarAlumnosConRutina(profesorId || undefined);
    await cargarSugerenciasAlumnos(profesorId || undefined);
  }

  const alumnosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    const idsEntrenando = new Set(alumnosEntrenando.map((a) => a.id));
    return alumnos
      .filter((a) => !idsEntrenando.has(a.id))
      .filter((a) => {
        if (!texto) return true;
        return nombreAlumno(a).toLowerCase().includes(texto) || (a.email?.toLowerCase() ?? "").includes(texto);
      });
  }, [alumnos, alumnosEntrenando, busqueda]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 text-zinc-100">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-lg">
        <div className="mb-3">
          <BackButton fallback="/" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Registrar entrenamientos</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Cargá rutinas de alumnos que están entrenando sin teléfono.
            </p>
          </div>
          {loading && <span className="text-sm text-blue-300">Cargando...</span>}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <aside className="flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div>
            <h2 className="text-base font-semibold">Buscar alumno</h2>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o email..."
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          {busqueda && (
            <div className="max-h-52 overflow-y-auto rounded-xl border border-zinc-800">
              {alumnosFiltrados.length === 0 ? (
                <p className="p-3 text-sm text-zinc-500">Sin resultados.</p>
              ) : (
                alumnosFiltrados.map((alumno) => (
                  <button key={alumno.id} type="button" onClick={() => agregarAlumno(alumno)}
                    className="flex w-full flex-col border-b border-zinc-800 px-3 py-3 text-left transition last:border-b-0 hover:bg-zinc-900 active:bg-zinc-800">
                    <span className="text-sm font-medium">
                      {nombreAlumno(alumno)} {alumnosConRutina.has(alumno.id) && <span>⭐</span>}
                    </span>
                    {alumno.email && <span className="text-xs text-zinc-500">{alumno.email}</span>}
                  </button>
                ))
              )}
            </div>
          )}

          {!busqueda && (alumnosRecientes.length > 0 || alumnosTopRM.length > 0) && (
            <div className="space-y-4">
              {alumnosRecientes.length > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Recientes</h2>
                  <div className="flex flex-col gap-2">
                    {alumnosRecientes.map((alumno) => (
                      <button
                        key={alumno.id}
                        type="button"
                        onClick={() => agregarAlumno(alumno)}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-left transition hover:border-zinc-700 hover:bg-zinc-800 active:scale-[0.99]"
                      >
                        <span className="block text-sm font-semibold text-zinc-200">
                          {nombreAlumno(alumno)} {alumnosConRutina.has(alumno.id) && <span>⭐</span>}
                        </span>
                        {alumno.email && <span className="text-xs text-zinc-500">{alumno.email}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {alumnosTopRM.length > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Mejores por RM</h2>
                  <div className="flex flex-col gap-2">
                    {alumnosTopRM.map((alumno) => (
                      <button
                        key={alumno.id}
                        type="button"
                        onClick={() => agregarAlumno(alumno)}
                        className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-left transition hover:border-zinc-700 hover:bg-zinc-800 active:scale-[0.99]"
                      >
                        <span className="block text-sm font-semibold text-zinc-200">
                          {nombreAlumno(alumno)} {alumnosConRutina.has(alumno.id) && <span>⭐</span>}
                        </span>
                        {alumno.email && <span className="text-xs text-zinc-500">{alumno.email}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <h2 className="mb-2 text-base font-semibold">
              Entrenando ahora{" "}
              {alumnosEntrenando.length > 0 && (
                <span className="ml-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                  {alumnosEntrenando.length}
                </span>
              )}
            </h2>

            {alumnosEntrenando.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-sm text-zinc-500">
                Buscá un alumno para agregarlo.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {alumnosEntrenando.map((alumno) => {
                  const activo = alumnoSeleccionado?.id === alumno.id;
                  return (
                    <div key={alumno.id} className={`rounded-2xl border px-3 py-3 transition ${activo ? "border-blue-500 bg-blue-500/20 text-blue-200" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"}`}>
                      <button type="button" onClick={() => setAlumnoSeleccionado(alumno)} className="w-full text-left">
                        <span className="block text-sm font-semibold">
                          {nombreAlumno(alumno)} {alumnosConRutina.has(alumno.id) && <span>⭐</span>}
                        </span>
                        {alumno.email && <span className="text-xs text-zinc-500">{alumno.email}</span>}
                      </button>
                      <button type="button" onClick={() => quitarAlumno(alumno)}
                        className="mt-3 rounded-full border border-red-900 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20">
                        Quitar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Panel principal */}
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          {!alumnoSeleccionado ? (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-zinc-800 text-center text-sm text-zinc-500">
              Seleccioná un alumno para ver y registrar su rutina.
            </div>
          ) : (
            <div>
              <div className="mb-5 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-300">
                  {(alumnoSeleccionado.nombre?.[0] ?? "A").toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{nombreAlumno(alumnoSeleccionado)}</p>
                  {alumnoSeleccionado.email && <p className="text-xs text-zinc-500">{alumnoSeleccionado.email}</p>}
                </div>
              </div>
              <PanelAlumno
                key={`${alumnoSeleccionado.id}-${panelRefreshKey}`}
                alumno={alumnoSeleccionado}
                profesorId={profesorId}
                onAbrirRutina={abrirModalRutina}
              />
            </div>
          )}
        </section>
      </section>

      {rutinasModalCache.length > 0 && (
        <div
          className={
            rutinaModalSeleccionada
              ? "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 sm:p-5"
              : "hidden"
          }
        >
          {rutinaModalSeleccionada && (
            <button
              type="button"
              aria-label="Cerrar modal"
              onClick={cerrarModalRutina}
              className="fixed inset-0 cursor-default"
            />
          )}
          <div className={`relative z-10 w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl ${modalCompacto ? "max-w-2xl" : "max-w-5xl"}`}>
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Vista profesor
                </p>
                <p className="text-sm font-semibold text-zinc-200">
                  {rutinaModalSeleccionada ? nombreAlumno(rutinaModalSeleccionada.alumno) : "Rutina"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalCompacto((prev) => !prev)}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800"
                >
                  {modalCompacto ? "Ampliar" : "Compactar"}
                </button>
                <button
                  type="button"
                  onClick={limpiarCacheModalRutinas}
                  className="rounded-xl border border-yellow-800 bg-yellow-500/10 px-3 py-2 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500/20"
                >
                  Limpiar cache
                </button>
                <button
                  type="button"
                  onClick={cerrarModalRutina}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="max-h-[82vh] overflow-y-auto">
              {rutinasModalCache.map((rutinaCacheada) => {
                const activa = rutinaCacheada.asignacionId === rutinaModalSeleccionada?.asignacionId;

                return (
                  <div key={rutinaCacheada.asignacionId} className={activa ? "block" : "hidden"}>
                    <div className="px-1 sm:px-2">
                      <RutinaEntrenamientoView
                        modo="profesor"
                        asignacionId={rutinaCacheada.asignacionId}
                        alumnoIdProp={rutinaCacheada.alumno.id}
                        nombreAlumnoProp={nombreAlumno(rutinaCacheada.alumno)}
                        onClose={cerrarModalRutina}
                        onFinalizada={manejarRutinaFinalizada}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
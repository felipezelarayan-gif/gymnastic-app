"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Alumno = {
  id: string;
  nombre: string | null;
  apellido?: string | null;
  email?: string | null;
};

type RutinaAsignacion = {
  id: string;
  rutina_id: string;
  activa: boolean;
  completada: boolean;
  fecha_asignacion: string | null;
  fecha_inicio: string | null;
  orden: number | null;
  rutina: {
    nombre: string;
    descripcion: string | null;
    objetivo: string | null;
    estructura: string | null;
    entrada_calor: string | null;
  } | null;
};

type RutinaEjercicio = {
  id: string;
  ejercicio_id: string;
  nombre_ejercicio: string;
  series: number | null;
  repeticiones: string | null;
  peso: string | null;
  descanso: string | null;
  rir: string | null;
  observaciones: string | null;
  orden: number | null;
  porcentaje_rm: string | null;
  tipo_prescripcion: string | null;
  duracion: string | null;
  tipo_configuracion: string | null;
};

type CacheRegistrarEntrenamientos = {
  alumnosEntrenando: Alumno[];
  alumnoSeleccionado: Alumno | null;
};

const CACHE_KEY = "registrar-entrenamientos-cache-v3";

function nombreAlumno(alumno: Alumno): string {
  return `${alumno.nombre ?? ""} ${alumno.apellido ?? ""}`.trim() || "Alumno sin nombre";
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return "";
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

function EjercicioCard({ ejercicio, index }: { ejercicio: RutinaEjercicio; index: number }) {
  const lineaPrincipal = [
    ejercicio.series != null && `${ejercicio.series} series`,
    ejercicio.repeticiones && `Reps: ${ejercicio.repeticiones}`,
    ejercicio.duracion && `Duración: ${ejercicio.duracion}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const extras = [
    ejercicio.peso && `Peso: ${ejercicio.peso}`,
    ejercicio.porcentaje_rm && `%RM: ${ejercicio.porcentaje_rm}`,
    ejercicio.descanso && `Descanso: ${ejercicio.descanso}`,
    ejercicio.rir && `RIR: ${ejercicio.rir}`,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-1 flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
          {index + 1}
        </span>
        <div className="flex-1">
          <p className="font-semibold text-zinc-100">{ejercicio.nombre_ejercicio}</p>
          {lineaPrincipal && (
            <p className="mt-1 text-sm text-zinc-400">{lineaPrincipal}</p>
          )}
          {extras.map((extra) => (
            <p key={extra} className="text-sm text-zinc-500">{extra}</p>
          ))}
        </div>
      </div>

      {ejercicio.observaciones && (
        <div className="mt-3 rounded-xl bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300">
          📝 {ejercicio.observaciones}
        </div>
      )}
    </div>
  );
}

function PanelRutina({
  alumno,
  onVolver,
}: {
  alumno: Alumno;
  onVolver: () => void;
}) {
  const [asignaciones, setAsignaciones] = useState<RutinaAsignacion[]>([]);
  const [asignacionSeleccionada, setAsignacionSeleccionada] = useState<RutinaAsignacion | null>(null);
  const [ejercicios, setEjercicios] = useState<RutinaEjercicio[]>([]);
  const [loadingRutinas, setLoadingRutinas] = useState(true);
  const [loadingEjercicios, setLoadingEjercicios] = useState(false);
  const [marcandoCompletada, setMarcandoCompletada] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarAsignaciones();
  }, [alumno.id]);

  useEffect(() => {
    if (!asignacionSeleccionada) {
      setEjercicios([]);
      return;
    }
    cargarEjercicios(asignacionSeleccionada.rutina_id);
  }, [asignacionSeleccionada?.id]);

  async function cargarAsignaciones() {
    setLoadingRutinas(true);
    setError("");

    const { data, error } = await supabase
      .from("rutina_asignaciones")
      .select(`
        id, rutina_id, activa, completada,
        fecha_asignacion, fecha_inicio, orden,
        rutina:rutinas (
          nombre, descripcion, objetivo, estructura, entrada_calor
        )
      `)
      .eq("alumno_id", alumno.id)
      .order("orden", { ascending: true });

    if (error) {
      setError("No se pudieron cargar las rutinas.");
      setLoadingRutinas(false);
      return;
    }

    const lista = (data ?? []) as unknown as RutinaAsignacion[];
    setAsignaciones(lista);

    const activas = lista.filter((a) => a.activa && !a.completada);
    if (activas.length === 1) setAsignacionSeleccionada(activas[0]);

    setLoadingRutinas(false);
  }

  async function cargarEjercicios(rutinaId: string) {
    setLoadingEjercicios(true);
    const { data, error } = await supabase
      .from("rutina_ejercicios")
      .select("*")
      .eq("rutina_id", rutinaId)
      .order("orden", { ascending: true });

    if (error) {
      setError("No se pudieron cargar los ejercicios.");
      setLoadingEjercicios(false);
      return;
    }

    setEjercicios((data ?? []) as RutinaEjercicio[]);
    setLoadingEjercicios(false);
  }

  async function marcarCompletada() {
    if (!asignacionSeleccionada) return;
    setMarcandoCompletada(true);

    const { error } = await supabase
      .from("rutina_asignaciones")
      .update({
        completada: true,
        fecha_completada: new Date().toISOString(),
      })
      .eq("id", asignacionSeleccionada.id);

    if (error) {
      setError("No se pudo marcar como completada.");
      setMarcandoCompletada(false);
      return;
    }

    // Actualizar estado local
    setAsignaciones((prev) =>
      prev.map((a) =>
        a.id === asignacionSeleccionada.id
          ? { ...a, completada: true, activa: false }
          : a
      )
    );
    setAsignacionSeleccionada((prev) =>
      prev ? { ...prev, completada: true, activa: false } : prev
    );
    setMarcandoCompletada(false);
  }

  const activas = asignaciones.filter((a) => a.activa && !a.completada);
  const completadas = asignaciones.filter((a) => a.completada);

  return (
    <div className="flex flex-col gap-4">
      {/* Header alumno */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVolver}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:text-zinc-100"
        >
          ←
        </button>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">{nombreAlumno(alumno)}</h2>
          {alumno.email && <p className="text-xs text-zinc-500">{alumno.email}</p>}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Selector de rutinas */}
      {loadingRutinas ? (
        <p className="text-sm text-zinc-500">Cargando rutinas...</p>
      ) : asignaciones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-400">
          Este alumno no tiene rutinas asignadas.
        </div>
      ) : (
        <>
          {activas.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Rutinas activas
              </p>
              <div className="flex flex-wrap gap-2">
                {activas.map((a) => {
                  const sel = asignacionSeleccionada?.id === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAsignacionSeleccionada(a)}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                        sel
                          ? "border-blue-500 bg-blue-500/20 text-blue-200"
                          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      {a.rutina?.nombre ?? "Sin nombre"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {completadas.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Completadas
              </p>
              <div className="flex flex-wrap gap-2">
                {completadas.map((a) => {
                  const sel = asignacionSeleccionada?.id === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAsignacionSeleccionada(a)}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                        sel
                          ? "border-emerald-600 bg-emerald-600/20 text-emerald-200"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-600"
                      }`}
                    >
                      ✓ {a.rutina?.nombre ?? "Sin nombre"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Detalle de la rutina seleccionada */}
      {asignacionSeleccionada && (
        <div className="flex flex-col gap-4">
          {/* Card principal de la rutina */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3 className="text-xl font-bold text-zinc-100">
                {asignacionSeleccionada.rutina?.nombre ?? "Rutina sin nombre"}
              </h3>
              {asignacionSeleccionada.completada && (
                <span className="shrink-0 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                  ✓ Completada
                </span>
              )}
            </div>

            {asignacionSeleccionada.fecha_asignacion && (
              <p className="mb-3 text-sm text-zinc-500">
                Asignada: {formatFecha(asignacionSeleccionada.fecha_asignacion)}
              </p>
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {asignacionSeleccionada.rutina?.objetivo && (
                <div>
                  <span className="text-xs text-zinc-500">Objetivo</span>
                  <p className="text-zinc-300">{asignacionSeleccionada.rutina.objetivo}</p>
                </div>
              )}
              {asignacionSeleccionada.rutina?.estructura && (
                <div>
                  <span className="text-xs text-zinc-500">Estructura</span>
                  <p className="text-zinc-300">{asignacionSeleccionada.rutina.estructura}</p>
                </div>
              )}
            </div>

            {asignacionSeleccionada.rutina?.entrada_calor && (
              <div className="mt-3 rounded-xl bg-zinc-800/60 px-3 py-2">
                <p className="mb-1 text-xs font-semibold text-zinc-400">Entrada en calor</p>
                <p className="text-sm text-zinc-300">{asignacionSeleccionada.rutina.entrada_calor}</p>
              </div>
            )}

            {asignacionSeleccionada.rutina?.descripcion && (
              <p className="mt-3 text-sm text-zinc-400">
                {asignacionSeleccionada.rutina.descripcion}
              </p>
            )}
          </div>

          {/* Ejercicios */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Ejercicios
            </p>

            {loadingEjercicios ? (
              <p className="text-sm text-zinc-500">Cargando ejercicios...</p>
            ) : ejercicios.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-center text-sm text-zinc-400">
                Esta rutina no tiene ejercicios cargados.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {ejercicios.map((ej, i) => (
                  <EjercicioCard key={ej.id} ejercicio={ej} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Botón completar */}
          {!asignacionSeleccionada.completada && ejercicios.length > 0 && (
            <button
              type="button"
              onClick={marcarCompletada}
              disabled={marcandoCompletada}
              className="w-full rounded-2xl bg-emerald-500 py-4 text-base font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {marcandoCompletada ? "Guardando..." : "✓ Marcar rutina como completada"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function RegistrarEntrenamientosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnosEntrenando, setAlumnosEntrenando] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [alumnosConRutina, setAlumnosConRutina] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
    cargarAlumnos();
    cargarAlumnosConRutina();
  }, []);

  useEffect(() => {
    const data: CacheRegistrarEntrenamientos = { alumnosEntrenando, alumnoSeleccionado };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }, [alumnosEntrenando, alumnoSeleccionado]);

  async function cargarAlumnos() {
    setLoading(true);
    const { data } = await supabase
      .from("alumnos")
      .select("id, nombre, apellido, email")
      .order("nombre", { ascending: true });
    setAlumnos((data ?? []) as Alumno[]);
    setLoading(false);
  }

  async function cargarAlumnosConRutina() {
    const { data } = await supabase
      .from("rutina_asignaciones")
      .select("alumno_id")
      .neq("activa", false)
      .neq("completada", true);
    const ids = new Set((data ?? []).map((item) => item.alumno_id).filter(Boolean));
    setAlumnosConRutina(ids);
  }

  function agregarAlumno(alumno: Alumno) {
    const yaExiste = alumnosEntrenando.some((item) => item.id === alumno.id);
    if (!yaExiste) setAlumnosEntrenando((prev) => [...prev, alumno]);
    setAlumnoSeleccionado(alumno);
    setBusqueda("");
  }

  function quitarAlumno(alumno: Alumno) {
    setAlumnosEntrenando((prev) => prev.filter((item) => item.id !== alumno.id));
    if (alumnoSeleccionado?.id === alumno.id) setAlumnoSeleccionado(null);
  }

  const alumnosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    const idsEntrenando = new Set(alumnosEntrenando.map((a) => a.id));
    return alumnos
      .filter((a) => !idsEntrenando.has(a.id))
      .filter((a) => {
        if (!texto) return true;
        const nombre = nombreAlumno(a).toLowerCase();
        const email = a.email?.toLowerCase() ?? "";
        return nombre.includes(texto) || email.includes(texto);
      });
  }, [alumnos, alumnosEntrenando, busqueda]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 text-zinc-100">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-lg">
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

      <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Sidebar */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
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
                  <button
                    key={alumno.id}
                    type="button"
                    onClick={() => agregarAlumno(alumno)}
                    className="flex w-full flex-col border-b border-zinc-800 px-3 py-2 text-left transition last:border-b-0 hover:bg-zinc-900"
                  >
                    <span className="text-sm font-medium">
                      {nombreAlumno(alumno)}{" "}
                      {alumnosConRutina.has(alumno.id) && <span>⭐</span>}
                    </span>
                    {alumno.email && (
                      <span className="text-xs text-zinc-500">{alumno.email}</span>
                    )}
                  </button>
                ))
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
                    <div
                      key={alumno.id}
                      className={`rounded-xl border px-3 py-3 transition ${
                        activo
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setAlumnoSeleccionado(alumno)}
                        className="w-full text-left"
                      >
                        <span className="block text-sm font-semibold">
                          {nombreAlumno(alumno)}{" "}
                          {alumnosConRutina.has(alumno.id) && <span>⭐</span>}
                        </span>
                        {alumno.email && (
                          <span className="text-xs text-zinc-500">{alumno.email}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => quitarAlumno(alumno)}
                        className="mt-2 text-xs text-red-400 transition hover:text-red-300"
                      >
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
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          {!alumnoSeleccionado ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-500">
              Seleccioná un alumno para ver y registrar su rutina.
            </div>
          ) : (
            <PanelRutina
              alumno={alumnoSeleccionado}
              onVolver={() => setAlumnoSeleccionado(null)}
            />
          )}
        </section>
      </section>
    </main>
  );
}

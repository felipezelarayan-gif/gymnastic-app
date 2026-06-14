

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Alumno = {
  id: string;
  nombre: string | null;
  apellido?: string | null;
  email?: string | null;
};

type RutinaAsignada = {
  id: string;
  rutina_id: string;
  alumno_id: string;
  rutinas?: {
    id: string;
    nombre?: string | null;
    titulo?: string | null;
  } | null;
};

type EjercicioRutina = {
  id: string;
  ejercicio_id: string | null;
  rutina_id: string;
  series?: number | null;
  repeticiones?: number | null;
  peso?: number | null;
  tiempo?: number | null;
  es_tiempo?: boolean | null;
  ejercicios?: {
    id: string;
    nombre: string | null;
  } | null;
};

type ProgresoEjercicio = {
  completado: boolean;
  series: string;
  repeticiones: string;
  peso: string;
  tiempo: string;
};

type CacheRegistrarEntrenamientos = {
  alumnosAgregados: Alumno[];
  alumnoSeleccionado: Alumno | null;
  rutinaSeleccionada: RutinaAsignada | null;
  progreso: Record<string, ProgresoEjercicio>;
};

const CACHE_KEY = "registrar-entrenamientos-cache-v1";

function nombreAlumno(alumno: Alumno): string {
  return `${alumno.nombre ?? ""} ${alumno.apellido ?? ""}`.trim() || "Alumno sin nombre";
}

function nombreRutina(rutina: RutinaAsignada): string {
  return rutina.rutinas?.nombre || rutina.rutinas?.titulo || "Rutina sin nombre";
}

export default function RegistrarEntrenamientosPage() {

  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnosAgregados, setAlumnosAgregados] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);

  const [rutinas, setRutinas] = useState<RutinaAsignada[]>([]);
  const [rutinaSeleccionada, setRutinaSeleccionada] = useState<RutinaAsignada | null>(null);

  const [ejercicios, setEjercicios] = useState<EjercicioRutina[]>([]);
  const [progreso, setProgreso] = useState<Record<string, ProgresoEjercicio>>({});

  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const cache = localStorage.getItem(CACHE_KEY);

    if (cache) {
      try {
        const data = JSON.parse(cache) as Partial<CacheRegistrarEntrenamientos>;
        setAlumnosAgregados(data.alumnosAgregados ?? []);
        setAlumnoSeleccionado(data.alumnoSeleccionado ?? null);
        setRutinaSeleccionada(data.rutinaSeleccionada ?? null);
        setProgreso(data.progreso ?? {});
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    cargarAlumnos();
  }, []);

  useEffect(() => {
    const data: CacheRegistrarEntrenamientos = {
      alumnosAgregados,
      alumnoSeleccionado,
      rutinaSeleccionada,
      progreso,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }, [alumnosAgregados, alumnoSeleccionado, rutinaSeleccionada, progreso]);

  useEffect(() => {
    if (alumnoSeleccionado) {
      cargarRutinasAlumno(alumnoSeleccionado.id);
    } else {
      setRutinas([]);
      setRutinaSeleccionada(null);
    }
  }, [alumnoSeleccionado]);

  useEffect(() => {
    if (rutinaSeleccionada) {
      cargarEjerciciosRutina(rutinaSeleccionada.rutina_id);
    } else {
      setEjercicios([]);
    }
  }, [rutinaSeleccionada]);

  async function cargarAlumnos() {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("alumnos")
      .select("id, nombre, apellido, email")
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje("No se pudieron cargar los alumnos.");
      setLoading(false);
      return;
    }

    setAlumnos((data ?? []) as Alumno[]);
    setLoading(false);
  }

  async function cargarRutinasAlumno(alumnoId: string) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("rutina_asignaciones")
      .select("id, rutina_id, alumno_id, rutinas(id, nombre, titulo)")
      .eq("alumno_id", alumnoId)
      .order("created_at", { ascending: false });

    if (error) {
      setMensaje("No se pudieron cargar las rutinas del alumno.");
      setLoading(false);
      return;
    }

    const rutinasNormalizadas: RutinaAsignada[] = (data ?? []).map((item) => {
      const itemNormalizado = item as unknown as RutinaAsignada & {
        rutinas?: RutinaAsignada["rutinas"] | RutinaAsignada["rutinas"][];
      };

      return {
        id: itemNormalizado.id,
        rutina_id: itemNormalizado.rutina_id,
        alumno_id: itemNormalizado.alumno_id,
        rutinas: Array.isArray(itemNormalizado.rutinas)
          ? itemNormalizado.rutinas[0] ?? null
          : itemNormalizado.rutinas ?? null,
      };
    });

    setRutinas(rutinasNormalizadas);
    setLoading(false);
  }

  async function cargarEjerciciosRutina(rutinaId: string) {
    setLoading(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("rutina_ejercicios")
      .select("id, ejercicio_id, rutina_id, series, repeticiones, peso, tiempo, es_tiempo, ejercicios(id, nombre)")
      .eq("rutina_id", rutinaId);

    if (error) {
      setMensaje("No se pudieron cargar los ejercicios de la rutina.");
      setLoading(false);
      return;
    }

    const ejerciciosCargados: EjercicioRutina[] = (data ?? []).map((item) => {
      const itemNormalizado = item as unknown as EjercicioRutina & {
        ejercicios?: EjercicioRutina["ejercicios"] | EjercicioRutina["ejercicios"][];
      };

      return {
        id: itemNormalizado.id,
        ejercicio_id: itemNormalizado.ejercicio_id,
        rutina_id: itemNormalizado.rutina_id,
        series: itemNormalizado.series,
        repeticiones: itemNormalizado.repeticiones,
        peso: itemNormalizado.peso,
        tiempo: itemNormalizado.tiempo,
        es_tiempo: itemNormalizado.es_tiempo,
        ejercicios: Array.isArray(itemNormalizado.ejercicios)
          ? itemNormalizado.ejercicios[0] ?? null
          : itemNormalizado.ejercicios ?? null,
      };
    });
    setEjercicios(ejerciciosCargados);

    setProgreso((prev) => {
      const nuevoProgreso = { ...prev };

      ejerciciosCargados.forEach((ejercicio) => {
        if (!nuevoProgreso[ejercicio.id]) {
          nuevoProgreso[ejercicio.id] = {
            completado: false,
            series: ejercicio.series?.toString() ?? "",
            repeticiones: ejercicio.repeticiones?.toString() ?? "",
            peso: ejercicio.peso?.toString() ?? "",
            tiempo: ejercicio.tiempo?.toString() ?? "",
          };
        }
      });

      return nuevoProgreso;
    });

    setLoading(false);
  }

  async function agregarAlumno(alumno: Alumno) {
    const yaExiste = alumnosAgregados.some((item) => item.id === alumno.id);

    if (yaExiste) {
      setAlumnoSeleccionado(alumno);
      setBusqueda("");
      return;
    }

    const nuevosAlumnos = [...alumnosAgregados, alumno];
    setAlumnosAgregados(nuevosAlumnos);
    setAlumnoSeleccionado(alumno);
    setBusqueda("");
    setMensaje("Alumno agregado a Registrar entrenamientos.");

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        alumnosAgregados: nuevosAlumnos,
        alumnoSeleccionado: alumno,
        rutinaSeleccionada,
        progreso,
      })
    );
  }

  function actualizarProgreso(ejercicioId: string, campo: keyof ProgresoEjercicio, valor: string | boolean) {
    setProgreso((prev) => ({
      ...prev,
      [ejercicioId]: {
        completado: prev[ejercicioId]?.completado ?? false,
        series: prev[ejercicioId]?.series ?? "",
        repeticiones: prev[ejercicioId]?.repeticiones ?? "",
        peso: prev[ejercicioId]?.peso ?? "",
        tiempo: prev[ejercicioId]?.tiempo ?? "",
        [campo]: valor,
      },
    }));
  }

  async function guardarEntrenamiento(finalizar: boolean) {
    if (!alumnoSeleccionado || !rutinaSeleccionada) {
      setMensaje("Seleccioná un alumno y una rutina antes de guardar.");
      return;
    }

    const ejerciciosCompletados = ejercicios.filter((ejercicio) => progreso[ejercicio.id]?.completado);

    if (finalizar && ejerciciosCompletados.length === 0) {
      setMensaje("Marcá al menos un ejercicio como completado antes de finalizar.");
      return;
    }

    setLoading(true);
    setMensaje("");

    const registros = ejerciciosCompletados.map((ejercicio) => {
      const item = progreso[ejercicio.id];

      return {
        alumno_id: alumnoSeleccionado.id,
        rutina_id: rutinaSeleccionada.rutina_id,
        rutina_asignacion_id: rutinaSeleccionada.id,
        ejercicio_id: ejercicio.ejercicio_id,
        series: item?.series ? Number(item.series) : null,
        repeticiones: item?.repeticiones ? Number(item.repeticiones) : null,
        peso: item?.peso ? Number(item.peso) : null,
        tiempo: item?.tiempo ? Number(item.tiempo) : null,
        completado: true,
        finalizado: finalizar,
        origen: "profesor",
      };
    });

    if (registros.length > 0) {
      const { error } = await supabase.from("registros_entrenamiento").insert(registros);

      if (error) {
        setMensaje("No se pudo guardar el entrenamiento. Revisá las columnas de registros_entrenamiento.");
        setLoading(false);
        return;
      }
    }

    if (finalizar) {
      setProgreso({});
      setRutinaSeleccionada(null);
      localStorage.removeItem(CACHE_KEY);
      setMensaje("Rutina finalizada y guardada correctamente.");
    } else {
      setMensaje("Progreso guardado correctamente.");
    }

    setLoading(false);
  }

  const alumnosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return alumnos;

    return alumnos.filter((alumno) => {
      const nombreCompleto = nombreAlumno(alumno).toLowerCase();
      const email = alumno.email?.toLowerCase() ?? "";
      return nombreCompleto.includes(texto) || email.includes(texto);
    });
  }, [alumnos, busqueda]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 text-zinc-100">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-lg">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Registrar entrenamientos</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Cargá rutinas manualmente cuando un alumno entrena sin teléfono.
            </p>
          </div>

          {loading && <span className="text-sm text-blue-300">Cargando...</span>}
        </div>

        {mensaje && (
          <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">
            {mensaje}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div>
            <h2 className="text-lg font-semibold">Agregar alumno</h2>
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre o email"
              className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
            />
          </div>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-zinc-800">
            {alumnosFiltrados.length === 0 ? (
              <p className="p-3 text-sm text-zinc-400">No hay alumnos para mostrar.</p>
            ) : (
              alumnosFiltrados.map((alumno) => (
                <button
                  key={alumno.id}
                  type="button"
                  onClick={() => agregarAlumno(alumno)}
                  className="flex w-full flex-col border-b border-zinc-800 px-3 py-2 text-left transition last:border-b-0 hover:bg-zinc-900"
                >
                  <span className="text-sm font-medium">{nombreAlumno(alumno)}</span>
                  {alumno.email && <span className="text-xs text-zinc-500">{alumno.email}</span>}
                </button>
              ))
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Alumnos agregados</h2>

            <div className="flex flex-col gap-2">
              {alumnosAgregados.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-700 p-3 text-sm text-zinc-400">
                  Todavía no agregaste alumnos a esta sección.
                </p>
              ) : (
                alumnosAgregados.map((alumno) => {
                  const activo = alumnoSeleccionado?.id === alumno.id;

                  return (
                    <button
                      key={alumno.id}
                      type="button"
                      onClick={() => {
                        setAlumnoSeleccionado(alumno);
                        setRutinaSeleccionada(null);
                      }}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        activo
                          ? "border-blue-500 bg-blue-500/10 text-blue-100"
                          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                      }`}
                    >
                      <span className="block text-sm font-medium">{nombreAlumno(alumno)}</span>
                      {alumno.email && <span className="text-xs text-zinc-500">{alumno.email}</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          {!alumnoSeleccionado ? (
            <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-400">
              Seleccioná o agregá un alumno para ver sus rutinas.
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold">{nombreAlumno(alumnoSeleccionado)}</h2>
                <p className="text-sm text-zinc-400">Elegí una rutina asignada para cargarla manualmente.</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {rutinas.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-zinc-700 p-3 text-sm text-zinc-400 sm:col-span-2">
                    Este alumno no tiene rutinas asignadas.
                  </p>
                ) : (
                  rutinas.map((rutina) => {
                    const activa = rutinaSeleccionada?.id === rutina.id;

                    return (
                      <button
                        key={rutina.id}
                        type="button"
                        onClick={() => setRutinaSeleccionada(rutina)}
                        className={`rounded-xl border px-3 py-3 text-left transition ${
                          activa
                            ? "border-blue-500 bg-blue-500/10 text-blue-100"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                        }`}
                      >
                        <span className="text-sm font-medium">{nombreRutina(rutina)}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {rutinaSeleccionada && (
                <div className="mt-2 flex flex-col gap-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-base font-semibold">Completar ejercicios</h3>
                    <span className="text-xs text-zinc-500">{nombreRutina(rutinaSeleccionada)}</span>
                  </div>

                  {ejercicios.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-zinc-700 p-3 text-sm text-zinc-400">
                      Esta rutina no tiene ejercicios cargados.
                    </p>
                  ) : (
                    ejercicios.map((ejercicio) => {
                      const item = progreso[ejercicio.id] ?? {
                        completado: false,
                        series: "",
                        repeticiones: "",
                        peso: "",
                        tiempo: "",
                      };

                      return (
                        <article key={ejercicio.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h4 className="font-medium">{ejercicio.ejercicios?.nombre ?? "Ejercicio sin nombre"}</h4>
                              <p className="text-xs text-zinc-500">Completá solo los campos necesarios.</p>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-zinc-300">
                              <input
                                type="checkbox"
                                checked={item.completado}
                                onChange={(event) => actualizarProgreso(ejercicio.id, "completado", event.target.checked)}
                                className="h-4 w-4"
                              />
                              Completado
                            </label>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                            <label className="text-xs text-zinc-400">
                              Series
                              <input
                                value={item.series}
                                onChange={(event) => actualizarProgreso(ejercicio.id, "series", event.target.value)}
                                inputMode="numeric"
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
                              />
                            </label>

                            <label className="text-xs text-zinc-400">
                              Reps
                              <input
                                value={item.repeticiones}
                                onChange={(event) => actualizarProgreso(ejercicio.id, "repeticiones", event.target.value)}
                                inputMode="numeric"
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
                              />
                            </label>

                            <label className="text-xs text-zinc-400">
                              Peso
                              <input
                                value={item.peso}
                                onChange={(event) => actualizarProgreso(ejercicio.id, "peso", event.target.value)}
                                inputMode="decimal"
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
                              />
                            </label>

                            <label className="text-xs text-zinc-400">
                              Tiempo
                              <input
                                value={item.tiempo}
                                onChange={(event) => actualizarProgreso(ejercicio.id, "tiempo", event.target.value)}
                                inputMode="numeric"
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500"
                              />
                            </label>
                          </div>
                        </article>
                      );
                    })
                  )}

                  <div className="sticky bottom-4 mt-2 flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => guardarEntrenamiento(false)}
                      disabled={loading}
                      className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-900 disabled:opacity-50"
                    >
                      Guardar progreso
                    </button>

                    <button
                      type="button"
                      onClick={() => guardarEntrenamiento(true)}
                      disabled={loading}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                    >
                      Finalizar rutina
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </section>
    </main>
  );
}
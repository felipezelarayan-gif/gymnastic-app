"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getRolCached } from "@/lib/rol-cache";
import { borrarRutina as borrarRutinaLib } from "@/lib/rutinas/borrarRutina";
import BackButton from "@/components/BackButton";
import VerRutinaPlantillaModal from "@/components/rutinas/VerRutinaPlantillaModal";
import CrearRutinaModal from "@/components/rutinas/CrearRutinaModal";
import { OPCIONES_TIPO } from "@/lib/rutinas/opciones-tipo";

type Rutina = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  objetivo?: string | null;
  estructura?: string | null;
  created_at?: string | null;
  creada_para_alumno_id?: string | null;
  profesor_id?: string | null;
};

type RutinasPageCache = {
  rutinas: Rutina[];
  savedAt: string;
};

const RUTINAS_CACHE_PREFIX = "rutinas_page_cache_v1";

function getRutinasCacheKey(userId: string) {
  return `${RUTINAS_CACHE_PREFIX}_${userId}`;
}

export default function RutinasPage() {
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualizandoRutinas, setActualizandoRutinas] = useState(false);

  // Paginación y filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [paginaActual, setPaginaActual] = useState(0);
  const [rutinasPorPagina] = useState(10);
  const [totalRutinas, setTotalRutinas] = useState(0);
  const [filtrosAbierto, setFiltrosAbierto] = useState(false);

  function cargarRutinasDesdeCache(userId: string) {
    try {
      const cacheRaw = localStorage.getItem(getRutinasCacheKey(userId));
      if (!cacheRaw) return false;

      const cache = JSON.parse(cacheRaw) as RutinasPageCache;
      if (!Array.isArray(cache.rutinas)) return false;

      setRutinas(cache.rutinas);
      setLoading(false);
      setActualizandoRutinas(true);
      return true;
    } catch {
      return false;
    }
  }

  function guardarRutinasEnCache(userId: string, rutinasParaGuardar: Rutina[]) {
    try {
      const cache: RutinasPageCache = {
        rutinas: rutinasParaGuardar,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(getRutinasCacheKey(userId), JSON.stringify(cache));
    } catch {
      // Si localStorage falla, la pantalla debe seguir funcionando normal.
    }
  }

  async function actualizarRutinasManual() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      window.location.href = "/login";
      return;
    }

    try {
      localStorage.removeItem(getRutinasCacheKey(userId));
    } catch {
      // Si localStorage falla, igual intentamos recargar desde la base.
    }

    await cargarRutinas(userId, true, true);
    setPaginaActual(0);
  }

  const [mostrarModal, setMostrarModal] = useState(false);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [verRutinaId, setVerRutinaId] = useState<string | null>(null);
  const [profesorId, setProfesorId] = useState<string | null>(null);

  useEffect(() => {
    verificarPermiso();
  }, []);

  async function verificarPermiso() {
    const { data: sessionData } = await supabase.auth.getSession();
    const profesorId = sessionData.session?.user.id;

    if (!profesorId) {
      window.location.href = "/login";
      return;
    }

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const rol = await getRolCached(sessionData.session.user.id);

    if (rol !== "profe") {
      window.location.href = "/alumno";
      return;
    }

    setProfesorId(sessionData.session.user.id);
    const tieneCache = cargarRutinasDesdeCache(sessionData.session.user.id);
    await cargarRutinas(sessionData.session.user.id, !tieneCache, true);
  }

  const cargarRutinas = useCallback(async (profesorId?: string, mostrarLoading = true, esRecargaFiltros = false) => {
    if (mostrarLoading) {
      setLoading(true);
    }

    if (!mostrarLoading) {
      setActualizandoRutinas(true);
    }

    const LIMITE = rutinasPorPagina;
    const desde = esRecargaFiltros ? 0 : paginaActual * LIMITE;

    let query = supabase
      .from("rutinas")
      .select("id,nombre,descripcion,objetivo,estructura,created_at,creada_para_alumno_id,profesor_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(desde, desde + LIMITE - 1);

    if (profesorId) {
      query = query.eq("profesor_id", profesorId);
    }

    // Aplicar filtros
    if (busqueda.trim()) {
      query = query.ilike("nombre", `%${busqueda.trim()}%`);
    }

    if (filtroTipo) {
      const opcion = OPCIONES_TIPO.find((o) => o.label === filtroTipo);
      if (opcion) {
        if (opcion.objetivo) {
          query = query.eq("objetivo", opcion.objetivo);
        }
        if (opcion.estructura) {
          query = query.eq("estructura", opcion.estructura);
        }
      }
    }

    const { data, error, count } = await query;

    if (error) {
      alert(error.message);
      setActualizandoRutinas(false);
      setLoading(false);
      return;
    }

    const rutinasData = (data || []) as Rutina[];

    if (count !== null) {
      setTotalRutinas(count);
    }

    if (esRecargaFiltros || desde === 0) {
      setRutinas(rutinasData);
    } else {
      setRutinas(prev => [...prev, ...rutinasData]);
    }

    if (profesorId) {
      guardarRutinasEnCache(profesorId, rutinasData);
    }

    setActualizandoRutinas(false);
    setLoading(false);
  }, [rutinasPorPagina, paginaActual, busqueda, filtroTipo]);

  const aplicarFiltros = useCallback(() => {
    setFiltrosAbierto(false);
    setPaginaActual(0);
    cargarRutinas(undefined, true, true);
  }, [cargarRutinas]);

  const limpiarFiltros = useCallback(() => {
    setBusqueda("");
    setFiltroTipo("");
    setFiltrosAbierto(false);
    setPaginaActual(0);
    cargarRutinas(undefined, true, true);
  }, [cargarRutinas]);

  const handleRutinaCreada = useCallback((rutinaId: string) => {
    setMostrarModal(false);
    window.location.href = `/rutinas/${rutinaId}`;
  }, []);

  const borrarRutina = useCallback(async (rutinaId: string) => {
    if (borrandoId) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const profesorId = sessionData.session?.user.id;
      if (!profesorId) {
        window.location.href = "/login";
        return;
      }
      setBorrandoId(rutinaId);
      const result = await borrarRutinaLib({
        supabase,
        rutinaId,
        profesorId,
        onConfirm: (pendientes, completadas) =>
          confirm(
            `Esta rutina tiene:\n\n` +
            `• ${pendientes} asignación(es) pendiente(s)\n` +
            `• ${completadas} asignación(es) completada(s)\n\n` +
            `Las asignaciones pendientes serán eliminadas.\n` +
            `Las asignaciones completadas permanecerán disponibles en el historial del alumno.\n\n` +
            `¿Deseás continuar?`
          ),
      });
      if (!result.ok) {
        if (result.error !== "Operación cancelada por el usuario.") {
          alert(result.error);
        }
        return;
      }
      await cargarRutinas(sessionData.session?.user.id, true, true);
      setPaginaActual(0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert("Error al borrar la rutina.");
    } finally {
      setBorrandoId(null);
    }
  }, [borrandoId, cargarRutinas]);

  const totalPaginas = useMemo(() => Math.max(1, Math.ceil(totalRutinas / rutinasPorPagina)), [totalRutinas, rutinasPorPagina]);
  const paginaSegura = useMemo(() => Math.min(paginaActual, totalPaginas - 1), [paginaActual, totalPaginas]);
  const opcionesFiltro = useMemo(() => OPCIONES_TIPO.filter((o) => !o.esPersonalizado), []);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />
          <div className="h-9 w-36 rounded bg-zinc-800 mb-6" />
          <div className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 mb-5" />
          <div className="grid gap-4">
            <div className="h-40 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-40 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-40 rounded-2xl bg-zinc-900 border border-zinc-800" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-start justify-between mb-6">
          <div>
            <BackButton fallback="/" />
            <h1 className="text-3xl font-bold mt-4">Rutinas</h1>
            <p className="text-zinc-400 mt-1">
              {totalRutinas > 0
                ? `${totalRutinas} ${totalRutinas === 1 ? "rutina" : "rutinas"}`
                : "Creá rutinas y asignalas a tus alumnos."
              }
              {actualizandoRutinas && (
                <span className="ml-2 text-xs text-zinc-500">Actualizando...</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="hidden md:flex gap-2">
              <button
                type="button"
                onClick={actualizarRutinasManual}
                disabled={loading || actualizandoRutinas}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {actualizandoRutinas ? "Actualizando..." : "Actualizar"}
              </button>

              <button
                type="button"
                onClick={() => setMostrarModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600 transition"
              >
                + Agregar rutina
              </button>
            </div>

            {/* Mobile: solo botón + */}
            <button
              type="button"
              onClick={() => setMostrarModal(true)}
              className="md:hidden rounded-full w-12 h-12 bg-emerald-500 flex items-center justify-center text-2xl font-bold hover:bg-emerald-600"
            >
              +
            </button>
          </div>
        </header>

        {/* Mobile: ⚙️ filtros + 🔍 buscador siempre visible */}
        <div className="md:hidden flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setFiltrosAbierto(true)}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 transition shrink-0"
          >
            ⚙️
          </button>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar rutina..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(0); }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 pl-10 pr-3 outline-none focus:border-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Desktop: ⚙️ filtros + buscador */}
        <div className="hidden md:flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => setFiltrosAbierto(true)}
            className="rounded-xl border border-zinc-700 bg-zinc-800 w-12 h-12 flex items-center justify-center text-sm hover:bg-zinc-700 transition shrink-0"
          >
            ⚙️
          </button>
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(0); }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {rutinas.length === 0 ? (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-semibold">No se encontraron rutinas</h2>
            <p className="text-zinc-400 mt-2">
              {busqueda || filtroTipo
                ? "Probá con otros filtros o creá una nueva rutina."
                : "Tocá el botón + para crear tu primera rutina."
              }
            </p>
          </section>
        ) : (
          <>
            <div className="grid gap-3">
              {rutinas.map((rutina) => (
                <div
                  key={rutina.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 md:p-5 hover:border-zinc-700 hover:bg-zinc-800/70 transition"
                >
                  {/* Mobile */}
                  <div className="md:hidden flex items-center justify-between gap-2">
                    <a href={`/rutinas/${rutina.id}`} className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate text-sm">{rutina.nombre}</h3>
                    </a>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setVerRutinaId(rutina.id)}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                      >
                        👁️
                      </button>
                      <a
                        href={`/rutinas/${rutina.id}`}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                      >
                        ✏️
                      </a>
                      <button
                        type="button"
                        onClick={() => borrarRutina(rutina.id)}
                        disabled={borrandoId === rutina.id}
                        className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:flex items-center gap-4">
                    <a href={`/rutinas/${rutina.id}`} className="min-w-0 flex-1 hover:opacity-80 transition">
                      <h3 className="font-semibold truncate">{rutina.nombre}</h3>
                    </a>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setVerRutinaId(rutina.id)}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                      >
                        Ver/Asignar
                      </button>
                      <a
                        href={`/rutinas/${rutina.id}`}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition"
                      >
                        Editar
                      </a>
                      <button
                        type="button"
                        onClick={() => borrarRutina(rutina.id)}
                        disabled={borrandoId === rutina.id}
                        className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-950 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {borrandoId === rutina.id ? "..." : "Borrar"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <button type="button" onClick={() => setPaginaActual((p) => Math.max(0, p - 1))} disabled={paginaSegura === 0} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed">← Anterior</button>
                <span className="text-sm text-zinc-400">Página {paginaSegura + 1} de {totalPaginas}</span>
                <button type="button" onClick={() => setPaginaActual((p) => Math.min(totalPaginas - 1, p + 1))} disabled={paginaSegura >= totalPaginas - 1} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed">Siguiente →</button>
              </div>
            )}
          </>
        )}

        <CrearRutinaModal
          open={mostrarModal}
          onClose={() => setMostrarModal(false)}
          onCreada={handleRutinaCreada}
        />

        {/* Modal Ver/Asignar rutina */}
        {verRutinaId && profesorId && (
          <VerRutinaPlantillaModal
            open={true}
            onClose={() => setVerRutinaId(null)}
            rutinaId={verRutinaId}
            profesorId={profesorId}
          />
        )}

        {/* Bottom sheet: filtros */}
        {filtrosAbierto && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
            <div className="w-full max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">🎯 Filtrar y ordenar</h3>
                <button
                  type="button"
                  onClick={() => setFiltrosAbierto(false)}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Tipo</label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3"
                  >
                    <option value="">Todos los tipos</option>
                    {opcionesFiltro.map((opcion) => (
                      <option key={opcion.label} value={opcion.label}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={aplicarFiltros}
                    className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600"
                  >
                    Aplicar filtros
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
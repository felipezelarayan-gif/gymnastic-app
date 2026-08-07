"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import CrearEjercicioModal from "@/components/ejercicios/CrearEjercicioModal";
import EditarEjercicioModal from "@/components/ejercicios/EditarEjercicioModal";
import BackButton from "@/components/BackButton";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";
import { campoBilingue } from "@/lib/utils/campoBilingue";

type Ejercicio = {
  id: string;
  nombre: string;
  nombre_es?: string | null;
  nombre_en?: string | null;
  grupo_muscular?: string | null;
  grupo_muscular_es?: string | null;
  grupo_muscular_en?: string | null;
  patron_movimiento?: string;
  youtube_url?: string | null;
  peso_corporal?: boolean | null;
};

type EjerciciosCache = {
  ejercicios: Ejercicio[];
  savedAt: string;
};

const CACHE_KEY = "ejercicios_page_cache_v1";
const LIMITE = 10;

export default function EjerciciosPage() {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarEditarModal, setMostrarEditarModal] = useState(false);
  const [ejercicioEditando, setEjercicioEditando] = useState<Ejercicio | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);

  // Búsqueda, filtros y paginación
  const [busqueda, setBusqueda] = useState("");
  const [filtroGrupoMuscular, setFiltroGrupoMuscular] = useState("");
  const [filtroPesoCorporal, setFiltroPesoCorporal] = useState(false);
  const [paginaActual, setPaginaActual] = useState(0);
  const [totalEjercicios, setTotalEjercicios] = useState(0);
  const [filtrosAbierto, setFiltrosAbierto] = useState(false);
  const { mostrarToast } = useToast();
  const { t, idioma } = useIdioma();

  const busquedaRef = useRef(busqueda);
  const filtroGrupoMuscularRef = useRef(filtroGrupoMuscular);
  const filtroPesoCorporalRef = useRef(filtroPesoCorporal);
  const paginaActualRef = useRef(paginaActual);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  busquedaRef.current = busqueda;
  filtroGrupoMuscularRef.current = filtroGrupoMuscular;
  filtroPesoCorporalRef.current = filtroPesoCorporal;
  paginaActualRef.current = paginaActual;

  function cargarDesdeCache(): boolean {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      const cache = JSON.parse(raw) as EjerciciosCache;
      if (!Array.isArray(cache.ejercicios)) return false;
      setEjercicios(cache.ejercicios);
      setLoading(false);
      return true;
    } catch {
      return false;
    }
  }

  function guardarEnCache(data: Ejercicio[]) {
    if (busquedaRef.current) return;
    try {
      const cache: EjerciciosCache = { ejercicios: data, savedAt: new Date().toISOString() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // ignorar
    }
  }

  async function cargarEjercicios(esRecargaFiltros = false) {
    const pag = paginaActualRef.current;
    const bq = busquedaRef.current;
    const ft = filtroGrupoMuscularRef.current;
    const pc = filtroPesoCorporalRef.current;
    const desde = esRecargaFiltros ? 0 : pag * LIMITE;

    let query = supabase
      .from("ejercicios")
      .select("id,nombre,nombre_es,nombre_en,grupo_muscular,grupo_muscular_es,grupo_muscular_en,patron_movimiento,youtube_url,peso_corporal", { count: "exact" })
      .order("nombre")
      .range(desde, desde + LIMITE - 1);

    if (bq.trim()) {
      query = query.ilike("nombre", `%${bq.trim()}%`);
    }

    if (ft) {
      query = query.eq("grupo_muscular", ft);
    }

    if (pc) {
      query = query.eq("peso_corporal", true);
    }

    const { data, error, count } = await query;

    if (error) {
      mostrarToast(error.message, "error");
      setLoading(false);
      return;
    }

    setEjercicios(data || []);
    if (count !== null) {
      setTotalEjercicios(count);
    }

    if (!esRecargaFiltros && pag === 0 && !bq && !ft && !pc) {
      guardarEnCache(data || []);
    }

    setLoading(false);
  }

  function handleEjercicioCreado(ejercicio: { id: string; nombre: string; grupo_muscular?: string | null; youtube_url?: string | null; peso_corporal?: boolean | null }) {
    setEjercicios((prev) => [
      ...prev,
      {
        id: ejercicio.id,
        nombre: ejercicio.nombre,
        grupo_muscular: ejercicio.grupo_muscular || null,
        patron_movimiento: ejercicio.grupo_muscular || undefined,
        youtube_url: ejercicio.youtube_url || undefined,
        peso_corporal: ejercicio.peso_corporal || false,
      },
    ]);
  }

  function handleEjercicioActualizado(ejercicio: Ejercicio) {
    setEjercicios((prev) =>
      prev.map((e) => (e.id === ejercicio.id ? ejercicio : e))
    );
  }

  function abrirEditar(ejercicio: Ejercicio) {
    setEjercicioEditando(ejercicio);
    setMostrarEditarModal(true);
  }

  async function verificarDependencias(ejercicioId: string): Promise<{ tieneDependencias: boolean; mensaje: string }> {
    const { count: rutinasCount } = await supabase
      .from("rutina_ejercicios")
      .select("*", { count: "exact", head: true })
      .eq("ejercicio_id", ejercicioId);

    const { count: evaluacionesRMCount } = await supabase
      .from("evaluaciones_rm_resultados")
      .select("*", { count: "exact", head: true })
      .eq("ejercicio_id", ejercicioId);

    const totalDependencias = (rutinasCount || 0) + (evaluacionesRMCount || 0);

    if (totalDependencias === 0) {
      return { tieneDependencias: false, mensaje: "" };
    }

    const mensaje = `Este ejercicio está siendo usado en:\n`;
    const partes: string[] = [];
    if (rutinasCount && rutinasCount > 0) partes.push(`• ${rutinasCount} rutina(s)`);
    if (evaluacionesRMCount && evaluacionesRMCount > 0) partes.push(`• ${evaluacionesRMCount} evaluación(es) RM`);

    return {
      tieneDependencias: true,
      mensaje: mensaje + "\n" + partes.join("\n") + "\n\nSi lo borrás, se perderá esta información."
    };
  }

  async function borrarEjercicio(id: string) {
    if (!esAdmin) {
      mostrarToast("No tenés permisos para borrar ejercicios.", "error");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return;

    const { tieneDependencias, mensaje } = await verificarDependencias(id);

    if (tieneDependencias) {
      const confirmar = confirm(mensaje + "\n\n¿Estás seguro que querés borrarlo de todas formas?");
      if (!confirmar) return;
    } else {
      const confirmar = confirm("¿Seguro que querés borrar este ejercicio?");
      if (!confirmar) return;
    }

    const { error } = await supabase.from("ejercicios").delete().eq("id", id);

    if (error) {
      mostrarToast(error.message, "error");
      return;
    }

    setEjercicios((prev) => prev.filter((e) => e.id !== id));
    mostrarToast("Ejercicio borrado correctamente", "exito");
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("rol, es_admin")
      .eq("id", sessionData.session.user.id)
      .single();

    if (profile) {
      setUserRole(profile.rol);
      setEsAdmin(profile.es_admin === true);
    }

    const tieneCache = cargarDesdeCache();
    await cargarEjercicios(!tieneCache);
  }

  // Obtener grupos musculares únicos de los ejercicios cargados
  const gruposMusculares = [...new Set(
    ejercicios
      .map((e) => e.grupo_muscular)
      .filter((g): g is string => !!g)
  )].sort();

  // Búsqueda con debounce
  const handleBusquedaChange = useCallback((value: string) => {
    setBusqueda(value);
    setPaginaActual(0);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      cargarEjercicios(true);
    }, 300);
  }, []);

  const aplicarFiltros = useCallback(() => {
    setFiltrosAbierto(false);
    setPaginaActual(0);
    cargarEjercicios(true);
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltroGrupoMuscular("");
    setFiltroPesoCorporal(false);
    setFiltrosAbierto(false);
    setPaginaActual(0);
    cargarEjercicios(true);
  }, []);

  // Recargar al cambiar de página
  const primeraVezRef = useRef(true);
  useEffect(() => {
    if (primeraVezRef.current) {
      primeraVezRef.current = false;
      return;
    }
    cargarEjercicios(false);
  }, [paginaActual]);

  const totalPaginas = Math.max(1, Math.ceil(totalEjercicios / LIMITE));
  const paginaSegura = Math.min(paginaActual, totalPaginas - 1);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-5xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />
          <div className="h-9 w-36 rounded bg-zinc-800 mb-6" />
          <div className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 mb-5" />
          <div className="grid gap-4">
            <div className="h-28 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-28 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-28 rounded-2xl bg-zinc-900 border border-zinc-800" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-start justify-between mb-6">
          <div>
            <BackButton fallback="/home" />
            <h1 className="text-3xl font-bold mt-4">{t("ejercicios.titulo")}</h1>
            <p className="text-zinc-400 mt-1">
              {totalEjercicios > 0
                ? `${totalEjercicios} ${totalEjercicios === 1 ? t("ejercicios.ejercicioSingular") : t("ejercicios.ejerciciosPlural")}`
                : t("ejercicios.descripcionLista")
              }
            </p>
          </div>

          {/* Desktop: botón + en header */}
          <button
            type="button"
            onClick={() => setMostrarModal(true)}
            className="hidden md:inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600 transition mt-4"
          >
            {t("ejercicios.crearEjercicio")}
          </button>
        </header>

        {/* Buscador + filtros */}
        <div className="flex items-center gap-2 mb-5">
          <button
            type="button"
            onClick={() => setFiltrosAbierto(true)}
            className="rounded-xl border border-zinc-700 bg-zinc-800 w-12 h-12 flex items-center justify-center text-sm hover:bg-zinc-700 transition shrink-0"
          >
            ⚙️
          </button>
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm">🔍</span>
            <input
              type="text"
              placeholder={t("ejercicios.buscarPlaceholder")}
              value={busqueda}
              onChange={(e) => handleBusquedaChange(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {ejercicios.length === 0 ? (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-semibold">{t("ejercicios.noEncontrados")}</h2>
            <p className="text-zinc-400 mt-2">
              {busqueda
                ? t("ejercicios.noEncontradosDesc")
                : t("ejercicios.sinEjercicios")
              }
            </p>
          </section>
        ) : (
          <>
            <div className="grid gap-3">
              {ejercicios.map((ejercicio) => (
                <div
                  key={ejercicio.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 hover:bg-zinc-800/70 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-semibold">
                          {campoBilingue(ejercicio, "nombre", idioma)}
                        </h2>

                        {ejercicio.peso_corporal && (
                          <span className="inline-block px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-700 text-emerald-300 text-xs font-medium">
                            {t("ejercicios.pesoCorporalBadge")}
                          </span>
                        )}
                      </div>

                      {campoBilingue(ejercicio, "grupo_muscular", idioma) && (
                        <p className="text-zinc-400 text-sm mt-1">
                          {campoBilingue(ejercicio, "grupo_muscular", idioma)}
                        </p>
                      )}

                      {ejercicio.youtube_url && (
                        <a
                          href={ejercicio.youtube_url}
                          target="_blank"
                          className="text-emerald-400 text-sm mt-2 inline-block"
                        >
                          {t("ejercicios.verVideo")}
                        </a>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => abrirEditar(ejercicio)}
                        className="rounded-lg border border-zinc-700 px-3 py-2 hover:bg-zinc-800 transition"
                        title={t("common.editar")}
                      >
                        ✏️
                      </button>

                      {esAdmin && (
                        <button
                          type="button"
                          onClick={() => borrarEjercicio(ejercicio.id)}
                          className="rounded-lg border border-red-800 px-3 py-2 hover:bg-red-950 transition"
                          title={t("common.borrar")}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
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
                  {t("common.anterior")}
                </button>
                <span className="text-sm text-zinc-400">
                  {t("common.pagina")} {paginaSegura + 1} {t("common.de")} {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas - 1, p + 1))}
                  disabled={paginaSegura >= totalPaginas - 1}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("common.siguiente")}
                </button>
              </div>
            )}
          </>
        )}

        {/* Mobile: botón + flotante */}
        <button
          type="button"
          onClick={() => setMostrarModal(true)}
          className="md:hidden fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-3xl font-bold shadow-lg hover:bg-emerald-600 transition active:scale-95"
        >
          +
        </button>

        <CrearEjercicioModal
          abierto={mostrarModal}
          onCerrar={() => setMostrarModal(false)}
          onCreado={handleEjercicioCreado}
        />

        <EditarEjercicioModal
          abierto={mostrarEditarModal}
          onCerrar={() => setMostrarEditarModal(false)}
          onActualizado={handleEjercicioActualizado}
          ejercicio={ejercicioEditando}
        />
        {/* Bottom sheet: filtros */}
        {filtrosAbierto && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
            <div className="w-full max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">{t("ejercicios.filtrarYOrdenar")}</h3>
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
                  <label className="block text-sm text-zinc-400 mb-1">{t("ejercicios.grupoMuscular")}</label>
                  <select
                    value={filtroGrupoMuscular}
                    onChange={(e) => setFiltroGrupoMuscular(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3"
                  >
                    <option value="">{t("ejercicios.todosLosGrupos")}</option>
                    {gruposMusculares.map((grupo) => (
                      <option key={grupo} value={grupo}>
                        {grupo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filtroPesoCorporal}
                      onChange={(e) => setFiltroPesoCorporal(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-black"
                    />
                    <span className="text-sm text-zinc-300">
                      {t("ejercicios.soloPesoCorporal")}
                    </span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    {t("ejercicios.limpiar")}
                  </button>
                  <button
                    type="button"
                    onClick={aplicarFiltros}
                    className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600"
                  >
                    {t("ejercicios.aplicarFiltros")}
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
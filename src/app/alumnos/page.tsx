"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getRolCached } from "@/lib/rol-cache";
import BackButton from "@/components/BackButton";
import { AlumnoCard } from "@/components/alumnos/AlumnoCard";
import { useToast } from "@/components/ui/ToastProvider";

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
  const [rutinasAsignadas, setRutinasAsignadas] = useState<RutinaAsignada[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>("entrenamientos_pendientes");
  const [orden, setOrden] = useState<Orden>("asc");
  const [loading, setLoading] = useState(true);
  const [metricasLoading, setMetricasLoading] = useState(false);
  const [actualizandoAlumnos, setActualizandoAlumnos] = useState(false);
  const [paginaActual, setPaginaActual] = useState(0);
  const [alumnosPorPagina, setAlumnosPorPagina] = useState(10);
  const [filtrosAbierto, setFiltrosAbierto] = useState(false);
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoApellido, setNuevoApellido] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [guardandoAlumno, setGuardandoAlumno] = useState(false);
  const { mostrarToast } = useToast();

  function cargarAlumnosDesdeCache(userId: string) { /* ... cache logic ... */
    try {
      const cacheRaw = localStorage.getItem(getAlumnosCacheKey(userId));
      if (!cacheRaw) return false;
      const cache = JSON.parse(cacheRaw) as AlumnosPageCache;
      if (!Array.isArray(cache.alumnos)) return false;
      const cacheEsSeguro = cache.alumnos.every((a) => a.profesor_id === userId);
      if (!cacheEsSeguro) { localStorage.removeItem(getAlumnosCacheKey(userId)); return false; }
      setAlumnos(cache.alumnos); setLoading(false); setMetricasLoading(true); setActualizandoAlumnos(true);
      return true;
    } catch { return false; }
  }

  function guardarAlumnosEnCache(userId: string, alumnosParaGuardar: Alumno[]) {
    try {
      localStorage.setItem(getAlumnosCacheKey(userId), JSON.stringify({ alumnos: alumnosParaGuardar, savedAt: new Date().toISOString() }));
    } catch { /* ignore */ }
  }

  async function actualizarAlumnosManual() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) { window.location.href = "/login"; return; }
    try { localStorage.removeItem(getAlumnosCacheKey(userId)); } catch { /* ignore */ }
    await cargarDatos(userId, true);
  }

  useEffect(() => { verificarPermiso(); }, []);

  async function verificarPermiso() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { window.location.href = "/login"; return; }
    const user = sessionData.session.user;
    const rol = await getRolCached(user.id);
    if (rol !== "profe") { window.location.href = "/alumno"; return; }
    const tieneCache = cargarAlumnosDesdeCache(user.id);
    await cargarDatos(user.id, !tieneCache);
  }

  async function cargarDatos(userId?: string, mostrarLoading = true) {
    if (mostrarLoading) setLoading(true);
    if (!mostrarLoading) setActualizandoAlumnos(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const cacheUserId = userId || sessionData.session?.user.id;
    const profesorActualId = cacheUserId;
    if (!profesorActualId) { window.location.href = "/login"; return; }
    const { data: alumnosData, error: alumnosError } = await supabase.from("alumnos").select("id,nombre,apellido,email,telefono,foto_url,created_at,user_id,profesor_id").eq("profesor_id", profesorActualId).order("nombre", { ascending: true });
    if (alumnosError) { mostrarToast(alumnosError.message, "error"); setActualizandoAlumnos(false); setLoading(false); return; }
    const alumnosFiltradosPorProfesor = (alumnosData || []) as Alumno[];
    const idsAlumnos = alumnosFiltradosPorProfesor.map((a) => a.id);
    if (cacheUserId) guardarAlumnosEnCache(cacheUserId, alumnosFiltradosPorProfesor);
    if (idsAlumnos.length === 0) { setAlumnos(alumnosFiltradosPorProfesor); setRutinasAsignadas([]); setMetricasLoading(false); setActualizandoAlumnos(false); setLoading(false); return; }
    setMetricasLoading(true);
    const { data: rutinasData, error: rutinasError } = await supabase.from("rutina_asignaciones").select("alumno_id,completada,fecha_completada,fecha_asignacion").in("alumno_id", idsAlumnos);
    if (rutinasError) { mostrarToast(rutinasError.message, "error"); setMetricasLoading(false); setActualizandoAlumnos(false); setLoading(false); return; }
    setAlumnos(alumnosFiltradosPorProfesor); setRutinasAsignadas((rutinasData || []) as RutinaAsignada[]);
    setMetricasLoading(false); setActualizandoAlumnos(false); setLoading(false);
  }

  function iniciales(nombre?: string | null, apellido?: string | null) { const p = nombre?.charAt(0) || ""; const s = apellido?.charAt(0) || ""; return `${p}${s}`.toUpperCase() || "A"; }
  function nombreCompleto(a: Alumno) { return `${a.nombre || ""} ${a.apellido || ""}`.trim(); }

  const { pendientesPorAlumno, finalizadosPorAlumno, ultimoEntrenamientoPorAlumno } = useMemo(() => {
    const pendientes = new Map<string, number>(); const finalizados = new Map<string, number>(); const ultimoFecha = new Map<string, string>();
    for (const rutina of rutinasAsignadas) {
      const id = rutina.alumno_id;
      if (rutina.completada === true) { finalizados.set(id, (finalizados.get(id) || 0) + 1); const fecha = rutina.fecha_completada || rutina.fecha_asignacion || ""; const actual = ultimoFecha.get(id) || ""; if (fecha > actual) ultimoFecha.set(id, fecha); }
      else { pendientes.set(id, (pendientes.get(id) || 0) + 1); }
    }
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    // Inicio de la semana actual = último lunes
    const hoy = new Date();
    const diaHoy = hoy.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
    const inicioSemana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    if (diaHoy === 0) {
      // Domingo: el lunes fue hace 6 días
      inicioSemana.setDate(inicioSemana.getDate() - 6);
    } else {
      // Resto: el lunes fue hace (diaHoy - 1) días
      inicioSemana.setDate(inicioSemana.getDate() - (diaHoy - 1));
    }

    const ultimoReadable = new Map<string, string>();
    for (const [id, fechaStr] of ultimoFecha) {
      const fechaUltima = new Date(fechaStr);
      const soloFechaUltima = new Date(fechaUltima.getFullYear(), fechaUltima.getMonth(), fechaUltima.getDate());
      const soloHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const diffDias = Math.floor((soloHoy.getTime() - soloFechaUltima.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDias === 0) ultimoReadable.set(id, "Hoy");
      else if (diffDias === 1) ultimoReadable.set(id, "Ayer");
      else if (soloFechaUltima >= inicioSemana) ultimoReadable.set(id, `${diasSemana[fechaUltima.getDay()]} de esta semana`);
      else if (diffDias <= 13) ultimoReadable.set(id, `${diasSemana[fechaUltima.getDay()]} de la semana pasada`);
      else ultimoReadable.set(id, `Hace ${diffDias} días`);
    }
    return { pendientesPorAlumno: pendientes, finalizadosPorAlumno: finalizados, ultimoEntrenamientoPorAlumno: ultimoReadable };
  }, [rutinasAsignadas]);

  const alumnosFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();
    let resultado = alumnos.filter((a) => [a.nombre, a.apellido, a.email, a.telefono].filter(Boolean).join(" ").toLowerCase().includes(texto));
    resultado = [...resultado].sort((a, b) => {
      if (ordenarPor === "nombre") { const va = nombreCompleto(a).toLowerCase(), vb = nombreCompleto(b).toLowerCase(); return orden === "asc" ? va.localeCompare(vb) : vb.localeCompare(va); }
      if (ordenarPor === "antiguedad") { const va = a.created_at || "", vb = b.created_at || ""; return orden === "asc" ? va.localeCompare(vb) : vb.localeCompare(va); }
      if (ordenarPor === "entrenamientos_finalizados") { const fa = finalizadosPorAlumno.get(a.id) || 0, fb = finalizadosPorAlumno.get(b.id) || 0; return orden === "asc" ? fa - fb : fb - fa; }
      if (ordenarPor === "entrenamientos_pendientes") { const pa = pendientesPorAlumno.get(a.id) || 0, pb = pendientesPorAlumno.get(b.id) || 0; return orden === "asc" ? pa - pb : pb - pa; }
      return 0;
    });
    return resultado;
  }, [alumnos, busqueda, ordenarPor, orden, pendientesPorAlumno, finalizadosPorAlumno]);

  const totalPaginas = Math.max(1, Math.ceil(alumnosFiltrados.length / alumnosPorPagina));
  const paginaSegura = Math.min(paginaActual, totalPaginas - 1);
  const inicio = paginaSegura * alumnosPorPagina;
  const fin = inicio + alumnosPorPagina;
  const alumnosPaginados = alumnosFiltrados.slice(inicio, fin);

  async function crearAlumno() {
    if (!nuevoNombre.trim()) {
      mostrarToast("Ingresá el nombre del alumno.", "info");
      return;
    }
    if (!nuevoEmail.trim()) {
      mostrarToast("Ingresá el email del alumno.", "info");
      return;
    }
    setGuardandoAlumno(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const profesorId = sessionData.session?.user?.id;
    const response = await fetch("/api/crear-alumno", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        nombre: nuevoNombre.trim(),
        apellido: nuevoApellido.trim(),
        email: nuevoEmail.trim().toLowerCase(),
        telefono: nuevoTelefono.trim(),
        rol: "alumno",
        profesorId: profesorId || null,
        siteUrl: window.location.origin,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      mostrarToast(data.error || "No se pudo crear el alumno.", "error");
      setGuardandoAlumno(false);
      return;
    }
    setGuardandoAlumno(false);
    mostrarToast("Alumno creado correctamente. Se envió una invitación por email.", "exito");
    setModalCrearAbierto(false);
    setNuevoNombre(""); setNuevoApellido(""); setNuevoEmail(""); setNuevoTelefono("");
    await cargarDatos();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />
          <div className="h-9 w-36 rounded bg-zinc-800 mb-6" />
          <div className="h-14 rounded-2xl bg-zinc-900 border border-zinc-800 mb-5" />
          <div className="grid gap-3">
            <div className="h-32 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-32 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="h-32 rounded-2xl bg-zinc-900 border border-zinc-800" />
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
            <h1 className="text-3xl font-bold mt-4">Alumnos</h1>
            <p className="text-zinc-400 mt-1">
              {alumnos.length} {alumnos.length === 1 ? "alumno registrado" : "alumnos registrados"}
              {actualizandoAlumnos && <span className="ml-2 text-xs text-zinc-500">Actualizando...</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {/* Desktop: boton Agregar (abre modal) */}
            <div className="hidden md:flex gap-2">
              <button type="button" onClick={() => setModalCrearAbierto(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600 transition">+ Agregar alumno</button>
            </div>
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
              placeholder="Buscar alumno..."
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
              placeholder="Buscar por nombre, apellido, email o teléfono..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(0); }}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {alumnosFiltrados.length === 0 ? (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-semibold">No se encontraron alumnos</h2>
            <p className="text-zinc-400 mt-2">Probá con otro nombre, email o teléfono.</p>
          </section>
        ) : (
          <>
            <div className="grid gap-3">
              {alumnosPaginados.map((alumno) => (
                <AlumnoCard key={alumno.id} alumno={alumno} pendientes={pendientesPorAlumno.get(alumno.id) || 0} finalizados={finalizadosPorAlumno.get(alumno.id) || 0} ultimoEntrenamiento={ultimoEntrenamientoPorAlumno.get(alumno.id) || "Sin entrenamientos completados"} metricasLoading={metricasLoading} />
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
      </div>

      {/* FAB: boton flotante para agregar alumno (solo mobile) */}
      <button
        type="button"
        onClick={() => setModalCrearAbierto(true)}
        className="md:hidden fixed bottom-28 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-3xl font-bold shadow-lg hover:bg-emerald-600 transition active:scale-95"
      >
        +
      </button>

      {/* Bottom sheet: filtros (solo mobile) */}
      {filtrosAbierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
          <div className="w-full max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">🎯 Filtrar y ordenar</h3>
              <button type="button" onClick={() => setFiltrosAbierto(false)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Mostrar</label>
                <select value={alumnosPorPagina} onChange={(e) => { setAlumnosPorPagina(Number(e.target.value)); setPaginaActual(0); }} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3">
                  <option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="50">50</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Ordenar por</label>
                <select value={ordenarPor} onChange={(e) => { setOrdenarPor(e.target.value as OrdenarPor); setPaginaActual(0); }} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3">
                  <option value="nombre">Nombre</option><option value="antiguedad">Antigüedad</option><option value="entrenamientos_finalizados">Finalizados</option><option value="entrenamientos_pendientes">Pendientes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Orden</label>
                <select value={orden} onChange={(e) => { setOrden(e.target.value as Orden); setPaginaActual(0); }} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3">
                  <option value="asc">Ascendente</option><option value="desc">Descendente</option>
                </select>
              </div>
              <button type="button" onClick={() => setFiltrosAbierto(false)} className="w-full rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600">Aplicar filtros</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: crear alumno */}
      {modalCrearAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">➕ Nuevo alumno</h3>
              <button type="button" onClick={() => setModalCrearAbierto(false)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
            </div>

            <div className="space-y-3">
              <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700" placeholder="Nombre *" />
              <input value={nuevoApellido} onChange={(e) => setNuevoApellido(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700" placeholder="Apellido" />
              <input type="email" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700" placeholder="Email *" />
              <input value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700" placeholder="Teléfono" />
            </div>

            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setModalCrearAbierto(false)} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800">Cancelar</button>
              <button type="button" onClick={crearAlumno} disabled={guardandoAlumno} className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
                {guardandoAlumno ? "Creando..." : "Crear e invitar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
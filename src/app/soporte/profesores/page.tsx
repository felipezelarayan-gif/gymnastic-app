"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";
import ModalAccionesAdmin from "@/components/shared/ModalAccionesAdmin";

type ProfesorConMetricas = {
  id: string;
  nombre: string | null;
  email: string | null;
  rol: string;
  es_admin: boolean;
  activo: boolean | null;
  puede_crear_profesores: boolean;
  creado_por: string | null;
  totalAlumnos: number;
  totalRutinas: number;
  totalEvaluacionesRM: number;
  totalEvaluacionesFMS: number;
};

export default function SoporteProfesoresPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const { t } = useIdioma();
  const [loading, setLoading] = useState(true);
  const [profesores, setProfesores] = useState<ProfesorConMetricas[]>([]);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtrosAbierto, setFiltrosAbierto] = useState(false);
  const [mostrarCrearModal, setMostrarCrearModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [currentUserRol, setCurrentUserRol] = useState<string | null>(null);
  const [currentUserEsAdmin, setCurrentUserEsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Estados para acciones
  const [profeSeleccionado, setProfeSeleccionado] = useState<ProfesorConMetricas | null>(null);
  const [mostrarAcciones, setMostrarAcciones] = useState(false);
  const [mostrarConfirmarPausar, setMostrarConfirmarPausar] = useState(false);
  const [mostrarConfirmarEliminar, setMostrarConfirmarEliminar] = useState(false);
  const [mostrarModificarPermisos, setMostrarModificarPermisos] = useState(false);
  const [nuevoRol, setNuevoRol] = useState("");
  const [nuevoEsAdmin, setNuevoEsAdmin] = useState(false);
  const [nuevoPuedeCrearProfesores, setNuevoPuedeCrearProfesores] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  useEffect(() => {
    cargarProfesores();
  }, []);

  async function cargarProfesores() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/login");
      return;
    }

    const { data: perfilActual } = await supabase
      .from("profiles")
      .select("rol, es_admin")
      .eq("id", sessionData.session.user.id)
      .maybeSingle();

    setCurrentUserRol(perfilActual?.rol || null);
    setCurrentUserEsAdmin(perfilActual?.es_admin === true);
    setCurrentUserId(sessionData.session.user.id);

    // Solo soporte (rol=admin) puede acceder
    if (perfilActual?.rol !== "admin") {
      router.push("/soporte");
      return;
    }

    const { data: perfiles } = await supabase
      .from("profiles")
      .select("id, nombre, email, rol, es_admin, activo, puede_crear_profesores, creado_por")
      .eq("rol", "profe")
      .order("nombre", { ascending: true });

    if (!perfiles) {
      setLoading(false);
      return;
    }

    const profesoresConMetricas: ProfesorConMetricas[] = await Promise.all(
      perfiles.map(async (p) => {
        const [
          { count: alumnos },
          { count: rutinas },
          { count: evalRM },
          { count: evalFMS },
        ] = await Promise.all([
          supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("profesor_id", p.id),
          supabase.from("rutinas").select("id", { count: "exact", head: true }).eq("profesor_id", p.id),
          supabase.from("evaluaciones_rm").select("id", { count: "exact", head: true }).eq("profesor_id", p.id).is("deleted_at", null),
          supabase.from("evaluaciones_fms").select("id", { count: "exact", head: true }).eq("profesor_id", p.id).is("deleted_at", null),
        ]);

        return {
          id: p.id,
          nombre: p.nombre,
          email: p.email,
          rol: p.rol || "profe",
          es_admin: p.es_admin || false,
          activo: p.activo,
          puede_crear_profesores: p.puede_crear_profesores || false,
          creado_por: p.creado_por,
          totalAlumnos: alumnos || 0,
          totalRutinas: rutinas || 0,
          totalEvaluacionesRM: evalRM || 0,
          totalEvaluacionesFMS: evalFMS || 0,
        };
      })
    );

    setProfesores(profesoresConMetricas);
    setLoading(false);
  }

  async function crearProfesor() {
    if (guardando) return;
    if (!nuevoNombre.trim() || !nuevoEmail.trim()) {
      mostrarToast("Completá todos los campos.", "error");
      return;
    }

    setGuardando(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const response = await fetch("/api/crear-alumno", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        nombre: nuevoNombre.trim(),
        email: nuevoEmail.trim().toLowerCase(),
        rol: "profe",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      mostrarToast(data.error || "No se pudo crear el profesor.", "error");
      setGuardando(false);
      return;
    }

    mostrarToast("Profesor creado correctamente.", "exito");
    setNuevoNombre("");
    setNuevoEmail("");
    setGuardando(false);
    setMostrarCrearModal(false);
    await cargarProfesores();
  }

  // --- Acciones para Soporte ---

  function abrirAcciones(profesor: ProfesorConMetricas) {
    setProfeSeleccionado(profesor);
    setErrorAccion(null);
    setMostrarAcciones(true);
  }

  async function togglePausarProfe() {
    if (!profeSeleccionado) return;
    setProcesando(true);
    setErrorAccion(null);

    try {
      const profeId = profeSeleccionado.id;
      const estaPausado = profeSeleccionado.activo === false;
      const nuevoEstado = estaPausado ? true : false;
      const textoAccion = estaPausado ? "reanudado" : "pausado";

      // 1. Pausar/reanudar el profesor
      await supabase.from("profiles").update({ activo: nuevoEstado }).eq("id", profeId);

      // 2. Pausar/reanudar sus alumnos
      await supabase.from("alumnos").update({ activo: nuevoEstado }).eq("profesor_id", profeId);

      mostrarToast(`Profesor y sus alumnos ${textoAccion} correctamente.`, "exito");
      setMostrarAcciones(false);
      setMostrarConfirmarPausar(false);
      await cargarProfesores();
    } catch (err) {
      setErrorAccion("Error al cambiar el estado del profesor.");
    }
    setProcesando(false);
  }

  async function eliminarProfe() {
    if (!profeSeleccionado) return;
    setProcesando(true);
    setErrorAccion(null);

    try {
      const profeId = profeSeleccionado.id;
      // Transferir alumnos al admin que creó al profesor, o a Soporte
      const adminDestino = profeSeleccionado.creado_por || currentUserId;

      await supabase
        .from("alumnos")
        .update({ profesor_id: adminDestino })
        .eq("profesor_id", profeId);

      // Usar el endpoint existente para borrar
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch("/api/borrar-profesor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ profesorId: profeId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al borrar");
      }

      mostrarToast("Profesor eliminado. Alumnos transferidos a su admin.", "exito");
      setMostrarAcciones(false);
      setMostrarConfirmarEliminar(false);
      await cargarProfesores();
    } catch (err: any) {
      setErrorAccion(err.message || "Error al eliminar el profesor.");
    }
    setProcesando(false);
  }

  async function guardarPermisos() {
    if (!profeSeleccionado) return;
    setProcesando(true);
    setErrorAccion(null);

    const updates: any = {};
    if (nuevoRol) updates.rol = nuevoRol;
    updates.es_admin = nuevoEsAdmin;
    updates.puede_crear_profesores = nuevoEsAdmin ? nuevoPuedeCrearProfesores : false;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profeSeleccionado.id);

    setProcesando(false);

    if (error) {
      setErrorAccion(error.message);
      return;
    }

    mostrarToast("Permisos actualizados correctamente.", "exito");
    setMostrarModificarPermisos(false);
    setMostrarAcciones(false);
    await cargarProfesores();
  }

  function abrirModificarPermisos() {
    if (!profeSeleccionado) return;
    setNuevoRol(profeSeleccionado.rol || "profe");
    setNuevoEsAdmin(profeSeleccionado.es_admin);
    setNuevoPuedeCrearProfesores(profeSeleccionado.puede_crear_profesores);
    setErrorAccion(null);
    setMostrarModificarPermisos(true);
  }

  const puedeGestionar = currentUserRol !== "admin" && currentUserEsAdmin;
  const esSoporte = currentUserRol === "admin";

  const profesoresFiltrados = profesores.filter((p) => {
    if (search) {
      const term = search.toLowerCase();
      const coincide =
        (p.nombre?.toLowerCase() || "").includes(term) ||
        (p.email?.toLowerCase() || "").includes(term);
      if (!coincide) return false;
    }
    if (filtroTipo === "admin" && !p.es_admin) return false;
    if (filtroTipo === "profe" && p.es_admin) return false;
    return true;
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-5xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />
          <div className="h-9 w-48 rounded bg-zinc-800 mb-6" />
          <div className="h-12 rounded-xl bg-zinc-800 mb-6" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-zinc-900 border border-zinc-800 mb-3" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-5xl mx-auto">
        <BackButton fallback="/soporte" />

        <header className="mt-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("soporte.profesores")}</h1>
            <p className="text-zinc-400 mt-2">
              {profesores.length} {profesores.length === 1 ? t("soporte.profesoresPage.profeSingular") : t("soporte.profesoresPage.profePlural")}
            </p>
          </div>
          {puedeGestionar && (
            <button type="button" onClick={() => setMostrarCrearModal(true)} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold hover:bg-emerald-600">{t("soporte.profesoresPage.nuevoProfesor")}</button>
          )}
        </header>

        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setFiltrosAbierto(!filtrosAbierto)} className={`shrink-0 rounded-xl border px-4 py-2 text-sm transition ${filtroTipo !== "todos" ? "border-emerald-600 bg-emerald-500/20 text-emerald-400" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}>
              <span className="hidden sm:inline">{t("common.filtrar")}</span>
              <span className="sm:hidden">⚙️</span>
            </button>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("soporte.profesoresPage.buscarPlaceholder")} className="flex-1 bg-zinc-900 rounded-xl p-4 border border-zinc-700 text-white placeholder-zinc-500" />
          </div>
          {filtrosAbierto && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400 mb-3">{t("soporte.profesoresPage.filtrarTipo")}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setFiltroTipo("todos"); setFiltrosAbierto(false); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${filtroTipo === "todos" ? "border-emerald-600 bg-emerald-500/20 text-emerald-400" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}>{t("common.todos")}</button>
                <button type="button" onClick={() => { setFiltroTipo("admin"); setFiltrosAbierto(false); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${filtroTipo === "admin" ? "border-amber-600 bg-amber-500/20 text-amber-400" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}>{t("soporte.administradores")}</button>
                <button type="button" onClick={() => { setFiltroTipo("profe"); setFiltrosAbierto(false); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${filtroTipo === "profe" ? "border-emerald-600 bg-emerald-500/20 text-emerald-400" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}>{t("soporte.profesores")}</button>
              </div>
            </div>
          )}
        </div>

        {profesoresFiltrados.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400">{search ? t("soporte.profesoresPage.noEncontradosCriterio") : t("soporte.profesoresPage.noRegistrados")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profesoresFiltrados.map((profesor) => (
              <div key={profesor.id} className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition ${profesor.es_admin ? "border-amber-500/50 bg-zinc-900 hover:border-amber-400 hover:bg-zinc-800/70" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/50"}`}>
                <a href={`/soporte/perfil/${profesor.id}`} className="min-w-0 flex-1 hover:opacity-80">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{profesor.nombre || "Sin nombre"}</p>
                    {profesor.es_admin && <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">👑 Admin</span>}
                    {profesor.activo === false && <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">🚫 Pausado</span>}
                  </div>
                  {profesor.email && <p className="text-zinc-500 text-sm truncate">{profesor.email}</p>}
                </a>

                <div className="flex items-center gap-4 text-sm text-zinc-400 shrink-0">
                  <span>👥 {profesor.totalAlumnos} alumnos</span>
                  <span>📋 {profesor.totalRutinas} rutinas</span>
                  <span>📏 {profesor.totalEvaluacionesRM + profesor.totalEvaluacionesFMS} eval.</span>
                </div>

                {esSoporte && (
                  <button type="button" onClick={() => abrirAcciones(profesor)} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 text-lg leading-none" title="Acciones">⋮</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal de acciones (Soporte) */}
        {profeSeleccionado && (
          <ModalAccionesAdmin
            abierto={mostrarAcciones}
            onCerrar={() => { setMostrarAcciones(false); setErrorAccion(null); }}
            titulo={t("common.accionesTitulo", { nombre: profeSeleccionado.nombre || t("common.sinNombre") })}
            error={errorAccion}
            acciones={[
              {
                id: "pausar",
                icono: profeSeleccionado.activo === false ? "▶️" : "⏸️",
                titulo: profeSeleccionado.activo === false ? t("common.reanudarUsuario") : t("common.pausarUsuario"),
                descripcion: profeSeleccionado.activo === false ? t("soporte.profesoresPage.reanudarDesc") : t("soporte.profesoresPage.pausarDesc"),
                color: "yellow",
                onClick: () => setMostrarConfirmarPausar(true),
              },
              {
                id: "eliminar",
                icono: "🗑️",
                titulo: t("common.eliminarUsuario"),
                descripcion: t("soporte.profesoresPage.eliminarDesc"),
                color: "red",
                onClick: () => setMostrarConfirmarEliminar(true),
              },
              {
                id: "permisos",
                icono: "🔧",
                titulo: t("common.modificarPermisos"),
                descripcion: t("soporte.profesoresPage.modificarPermisosDesc"),
                color: "purple",
                onClick: abrirModificarPermisos,
              },
            ]}
          />
        )}

        {/* Modal: Confirmar pausar */}
        {mostrarConfirmarPausar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              {profeSeleccionado?.activo === false ? (
                <>
                  <h3 className="text-xl font-bold text-emerald-400 mb-3">▶️ {t("common.reanudarUsuario")}</h3>
                  <p className="text-zinc-300 text-sm mb-4">{t("soporte.profesoresPage.confirmarReanudar", { nombre: profeSeleccionado?.nombre ?? "" })}</p>
                  <p className="text-zinc-500 text-sm mb-5">{t("soporte.profesoresPage.reanudarInfo")}</p>
                  {errorAccion && <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setMostrarConfirmarPausar(false); setErrorAccion(null); }} disabled={procesando} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50">{t("common.cancelarBtn")}</button>
                    <button type="button" onClick={togglePausarProfe} disabled={procesando} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">{procesando ? t("common.reanudando") : t("common.siReanudar")}</button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-yellow-400 mb-3">⏸️ {t("common.pausarUsuario")}</h3>
                  <p className="text-zinc-300 text-sm mb-4">{t("soporte.profesoresPage.confirmarPausar", { nombre: profeSeleccionado?.nombre ?? "" })}</p>
                  <p className="text-zinc-500 text-sm mb-5">{t("soporte.profesoresPage.pausarInfo")}</p>
                  {errorAccion && <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setMostrarConfirmarPausar(false); setErrorAccion(null); }} disabled={procesando} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50">{t("common.cancelarBtn")}</button>
                    <button type="button" onClick={togglePausarProfe} disabled={procesando} className="flex-1 rounded-xl bg-yellow-600 py-3 text-sm font-semibold hover:bg-yellow-700 disabled:opacity-50">{procesando ? t("common.pausando") : t("common.siPausar")}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal: Confirmar eliminar */}
        {mostrarConfirmarEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-red-400 mb-3">🗑️ {t("common.eliminarUsuario")}</h3>
              <p className="text-zinc-300 text-sm mb-4">{t("soporte.profesoresPage.confirmarEliminar", { nombre: profeSeleccionado?.nombre ?? "" })}</p>
              <p className="text-red-400 text-sm font-semibold mb-5">{t("soporte.profesoresPage.borrarNoDeshacer")}</p>
              {errorAccion && <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setMostrarConfirmarEliminar(false); setErrorAccion(null); }} disabled={procesando} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50">{t("common.cancelarBtn")}</button>
                <button type="button" onClick={eliminarProfe} disabled={procesando} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold hover:bg-red-700 disabled:opacity-50">{procesando ? t("common.eliminando") : t("common.siEliminar")}</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Modificar permisos */}
        {mostrarModificarPermisos && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold">{t("soporte.profesoresPage.permisosTitulo")}</h3>
                <button type="button" onClick={() => setMostrarModificarPermisos(false)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
              </div>
              <p className="text-zinc-400 text-sm mb-4">{t("soporte.profesoresPage.permisosDesc", { nombre: profeSeleccionado?.nombre ?? "" })}</p>
              {errorAccion && <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">{t("soporte.profesoresPage.rolLabel")}</label>
                  <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700 text-white">
                    <option value="admin">{t("soporte.administrador")}</option>
                    <option value="profe">{t("soporte.profesor")}</option>
                    <option value="alumno">{t("alumno.alumnoLabel")}</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={nuevoEsAdmin} onChange={(e) => setNuevoEsAdmin(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-emerald-500" />
                    {t("soporte.profesoresPage.esAdminLabel")}
                  </label>
                </div>
                {nuevoEsAdmin && (
                  <div>
                    <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer">
                      <input type="checkbox" checked={nuevoPuedeCrearProfesores} onChange={(e) => setNuevoPuedeCrearProfesores(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-emerald-500" />
                      {t("soporte.profesoresPage.puedeCrearProfesoresLabel")}
                    </label>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setMostrarModificarPermisos(false)} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800">{t("common.cancelarBtn")}</button>
                  <button type="button" onClick={guardarPermisos} disabled={procesando} className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">{procesando ? t("common.guardando") : t("common.guardarCambios")}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Crear profesor */}
        {mostrarCrearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <h2 className="text-2xl font-bold">{t("soporte.profesoresPage.modalCrearTitulo")}</h2>
                <button type="button" onClick={() => setMostrarCrearModal(false)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">{t("soporte.profesoresPage.nombreLabel")}</label>
                  <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700" placeholder={t("soporte.profesoresPage.nombreLabel")} />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">{t("soporte.profesoresPage.emailLabel")}</label>
                  <input type="email" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700" placeholder="email@ejemplo.com" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setMostrarCrearModal(false)} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800">{t("common.cancelarBtn")}</button>
                  <button type="button" onClick={crearProfesor} disabled={guardando} className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50">{guardando ? t("common.creando") : t("soporte.profesoresPage.crearBtn")}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
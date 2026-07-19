"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import { useToast } from "@/components/ui/ToastProvider";
import ModalAccionesAdmin from "@/components/shared/ModalAccionesAdmin";

type Admin = {
  id: string;
  nombre: string | null;
  email: string | null;
  rol: string;
  es_admin: boolean;
  activo: boolean | null;
  created_at: string;
};

export default function SoporteAdministradoresPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [search, setSearch] = useState("");
  const [currentUserRol, setCurrentUserRol] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mostrarCrearModal, setMostrarCrearModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoPassword, setNuevoPassword] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Estados para acciones
  const [adminSeleccionado, setAdminSeleccionado] = useState<Admin | null>(null);
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
    cargarAdmins();
  }, []);

  async function cargarAdmins() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/login");
      return;
    }

    const { data: perfilActual } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", sessionData.session.user.id)
      .maybeSingle();

    setCurrentUserRol(perfilActual?.rol || null);
    setCurrentUserId(sessionData.session.user.id);

    if (perfilActual?.rol !== "admin") {
      router.push("/soporte");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, nombre, email, rol, es_admin, activo, created_at")
      .or("rol.eq.admin,es_admin.eq.true")
      .order("nombre", { ascending: true });

    setAdmins(data || []);
    setLoading(false);
  }

  async function crearAdmin() {
    if (guardando) return;
    if (!nuevoNombre.trim() || !nuevoEmail.trim() || !nuevoPassword.trim()) {
      mostrarToast("Completá todos los campos.", "error");
      return;
    }

    setGuardando(true);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gigmyxiixkpioracofdl.supabase.co";
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/crear-usuario`;

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoNombre.trim(),
          email: nuevoEmail.trim().toLowerCase(),
          password: nuevoPassword,
          rol: "admin",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        mostrarToast(data.error || "No se pudo crear el administrador.", "error");
        setGuardando(false);
        return;
      }

      const { data: nuevoPerfil } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", nuevoEmail.trim().toLowerCase())
        .maybeSingle();

      if (nuevoPerfil?.id) {
        await supabase
          .from("profiles")
          .update({ es_admin: true })
          .eq("id", nuevoPerfil.id);
      }

      mostrarToast("Administrador creado correctamente.", "exito");
      setNuevoNombre("");
      setNuevoEmail("");
      setNuevoPassword("");
      setGuardando(false);
      setMostrarCrearModal(false);
      await cargarAdmins();
    } catch (err) {
      mostrarToast("Error inesperado al crear el administrador.", "error");
      setGuardando(false);
    }
  }

  // --- Acciones ---

  function abrirAcciones(admin: Admin) {
    setAdminSeleccionado(admin);
    setErrorAccion(null);
    setMostrarAcciones(true);
  }

  async function togglePausarAdmin() {
    if (!adminSeleccionado) return;
    setProcesando(true);
    setErrorAccion(null);

    try {
      const adminId = adminSeleccionado.id;
      const estaPausado = adminSeleccionado.activo === false;
      const nuevoEstado = estaPausado ? true : false;
      const textoAccion = estaPausado ? "reanudado" : "pausado";

      // 1. Pausar/reanudar el admin
      await supabase.from("profiles").update({ activo: nuevoEstado }).eq("id", adminId);

      // 2. Pausar/reanudar todos los profes creados por este admin
      const { data: profes } = await supabase
        .from("profiles")
        .select("id")
        .eq("rol", "profe")
        .eq("creado_por", adminId);

      if (profes) {
        const profeIds = profes.map((p) => p.id);
        await supabase.from("profiles").update({ activo: nuevoEstado }).in("id", profeIds);

        // 3. Pausar/reanudar alumnos de esos profes
        await supabase.from("alumnos").update({ activo: nuevoEstado }).in("profesor_id", profeIds);
      }

      // 4. Pausar/reanudar alumnos directos del admin
      const { data: alumnosAdmin } = await supabase
        .from("alumnos")
        .select("id")
        .eq("profesor_id", adminId);

      if (alumnosAdmin && alumnosAdmin.length > 0) {
        await supabase.from("alumnos").update({ activo: nuevoEstado }).in("id", alumnosAdmin.map((a) => a.id));
      }

      mostrarToast(`Admin y todos sus relacionados ${textoAccion} correctamente.`, "exito");
      setMostrarAcciones(false);
      setMostrarConfirmarPausar(false);
      await cargarAdmins();
    } catch (err) {
      setErrorAccion("Error al cambiar el estado del admin.");
    }
    setProcesando(false);
  }

  async function eliminarAdmin() {
    if (!adminSeleccionado) return;
    setProcesando(true);
    setErrorAccion(null);

    try {
      const adminId = adminSeleccionado.id;
      const soporteId = currentUserId;

      if (!soporteId) {
        setErrorAccion("No se pudo identificar al usuario actual.");
        setProcesando(false);
        return;
      }

      // 1. Transferir profes a Soporte
      await supabase
        .from("profiles")
        .update({ creado_por: soporteId, activo: false })
        .eq("rol", "profe")
        .eq("creado_por", adminId);

      // 2. Transferir alumnos del admin a Soporte
      await supabase
        .from("alumnos")
        .update({ profesor_id: soporteId, activo: false })
        .eq("profesor_id", adminId);

      // 3. Pausar y transferir alumnos de los profes
      const { data: profes } = await supabase
        .from("profiles")
        .select("id")
        .eq("rol", "profe")
        .eq("creado_por", adminId);

      if (profes) {
        const profeIds = profes.map((p) => p.id);
        await supabase
          .from("alumnos")
          .update({ profesor_id: soporteId, activo: false })
          .in("profesor_id", profeIds);
      }

      // 4. Eliminar perfil del admin
      await supabase.from("profiles").delete().eq("id", adminId);

      mostrarToast("Admin eliminado. Profes y alumnos transferidos a Soporte.", "exito");
      setMostrarAcciones(false);
      setMostrarConfirmarEliminar(false);
      await cargarAdmins();
    } catch (err) {
      setErrorAccion("Error al eliminar el admin.");
    }
    setProcesando(false);
  }

  async function guardarPermisos() {
    if (!adminSeleccionado) return;
    setProcesando(true);
    setErrorAccion(null);

    const updates: any = {};
    if (nuevoRol) updates.rol = nuevoRol;
    updates.es_admin = nuevoEsAdmin;
    // Si no es admin, no puede crear profesores
    updates.puede_crear_profesores = nuevoEsAdmin ? nuevoPuedeCrearProfesores : false;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", adminSeleccionado.id);

    setProcesando(false);

    if (error) {
      setErrorAccion(error.message);
      return;
    }

    mostrarToast("Permisos actualizados correctamente.", "exito");
    setMostrarModificarPermisos(false);
    setMostrarAcciones(false);
    await cargarAdmins();
  }

  function abrirModificarPermisos() {
    if (!adminSeleccionado) return;
    setNuevoRol(adminSeleccionado.rol);
    setNuevoEsAdmin(adminSeleccionado.es_admin);
    setNuevoPuedeCrearProfesores((adminSeleccionado as any).puede_crear_profesores || false);
    setErrorAccion(null);
    setMostrarModificarPermisos(true);
  }

  const adminsFiltrados = search
    ? admins.filter(
        (a) =>
          (a.nombre?.toLowerCase() || "").includes(search.toLowerCase()) ||
          (a.email?.toLowerCase() || "").includes(search.toLowerCase())
      )
    : admins;

  const esSoporte = currentUserRol === "admin";

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
            <h1 className="text-3xl font-bold">🔐 Administradores</h1>
            <p className="text-zinc-400 mt-2">
              {admins.length} {admins.length === 1 ? "administrador" : "administradores"} en el sistema
            </p>
          </div>
          {esSoporte && (
            <button
              type="button"
              onClick={() => setMostrarCrearModal(true)}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold hover:bg-emerald-600"
            >
              + Nuevo admin
            </button>
          )}
        </header>

        {/* Buscador */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full bg-zinc-900 rounded-xl p-4 border border-zinc-700 text-white placeholder-zinc-500"
          />
        </div>

        {adminsFiltrados.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400">
              {search ? "No se encontraron administradores con ese criterio." : "No hay administradores registrados."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {adminsFiltrados.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition"
              >
                <a
                  href={`/soporte/perfil/${admin.id}`}
                  className="min-w-0 flex-1 hover:opacity-80"
                >
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{admin.nombre || "Sin nombre"}</p>
                    {admin.rol === "admin" ? (
                      <span className="shrink-0 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400">🛠️ Soporte</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">👑 Admin</span>
                    )}
                    {admin.activo === false && (
                      <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">🚫 Pausado</span>
                    )}
                  </div>
                  {admin.email && <p className="text-zinc-500 text-sm truncate">{admin.email}</p>}
                </a>

                {esSoporte && (
                  <button
                    type="button"
                    onClick={() => abrirAcciones(admin)}
                    className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 text-lg leading-none"
                    title="Acciones"
                  >
                    ⋮
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal de acciones */}
        {adminSeleccionado && (
          <ModalAccionesAdmin
            abierto={mostrarAcciones}
            onCerrar={() => { setMostrarAcciones(false); setErrorAccion(null); }}
            titulo={`⚙️ Acciones - ${adminSeleccionado.nombre || "Sin nombre"}`}
            error={errorAccion}
            acciones={[
              {
                id: "pausar",
                icono: adminSeleccionado.activo === false ? "▶️" : "⏸️",
                titulo: adminSeleccionado.activo === false ? "Reanudar usuario" : "Pausar usuario",
                descripcion: adminSeleccionado.activo === false
                  ? "Reanuda este admin, sus profes y todos los alumnos."
                  : "Pausa este admin, sus profes y todos los alumnos. Reversible.",
                color: "yellow",
                onClick: () => setMostrarConfirmarPausar(true),
              },
              {
                id: "eliminar",
                icono: "🗑️",
                titulo: "Eliminar admin",
                descripcion: "Transfiere profes y alumnos a Soporte. Acción permanente.",
                color: "red",
                onClick: () => setMostrarConfirmarEliminar(true),
              },
              {
                id: "permisos",
                icono: "🔧",
                titulo: "Modificar permisos",
                descripcion: "Cambiar rol y permisos de administrador.",
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
              {adminSeleccionado?.activo === false ? (
                <>
                  <h3 className="text-xl font-bold text-emerald-400 mb-3">▶️ Reanudar administrador</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                    Se reanudará a <strong>{adminSeleccionado?.nombre}</strong> y en cascada a:
                  </p>
                  <ul className="text-zinc-400 text-sm list-disc list-inside mb-4 space-y-1">
                    <li>Todos los profesores que creó</li>
                    <li>Todos los alumnos de esos profesores</li>
                    <li>Todos los alumnos directos del admin</li>
                  </ul>
                  <p className="text-zinc-500 text-sm mb-5">Todos volverán a tener acceso a la app.</p>
                  {errorAccion && <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setMostrarConfirmarPausar(false); setErrorAccion(null); }} disabled={procesando} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50">Cancelar</button>
                    <button type="button" onClick={togglePausarAdmin} disabled={procesando} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">{procesando ? "Reanudando..." : "Sí, reanudar"}</button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-yellow-400 mb-3">⏸️ Pausar administrador</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                    Se pausará a <strong>{adminSeleccionado?.nombre}</strong> y en cascada a:
                  </p>
                  <ul className="text-zinc-400 text-sm list-disc list-inside mb-4 space-y-1">
                    <li>Todos los profesores que creó</li>
                    <li>Todos los alumnos de esos profesores</li>
                    <li>Todos los alumnos directos del admin</li>
                  </ul>
                  <p className="text-zinc-500 text-sm mb-5">Esta acción es reversible.</p>
                  {errorAccion && <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setMostrarConfirmarPausar(false); setErrorAccion(null); }} disabled={procesando} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50">Cancelar</button>
                    <button type="button" onClick={togglePausarAdmin} disabled={procesando} className="flex-1 rounded-xl bg-yellow-600 py-3 text-sm font-semibold hover:bg-yellow-700 disabled:opacity-50">{procesando ? "Pausando..." : "Sí, pausar"}</button>
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
              <h3 className="text-xl font-bold text-red-400 mb-3">🗑️ Eliminar administrador</h3>
              <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                Se eliminará permanentemente a <strong>{adminSeleccionado?.nombre}</strong> y:
              </p>
              <ul className="text-zinc-400 text-sm list-disc list-inside mb-4 space-y-1">
                <li>Sus profesores serán transferidos a Soporte</li>
                <li>Sus alumnos serán transferidos a Soporte</li>
                <li>Todos los usuarios afectados serán pausados</li>
              </ul>
              <p className="text-red-400 text-sm font-semibold mb-5">Esta acción no se puede deshacer.</p>
              {errorAccion && <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setMostrarConfirmarEliminar(false); setErrorAccion(null); }} disabled={procesando} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50">Cancelar</button>
                <button type="button" onClick={eliminarAdmin} disabled={procesando} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold hover:bg-red-700 disabled:opacity-50">{procesando ? "Eliminando..." : "Sí, eliminar"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Modificar permisos */}
        {mostrarModificarPermisos && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold">🔧 Modificar permisos</h3>
                <button type="button" onClick={() => setMostrarModificarPermisos(false)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
              </div>

              <p className="text-zinc-400 text-sm mb-4">
                Modificando permisos de <strong>{adminSeleccionado?.nombre}</strong>
              </p>

              {errorAccion && <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Rol</label>
                  <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700 text-white">
                    <option value="admin">Soporte</option>
                    <option value="profe">Profesor</option>
                    <option value="alumno">Alumno</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={nuevoEsAdmin} onChange={(e) => setNuevoEsAdmin(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-emerald-500" />
                    Es administrador
                  </label>
                </div>
                {nuevoEsAdmin && (
                  <div>
                    <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer">
                      <input type="checkbox" checked={nuevoPuedeCrearProfesores} onChange={(e) => setNuevoPuedeCrearProfesores(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-emerald-500" />
                      Puede crear profesores
                    </label>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setMostrarModificarPermisos(false)} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800">Cancelar</button>
                  <button type="button" onClick={guardarPermisos} disabled={procesando} className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
                    {procesando ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Crear admin */}
        {mostrarCrearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <h2 className="text-2xl font-bold">➕ Nuevo administrador</h2>
                <button type="button" onClick={() => setMostrarCrearModal(false)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Nombre completo</label>
                  <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700" placeholder="Nombre completo" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Email</label>
                  <input type="email" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700" placeholder="email@ejemplo.com" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Contraseña</label>
                  <input type="password" value={nuevoPassword} onChange={(e) => setNuevoPassword(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700" placeholder="Contraseña" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setMostrarCrearModal(false)} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800">Cancelar</button>
                  <button type="button" onClick={crearAdmin} disabled={guardando} className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50">
                    {guardando ? "Creando..." : "Crear admin"}
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
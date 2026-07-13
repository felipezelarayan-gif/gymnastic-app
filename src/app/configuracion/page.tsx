"use client";
// Limpieza y refactorización conservando toda la funcionalidad
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import InformacionCard from "@/components/ui/InformacionCard";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import { FormatoFecha } from "@/lib/utils/formatearFecha";
import { useToast } from "@/components/ui/ToastProvider";

type Profile = {
  id: string;
  nombre?: string | null;
  email?: string | null;
  rol?: string | null;
  foto_url?: string | null;
  es_admin?: boolean | null;
};

type Profe = {
  id: string;
  nombre?: string | null;
  email?: string | null;
  rol?: string | null;
  creado_por?: string | null;
};

type MetricasProfesor = {
  cantidadAlumnos: number;
  cantidadRutinas: number;
  cantidadEvaluacionesRM: number;
};

type MetricasProfesorCache = {
  metricas: MetricasProfesor;
  savedAt: string;
};

const METRICAS_PROFESOR_CACHE_PREFIX = "config_metricas_profesor_v1";

function getMetricasProfesorCacheKey(profesorId: string) {
  return `${METRICAS_PROFESOR_CACHE_PREFIX}_${profesorId}`;
}

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profesores, setProfesores] = useState<Profe[]>([]);
  const [metricasProfesor, setMetricasProfesor] = useState<MetricasProfesor>({
    cantidadAlumnos: 0,
    cantidadRutinas: 0,
    cantidadEvaluacionesRM: 0,
  });
  const [nombreAdmin, setNombreAdmin] = useState("");
  const [nuevoUsuarioNombre, setNuevoUsuarioNombre] = useState("");
  const [nuevoUsuarioEmail, setNuevoUsuarioEmail] = useState("");
  const [mostrarPerfilModal, setMostrarPerfilModal] = useState(false);
  const [mostrarMetricasModal, setMostrarMetricasModal] = useState(false);
  const [mostrarCrearProfesorModal, setMostrarCrearProfesorModal] = useState(false);
  const [mostrarProfesoresModal, setMostrarProfesoresModal] = useState(false);
  const [mostrarFechaModal, setMostrarFechaModal] = useState(false);
  const [mostrarIdiomaModal, setMostrarIdiomaModal] = useState(false);
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [idioma, setIdioma] = useState("es");
  const { formato, cambiarFormato } = useFormatoFecha();
  const { mostrarToast } = useToast();

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line
  }, []);

  function cargarMetricasDesdeCache(profesorId: string) {
    try {
      const cacheRaw = localStorage.getItem(getMetricasProfesorCacheKey(profesorId));
      if (!cacheRaw) return;

      const cache = JSON.parse(cacheRaw) as MetricasProfesorCache;
      if (!cache.metricas) return;

      setMetricasProfesor(cache.metricas);
    } catch {
      // Si el cache falla, seguimos cargando desde la base.
    }
  }

  function guardarMetricasEnCache(profesorId: string, metricas: MetricasProfesor) {
    try {
      const cache: MetricasProfesorCache = {
        metricas,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(getMetricasProfesorCacheKey(profesorId), JSON.stringify(cache));
    } catch {
      // Si localStorage falla, la pantalla debe seguir funcionando normal.
    }
  }

  async function cargarTodo() {
    setLoading(true);
    // Preferencias de idioma/tema
    const savedLanguage = localStorage.getItem("language") || "es";
    setIdioma(savedLanguage);
    const savedTheme = localStorage.getItem("theme");
    setDarkMode(savedTheme !== "light");

    // Sesión actual
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }
    const user = sessionData.session.user;

    // Perfil propio
    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("id,nombre,email,rol,foto_url,es_admin")
      .eq("id", user.id)
      .single();
    if (perfilError || !perfil) {
      mostrarToast(perfilError?.message || "No se pudo cargar el perfil.", "error");
      setLoading(false);
      return;
    }
    if (perfil.rol !== "profe") {
      window.location.href = "/";
      return;
    }
    setProfile(perfil);
    setNombreAdmin(perfil.nombre || "");
    cargarMetricasDesdeCache(user.id);

    const { count: cantidadAlumnos, error: alumnosCountError } = await supabase
      .from("alumnos")
      .select("id", { count: "exact", head: true })
      .eq("profesor_id", user.id);

    if (alumnosCountError) {
      mostrarToast(alumnosCountError.message, "error");
      setLoading(false);
      return;
    }

    const { count: cantidadRutinas, error: rutinasCountError } = await supabase
      .from("rutinas")
      .select("id", { count: "exact", head: true })
      .eq("profesor_id", user.id);

    if (rutinasCountError) {
      mostrarToast(rutinasCountError.message, "error");
      setLoading(false);
      return;
    }

    const { count: cantidadEvaluacionesRM, error: evaluacionesRMCountError } = await supabase
      .from("evaluaciones_rm")
      .select("id", { count: "exact", head: true })
      .eq("profesor_id", user.id)
      .is("deleted_at", null);

    if (evaluacionesRMCountError) {
      mostrarToast(evaluacionesRMCountError.message, "error");
      setLoading(false);
      return;
    }

    const metricasActualizadas: MetricasProfesor = {
      cantidadAlumnos: cantidadAlumnos || 0,
      cantidadRutinas: cantidadRutinas || 0,
      cantidadEvaluacionesRM: cantidadEvaluacionesRM || 0,
    };

    setMetricasProfesor(metricasActualizadas);
    guardarMetricasEnCache(user.id, metricasActualizadas);

    // Profesores (solo para admin)
    const { data: profesData, error: profesError } = await supabase
      .from("profiles")
      .select("id,nombre,email,rol,creado_por")
      .eq("rol", "profe")
      .order("nombre", { ascending: true });
    if (profesError) {
      mostrarToast(profesError.message, "error");
      setLoading(false);
      return;
    }
    setProfesores(profesData || []);
    setLoading(false);
  }

  async function cambiarFoto(event: React.ChangeEvent<HTMLInputElement>) {
    if (!profile) return;
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    const extension = archivo.name.split(".").pop();
    const nombreArchivo = `${profile.id}-${Date.now()}.${extension}`;
    const rutaArchivo = `profes/${nombreArchivo}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(rutaArchivo, archivo, { upsert: true });
    if (uploadError) {
      mostrarToast(uploadError.message, "error");
      return;
    }
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(rutaArchivo);
    const fotoUrl = publicUrlData.publicUrl;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ foto_url: fotoUrl })
      .eq("id", profile.id);
    if (updateError) {
      mostrarToast(updateError.message, "error");
      return;
    }
    setProfile({ ...profile, foto_url: fotoUrl });
    mostrarToast("Foto actualizada correctamente.", "exito");
  }

  async function eliminarFoto() {
    if (!profile) return;
    const confirmar = confirm("¿Querés eliminar tu foto de perfil?");
    if (!confirmar) return;
    const { error } = await supabase
      .from("profiles")
      .update({ foto_url: null })
      .eq("id", profile.id);
    if (error) {
      mostrarToast(error.message, "error");
      return;
    }
    setProfile({ ...profile, foto_url: null });
    mostrarToast("Foto eliminada correctamente.", "exito");
  }

  async function guardarDatosAdmin() {
    if (!profile) return;
    if (!nombreAdmin.trim()) {
      mostrarToast("Ingresá tu nombre.", "error");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ nombre: nombreAdmin })
      .eq("id", profile.id);
    if (error) {
      mostrarToast(error.message, "error");
      return;
    }
    mostrarToast("Datos actualizados.", "exito");
    await cargarTodo();
  }

  async function crearUsuario() {
    if (guardandoUsuario) return;
    if (!nuevoUsuarioNombre.trim()) {
      mostrarToast("Ingresá el nombre del profesor.", "error");
      return;
    }
    if (!nuevoUsuarioEmail.trim()) {
      mostrarToast("Ingresá el email del profesor.", "error");
      return;
    }
    setGuardandoUsuario(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const response = await fetch("/api/crear-alumno", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        nombre: nuevoUsuarioNombre.trim(),
        email: nuevoUsuarioEmail.trim().toLowerCase(),
        rol: "profe",
        profesorId: profile?.id || null,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      mostrarToast(data.error || "No se pudo crear el profesor.", "error");
      setGuardandoUsuario(false);
      return;
    }
    mostrarToast("Profesor creado correctamente. Se envió un email de invitación.", "exito");
    setNuevoUsuarioNombre("");
    setNuevoUsuarioEmail("");
    setGuardandoUsuario(false);
    await cargarTodo();
  }

  async function quitarProfesor(profesorId: string) {
    if (profile?.id === profesorId) {
      mostrarToast("No podés borrar tu propio usuario desde esta pantalla.", "error");
      return;
    }
    const confirmar = confirm(
      "¿Querés borrar este profesor? Se eliminará su usuario, perfil, evaluaciones y plantillas. Los alumnos no se borrarán."
    );
    if (!confirmar) return;
    const response = await fetch("/api/borrar-profesor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ profesorId }),
    });
    const data = await response.json();
    if (!response.ok) {
      mostrarToast(data.error || "No se pudo borrar el profesor.", "error");
      return;
    }
    mostrarToast("Profesor borrado correctamente.", "exito");
    await cargarTodo();
  }

  function cambiarIdioma(nuevoIdioma: string) {
    setIdioma(nuevoIdioma);
    localStorage.setItem("language", nuevoIdioma);
  }

  function toggleTheme() {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem("theme", newValue ? "dark" : "light");
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />
          <div className="h-9 w-48 rounded bg-zinc-800 mb-6" />

          {/* Perfil skeleton */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
            <div className="h-6 w-28 rounded bg-zinc-800 mb-4" />
            <div className="flex items-center gap-4 mb-5">
              <div className="h-20 w-20 rounded-full bg-zinc-800 shrink-0" />
              <div className="space-y-2">
                <div className="h-6 w-40 rounded bg-zinc-800" />
                <div className="h-4 w-24 rounded bg-zinc-800" />
                <div className="h-4 w-48 rounded bg-zinc-800" />
              </div>
            </div>
          </div>

          {/* Métricas skeleton */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
            <div className="h-6 w-24 rounded bg-zinc-800 mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="h-24 rounded-xl bg-zinc-800" />
              <div className="h-24 rounded-xl bg-zinc-800" />
              <div className="h-24 rounded-xl bg-zinc-800" />
            </div>
          </div>

          {/* Secciones genéricas skeleton */}
          <div className="h-32 rounded-2xl bg-zinc-900 border border-zinc-800 mb-4" />
          <div className="h-32 rounded-2xl bg-zinc-900 border border-zinc-800 mb-4" />
          <div className="h-32 rounded-2xl bg-zinc-900 border border-zinc-800" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-4xl mx-auto">
        <BackButton fallback="/" />

        <header className="mt-6 mb-6">
          <h1 className="text-3xl font-bold">⚙️ Configuración</h1>
          <p className="text-zinc-400 mt-2">
            Ajustes generales de la aplicación.
          </p>
        </header>

        {/* 👤 Mi perfil - Card compacta */}
        <section
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 hover:bg-zinc-800/70 transition cursor-pointer"
          onClick={() => setMostrarPerfilModal(true)}
        >
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center text-2xl font-bold text-emerald-400 shrink-0 overflow-hidden">
              {profile?.foto_url ? (
                <img
                  src={profile.foto_url}
                  alt="Foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{(profile?.nombre?.[0] || "P").toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold truncate">
                {profile?.nombre || "Sin nombre"}
              </h3>
              <p className="text-zinc-400 text-sm">Profesor</p>
              {profile?.es_admin && (
                <span className="inline-block mt-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Administrador
                </span>
              )}
            </div>
            <span className="text-zinc-500 text-sm shrink-0">Ver y editar perfil →</span>
          </div>
        </section>

        {/* Modal: Mi perfil */}
        {mostrarPerfilModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <h2 className="text-2xl font-bold">👤 Mi perfil</h2>
                <button
                  type="button"
                  onClick={() => setMostrarPerfilModal(false)}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-4 mb-5">
                <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center text-2xl font-bold text-emerald-400 shrink-0 overflow-hidden">
                  {profile?.foto_url ? (
                    <img
                      src={profile.foto_url}
                      alt="Foto de perfil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{(profile?.nombre?.[0] || "P").toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {profile?.nombre || "Sin nombre"}
                  </h3>
                  <p className="text-zinc-400 text-sm">Profesor</p>
                  {profile?.email && (
                    <p className="text-zinc-500 text-xs mt-1">{profile.email}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <label className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
                      📷 Cambiar foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={cambiarFoto}
                        className="hidden"
                      />
                    </label>
                    {profile?.foto_url && (
                      <button
                        type="button"
                        onClick={eliminarFoto}
                        className="rounded-lg border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950"
                      >
                        🗑️ Eliminar foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Nombre</label>
                  <input
                    value={nombreAdmin}
                    onChange={(e) => setNombreAdmin(e.target.value)}
                    className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Rol</label>
                  <input
                    value={profile?.rol || ""}
                    disabled
                    className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700 text-zinc-400"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMostrarPerfilModal(false)}
                    className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      guardarDatosAdmin();
                      setMostrarPerfilModal(false);
                    }}
                    className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600"
                  >
                    Guardar datos
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 📊 Métricas - Card compacta */}
        <section
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-4 hover:border-zinc-700 hover:bg-zinc-800/70 transition cursor-pointer"
          onClick={() => setMostrarMetricasModal(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">📊 Métricas</h2>
              <p className="text-zinc-400 text-sm mt-0.5">3 métricas disponibles</p>
            </div>
            <span className="text-zinc-500 text-sm shrink-0">Ver detalles →</span>
          </div>
        </section>

        {/* Modal: Métricas */}
        {mostrarMetricasModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <h2 className="text-2xl font-bold">📊 Métricas</h2>
                <button
                  type="button"
                  onClick={() => setMostrarMetricasModal(false)}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">Alumnos</p>
                  <p className="text-3xl font-bold mt-1">{metricasProfesor.cantidadAlumnos}</p>
                  <p className="text-xs text-zinc-500 mt-1">Asignados a este profesor</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">Rutinas</p>
                  <p className="text-3xl font-bold mt-1">{metricasProfesor.cantidadRutinas}</p>
                  <p className="text-xs text-zinc-500 mt-1">Creadas por este profesor</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">Evaluaciones RM</p>
                  <p className="text-3xl font-bold mt-1">{metricasProfesor.cantidadEvaluacionesRM}</p>
                  <p className="text-xs text-zinc-500 mt-1">Creadas por este profesor</p>
                </div>
              </div>

              {profile?.es_admin && (
                <div className="mt-4">
                  <a
                    href="/configuracion/metricas"
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-950"
                  >
                    Ver métricas de profesores
                  </a>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMostrarMetricasModal(false)}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {profile?.es_admin && (
          <>
            {/* ➕ Crear profesor - Card compacta */}
            <section
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-4 hover:border-zinc-700 hover:bg-zinc-800/70 transition cursor-pointer"
              onClick={() => setMostrarCrearProfesorModal(true)}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">➕ Crear nuevo profesor</h2>
                <span className="text-zinc-500 text-sm shrink-0">Abrir formulario →</span>
              </div>
            </section>

            {/* Modal: Crear profesor */}
            {mostrarCrearProfesorModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <h2 className="text-2xl font-bold">➕ Crear nuevo profesor</h2>
                    <button
                      type="button"
                      onClick={() => setMostrarCrearProfesorModal(false)}
                      className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Nombre completo</label>
                      <input
                        value={nuevoUsuarioNombre}
                        onChange={(e) => setNuevoUsuarioNombre(e.target.value)}
                        className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={nuevoUsuarioEmail}
                        onChange={(e) => setNuevoUsuarioEmail(e.target.value)}
                        className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
                        placeholder="email@ejemplo.com"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setMostrarCrearProfesorModal(false)}
                        className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          crearUsuario();
                          setMostrarCrearProfesorModal(false);
                        }}
                        disabled={guardandoUsuario}
                        className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {guardandoUsuario ? "Creando..." : "Crear profesor"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {profile?.es_admin && (
          <>
            {/* 👨‍🏫 Profesores - Card compacta */}
            <section
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-4 hover:border-zinc-700 hover:bg-zinc-800/70 transition cursor-pointer"
              onClick={() => setMostrarProfesoresModal(true)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">👨‍🏫 Profesores</h2>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    {profesores.length} {profesores.length === 1 ? "profesor" : "profesores"}
                  </p>
                </div>
                <span className="text-zinc-500 text-sm shrink-0">Ver lista →</span>
              </div>
            </section>

            {/* Modal: Profesores */}
            {mostrarProfesoresModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="w-full max-w-lg max-h-[85vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col">
                  <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-6 pb-4">
                    <div>
                      <h2 className="text-2xl font-bold">👨‍🏫 Profesores</h2>
                      <p className="text-zinc-500 text-sm mt-1">
                        {profesores.length} {profesores.length === 1 ? "registrado" : "registrados"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMostrarProfesoresModal(false)}
                      className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {profesores.length === 0 ? (
                      <p className="text-zinc-400">No hay profesores cargados.</p>
                    ) : (
                      <div className="space-y-3">
                        {profesores.map((profesor) => (
                          <div
                            key={profesor.id}
                            className="flex items-center justify-between gap-3 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 hover:bg-zinc-800/50 transition"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate">
                                {profesor.nombre || "Sin nombre"}
                              </p>
                              {profesor.email && (
                                <p className="text-zinc-500 text-sm truncate">
                                  {profesor.email}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => quitarProfesor(profesor.id)}
                              className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-950 shrink-0"
                            >
                              Borrar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* 📅 Formato fecha - Card compacta */}
        <section
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-4 hover:border-zinc-700 hover:bg-zinc-800/70 transition cursor-pointer"
          onClick={() => setMostrarFechaModal(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">📅 Formato de fecha</h2>
              <p className="text-zinc-400 text-sm mt-0.5">Formato actual: {formato}</p>
            </div>
            <span className="text-zinc-500 text-sm shrink-0">Cambiar →</span>
          </div>
        </section>

        {/* Modal: Formato fecha */}
        {mostrarFechaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <h2 className="text-2xl font-bold">📅 Formato de fecha</h2>
                <button
                  type="button"
                  onClick={() => setMostrarFechaModal(false)}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <p className="text-zinc-400 text-sm mb-3">
                Elegí cómo querés ver las fechas en toda la aplicación.
              </p>

              <select
                value={formato}
                onChange={(e) => cambiarFormato(e.target.value as FormatoFecha)}
                className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700 text-white"
              >
                <option value="dd/mm/aa">01/12/26</option>
                <option value="dd/mm/aaaa">01/12/2026</option>
                <option value="mm/dd/aa">12/01/26</option>
                <option value="mm/dd/aaaa">12/01/2026</option>
                <option value="aaaa-mm-dd">2026-12-01</option>
              </select>

              <p className="text-zinc-500 text-sm mt-2">
                Formato actual: <span className="text-zinc-300">{formato}</span>
              </p>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMostrarFechaModal(false)}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        <InformacionCard />

        {/* 🌎 Idioma - Card compacta */}
        <section
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mt-4 hover:border-zinc-700 hover:bg-zinc-800/70 transition cursor-pointer"
          onClick={() => setMostrarIdiomaModal(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">🌎 Idioma</h2>
              <p className="text-zinc-400 text-sm mt-0.5">
                {idioma === "es" ? "Español" : "English"}
              </p>
            </div>
            <span className="text-zinc-500 text-sm shrink-0">Cambiar →</span>
          </div>
        </section>

        {/* Modal: Idioma */}
        {mostrarIdiomaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <h2 className="text-2xl font-bold">🌎 Idioma</h2>
                <button
                  type="button"
                  onClick={() => setMostrarIdiomaModal(false)}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <p className="text-zinc-400 text-sm mb-3">
                Elegí el idioma de la aplicación.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    cambiarIdioma("es");
                    setMostrarIdiomaModal(false);
                  }}
                  className={`flex-1 rounded-xl px-5 py-3 border ${
                    idioma === "es"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  Español
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cambiarIdioma("en");
                    setMostrarIdiomaModal(false);
                  }}
                  className={`flex-1 rounded-xl px-5 py-3 border ${
                    idioma === "en"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  English
                </button>
              </div>

              <p className="text-zinc-500 text-sm mt-3">
                Por ahora solo se guarda la preferencia. Más adelante conectamos esta opción con todos los textos de la app.
              </p>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMostrarIdiomaModal(false)}
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4 hover:border-zinc-700 hover:bg-zinc-800/70 transition">
          <h2 className="text-xl font-semibold mb-3">🔒 Sesión</h2>
          <button
            type="button"
            onClick={cerrarSesion}
            className="w-full md:w-auto rounded-xl border border-red-800 px-5 py-3 text-red-400 hover:bg-red-950"
          >
            Cerrar sesión
          </button>
        </section>
      </div>
    </main>
  );
}
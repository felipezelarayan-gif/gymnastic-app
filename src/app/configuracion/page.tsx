"use client";
// Limpieza y refactorización conservando toda la funcionalidad
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  const [nuevoUsuarioRol, setNuevoUsuarioRol] = useState("alumno");
  const [mostrarCrearUsuario, setMostrarCrearUsuario] = useState(false);
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [idioma, setIdioma] = useState("es");

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
      alert(perfilError?.message || "No se pudo cargar el perfil.");
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
      alert(alumnosCountError.message);
      setLoading(false);
      return;
    }

    const { count: cantidadRutinas, error: rutinasCountError } = await supabase
      .from("rutinas")
      .select("id", { count: "exact", head: true })
      .eq("profesor_id", user.id);

    if (rutinasCountError) {
      alert(rutinasCountError.message);
      setLoading(false);
      return;
    }

    const { count: cantidadEvaluacionesRM, error: evaluacionesRMCountError } = await supabase
      .from("evaluaciones_rm")
      .select("id", { count: "exact", head: true })
      .eq("profesor_id", user.id)
      .is("deleted_at", null);

    if (evaluacionesRMCountError) {
      alert(evaluacionesRMCountError.message);
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
      .select("id,nombre,email,rol")
      .eq("rol", "profe")
      .order("nombre", { ascending: true });
    if (profesError) {
      alert(profesError.message);
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
      alert(uploadError.message);
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
      alert(updateError.message);
      return;
    }
    setProfile({ ...profile, foto_url: fotoUrl });
    alert("Foto actualizada correctamente.");
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
      alert(error.message);
      return;
    }
    setProfile({ ...profile, foto_url: null });
    alert("Foto eliminada correctamente.");
  }

  async function guardarDatosAdmin() {
    if (!profile) return;
    if (!nombreAdmin.trim()) {
      alert("Ingresá tu nombre.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ nombre: nombreAdmin })
      .eq("id", profile.id);
    if (error) {
      alert(error.message);
      return;
    }
    alert("Datos actualizados.");
    await cargarTodo();
  }

  async function crearUsuario() {
    if (guardandoUsuario) return;
    if (!nuevoUsuarioNombre.trim()) {
      alert("Ingresá el nombre del usuario.");
      return;
    }
    if (!nuevoUsuarioEmail.trim()) {
      alert("Ingresá el email del usuario.");
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
        rol: nuevoUsuarioRol,
        profesorId: profile?.id || null,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "No se pudo crear el usuario.");
      setGuardandoUsuario(false);
      return;
    }
    alert("Usuario creado correctamente. Se envió un email de invitación.");
    setNuevoUsuarioNombre("");
    setNuevoUsuarioEmail("");
    setNuevoUsuarioRol("alumno");
    setGuardandoUsuario(false);
    await cargarTodo();
  }

  async function quitarProfesor(profesorId: string) {
    if (profile?.id === profesorId) {
      alert("No podés borrar tu propio usuario desde esta pantalla.");
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
      alert(data.error || "No se pudo borrar el profesor.");
      return;
    }
    alert("Profesor borrado correctamente.");
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
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando configuración...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-4xl mx-auto">
        <a href="/" className="text-zinc-400 hover:text-white">
          ← Volver al panel
        </a>

        <header className="mt-6 mb-6">
          <h1 className="text-3xl font-bold">⚙️ Configuración</h1>
          <p className="text-zinc-400 mt-2">
            Ajustes generales de la aplicación.
          </p>
        </header>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-xl font-semibold mb-4">👤 Mi perfil</h2>
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
              <h3 className="text-2xl font-bold">
                {profile?.nombre || "Sin nombre"}
              </h3>
              <p className="text-zinc-400">Profesor</p>
              {profile?.email && (
                <p className="text-zinc-500 text-sm mt-1">{profile.email}</p>
              )}
              {profile?.es_admin && (
                <span className="inline-block mt-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  Administrador
                </span>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
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
                    className="rounded-xl border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-950"
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
            <button
              type="button"
              onClick={guardarDatosAdmin}
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold hover:bg-emerald-600"
            >
              Guardar datos
            </button>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
          <h2 className="text-xl font-semibold mb-3">📊 Métricas</h2>
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
        </section>

        {profile?.es_admin && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
            <button
              type="button"
              onClick={() => setMostrarCrearUsuario(!mostrarCrearUsuario)}
              className="w-full flex items-center justify-between gap-4"
            >
              <h2 className="text-xl font-semibold">➕ Crear usuario</h2>
              <span className="text-2xl">{mostrarCrearUsuario ? "▲" : "▼"}</span>
            </button>
            {mostrarCrearUsuario && (
              <div className="space-y-3 mt-4">
                <input
                  value={nuevoUsuarioNombre}
                  onChange={(e) => setNuevoUsuarioNombre(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
                  placeholder="Nombre completo"
                />
                <input
                  type="email"
                  value={nuevoUsuarioEmail}
                  onChange={(e) => setNuevoUsuarioEmail(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
                  placeholder="email@ejemplo.com"
                />
                <select
                  value={nuevoUsuarioRol}
                  onChange={(e) => setNuevoUsuarioRol(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
                >
                  <option value="alumno">Alumno</option>
                  <option value="profe">Profesor</option>
                </select>
                <button
                  type="button"
                  onClick={crearUsuario}
                  disabled={guardandoUsuario}
                  className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50"
                >
                  {guardandoUsuario ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            )}
          </section>
        )}

        {profile?.es_admin && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
            <h2 className="text-xl font-semibold mb-3">👨‍🏫 Profesores</h2>
            <div className="space-y-3">
              {profesores.length === 0 ? (
                <p className="text-zinc-400">No hay profesores cargados.</p>
              ) : (
                profesores.map((profesor) => (
                  <div
                    key={profesor.id}
                    className="flex items-center justify-between gap-3 border border-zinc-800 rounded-xl p-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {profesor.nombre || "Sin nombre"}
                      </p>
                      {profesor.email && (
                        <p className="text-zinc-500 text-sm">
                          {profesor.email}
                        </p>
                      )}
                      <p className="text-zinc-600 text-xs mt-1">
                        ID: {profesor.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarProfesor(profesor.id)}
                      className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-950"
                    >
                      Borrar
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
          <h2 className="text-xl font-semibold mb-3">🌎 Idioma</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => cambiarIdioma("es")}
              className={`rounded-xl px-5 py-3 border ${
                idioma === "es"
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              Español
            </button>
            <button
              type="button"
              onClick={() => cambiarIdioma("en")}
              className={`rounded-xl px-5 py-3 border ${
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
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
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
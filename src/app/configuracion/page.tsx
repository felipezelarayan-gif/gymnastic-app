"use client";

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

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profesores, setProfesores] = useState<Profe[]>([]);

  const [nombreAdmin, setNombreAdmin] = useState("");

  const [nuevoUsuarioNombre, setNuevoUsuarioNombre] = useState("");
  const [nuevoUsuarioEmail, setNuevoUsuarioEmail] = useState("");
  const [nuevoUsuarioPassword, setNuevoUsuarioPassword] = useState("");
  const [mostrarCrearUsuario, setMostrarCrearUsuario] = useState(false);
  const [nuevoUsuarioRol, setNuevoUsuarioRol] = useState("alumno");

  const [darkMode, setDarkMode] = useState(true);
  const [idioma, setIdioma] = useState("es");

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setLoading(true);

    const savedTheme = localStorage.getItem("theme");
    const savedLanguage = localStorage.getItem("language") || "es";

    setIdioma(savedLanguage);

    if (savedTheme === "light") {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const user = sessionData.session.user;

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

    const { data: profesData } = await supabase
      .from("profiles")
      .select("id,nombre,email,rol")
      .eq("rol", "profe")
      .order("nombre", { ascending: true });

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
      .upload(rutaArchivo, archivo, {
        upsert: true,
      });

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
      .update({
        foto_url: fotoUrl,
      })
      .eq("id", profile.id);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    setProfile({
      ...profile,
      foto_url: fotoUrl,
    });

    alert("Foto actualizada correctamente.");
  }

  async function eliminarFoto() {
    if (!profile) return;

    const confirmar = confirm("¿Querés eliminar tu foto de perfil?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        foto_url: null,
      })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    setProfile({
      ...profile,
      foto_url: null,
    });

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
      .update({
        nombre: nombreAdmin,
      })
      .eq("id", profile.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Datos actualizados.");
    await cargarTodo();
  }

  async function crearUsuario() {
    if (!nuevoUsuarioNombre.trim()) {
      alert("Ingresá el nombre del usuario.");
      return;
    }

    if (!nuevoUsuarioEmail.trim()) {
      alert("Ingresá el email del usuario.");
      return;
    }

    if (!nuevoUsuarioPassword.trim()) {
      alert("Ingresá una contraseña temporal.");
      return;
    }

    const { error } = await supabase.functions.invoke("crear-usuario", {
      body: {
        nombre: nuevoUsuarioNombre.trim(),
        email: nuevoUsuarioEmail.trim().toLowerCase(),
        password: nuevoUsuarioPassword,
        rol: nuevoUsuarioRol,
      },
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Usuario creado correctamente.");

    setNuevoUsuarioNombre("");
    setNuevoUsuarioEmail("");
    setNuevoUsuarioPassword("");
    setNuevoUsuarioRol("alumno");

    await cargarTodo();
  }

  async function quitarProfesor(profesorId: string) {
    if (profile?.id === profesorId) {
      alert("No podés quitarte permisos a vos mismo desde esta pantalla.");
      return;
    }

    const confirmar = confirm(
      "¿Querés quitarle permisos de profesor a este usuario?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        rol: "alumno",
      })
      .eq("id", profesorId);

    if (error) {
      alert(error.message);
      return;
    }

    await cargarTodo();
  }

  function cambiarIdioma(nuevoIdioma: string) {
    setIdioma(nuevoIdioma);
    localStorage.setItem("language", nuevoIdioma);
  }

  function toggleTheme() {
    const newValue = !darkMode;
    setDarkMode(newValue);

    if (newValue) {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    } else {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
    }
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
              <label className="block text-sm text-zinc-400 mb-1">
                Nombre
              </label>

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

        <input
          type="password"
          value={nuevoUsuarioPassword}
          onChange={(e) => setNuevoUsuarioPassword(e.target.value)}
          className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
          placeholder="Contraseña temporal"
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
          className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold hover:bg-emerald-600"
        >
          Crear usuario
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
            Por ahora solo se guarda la preferencia. Más adelante conectamos
            esta opción con todos los textos de la app.
          </p>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
          <h2 className="text-xl font-semibold mb-3">🎨 Apariencia</h2>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-full md:w-auto rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3 text-white hover:bg-zinc-700"
          >
            {darkMode ? "☀️ Cambiar a modo claro" : "🌙 Cambiar a modo oscuro"}
          </button>
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
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Rol = "profe" | "alumno" | null;

export default function Navbar() {
  const [logueado, setLogueado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [rol, setRol] = useState<Rol>(null);

  useEffect(() => {
    revisarSesion();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setLogueado(!!session);

        if (session?.user) {
          cargarRol(session.user.id);
        } else {
          setRol(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function revisarSesion() {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      setLogueado(false);
      setRol(null);
      setCargando(false);
      return;
    }

    setLogueado(true);
    await cargarRol(data.session.user.id);
    setCargando(false);
  }

  async function cargarRol(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", userId)
      .single();

    setRol((data?.rol as Rol) || null);
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "light") {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    } else {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

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

  if (cargando) return null;
  if (!logueado) return null;

  const desktopLink =
    "inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 transition";

  const mobileLink =
  "flex items-center justify-center text-2xl text-white/90 rounded-2xl hover:bg-white/10 active:scale-95 transition";

  const isAlumno = rol === "alumno";

  return (
    <>
      {/* DESKTOP */}
      <nav className="hidden md:block bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto p-4 flex gap-2 items-center">
          {isAlumno ? (
            <>
              <a href="/alumno" className={desktopLink}>
                🏠 <span>Inicio</span>
              </a>

              <a href="/alumno/rutina" className={desktopLink}>
                📋 <span>Mi rutina</span>
              </a>

              <a href="/alumno/progreso" className={desktopLink}>
                📈 <span>Progreso</span>
              </a>

              <a href="/alumno/perfil" className={desktopLink}>
                👤 <span>Mi perfil</span>
              </a>

              <a href="/alumno/configuracion" className={desktopLink}>
                ⚙️ <span>Configuración</span>
              </a>
            </>
          ) : (
            <>
              <a href="/" className={desktopLink}>
                🏠 <span>Home</span>
              </a>

              <a href="/alumnos" className={desktopLink}>
                👥 <span>Alumnos</span>
              </a>

              <a href="/rutinas" className={desktopLink}>
                📋 <span>Rutinas</span>
              </a>

              <a href="/ejercicios" className={desktopLink}>
                💪 <span>Ejercicios</span>
              </a>

              <a href="/configuracion" className={desktopLink}>
                ⚙️ <span>Configuración</span>
              </a>
            </>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="ml-auto px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 transition"
          >
            {darkMode ? "☀️ Claro" : "🌙 Oscuro"}
          </button>

          <button
            type="button"
            onClick={cerrarSesion}
            className="px-4 py-2 rounded-xl border border-red-800 bg-zinc-900 text-red-400 hover:bg-red-950 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* MOBILE */}
      <nav className="md:hidden fixed bottom-5 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-[2rem] border border-white/10 bg-zinc-900/65 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
  <div className="grid grid-cols-5 h-16 px-2">
          {isAlumno ? (
            <>
              <a href="/alumno" className={mobileLink}>🏠</a>
              <a href="/alumno/rutina" className={mobileLink}>📋</a>
              <a href="/alumno/progreso" className={mobileLink}>📈</a>
              <a href="/alumno/perfil" className={mobileLink}>👤</a>
              <a href="/alumno/configuracion" className={mobileLink}>⚙️</a>
            </>
          ) : (
            <>
              <a href="/" className={mobileLink}>🏠</a>
              <a href="/alumnos" className={mobileLink}>👥</a>
              <a href="/rutinas" className={mobileLink}>📋</a>
              <a href="/ejercicios" className={mobileLink}>💪</a>
              <a href="/configuracion" className={mobileLink}>⚙️</a>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Rol = "profe" | "alumno" | null;

export default function Navbar() {
  const pathname = usePathname();
  const [logueado, setLogueado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [rol, setRol] = useState<Rol>(null);

  function isActive(href: string): boolean {
    if (href === "/alumno" || href === "/") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  function getDesktopLinkClass(href: string): string {
    const baseClass = "inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition";
    const isCurrentPage = isActive(href);
    
    if (isCurrentPage) {
      return baseClass + " border-emerald-600 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30";
    }
    return baseClass + " border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800";
  }

  function getMobileLinkClass(href: string): string {
    const baseClass = "flex items-center justify-center text-2xl rounded-full transition";
    const isCurrentPage = isActive(href);
    
    if (isCurrentPage) {
      return baseClass + " bg-emerald-500/30 text-emerald-300";
    }
    return baseClass + " text-white/60 hover:bg-white/10 hover:text-white/90 active:scale-95";
  }

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

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (cargando) return null;
  if (!logueado) return null;

  const isAlumno = rol === "alumno";

  return (
    <>
      {/* DESKTOP */}
      <nav className="hidden md:block bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto p-4 flex gap-2 items-center">
          {isAlumno ? (
            <>
              <a href="/alumno" className={getDesktopLinkClass("/alumno")}>
                🏠 <span>Inicio</span>
              </a>

              <a href="/alumno/rutina" className={getDesktopLinkClass("/alumno/rutina")}>
                📋 <span>Mi rutina</span>
              </a>

              <a href="/alumno/progreso" className={getDesktopLinkClass("/alumno/progreso")}>
                📈 <span>Progreso</span>
              </a>

              <a href="/alumno/perfil" className={getDesktopLinkClass("/alumno/perfil")}>
                👤 <span>Mi perfil</span>
              </a>

              <a href="/alumno/configuracion" className={getDesktopLinkClass("/alumno/configuracion")}>
                ⚙️ <span>Configuración</span>
              </a>
            </>
          ) : (
            <>
              <a href="/" className={getDesktopLinkClass("/")}>
                🏠 <span>Home</span>
              </a>

              <a href="/alumnos" className={getDesktopLinkClass("/alumnos")}>
                👥 <span>Alumnos</span>
              </a>

              <a href="/rutinas" className={getDesktopLinkClass("/rutinas")}>
                📋 <span>Rutinas</span>
              </a>

              <a href="/ejercicios" className={getDesktopLinkClass("/ejercicios")}>
                💪 <span>Ejercicios</span>
              </a>

              <a href="/configuracion" className={getDesktopLinkClass("/configuracion")}>
                ⚙️ <span>Configuración</span>
              </a>
            </>
          )}

          <button
            type="button"
            onClick={cerrarSesion}
            className="ml-auto px-4 py-2 rounded-xl border border-red-800 bg-zinc-900 text-red-400 hover:bg-red-950 transition"
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
              <a href="/alumno" className={getMobileLinkClass("/alumno")}>🏠</a>
              <a href="/alumno/rutina" className={getMobileLinkClass("/alumno/rutina")}>📋</a>
              <a href="/alumno/progreso" className={getMobileLinkClass("/alumno/progreso")}>📈</a>
              <a href="/alumno/perfil" className={getMobileLinkClass("/alumno/perfil")}>👤</a>
              <a href="/alumno/configuracion" className={getMobileLinkClass("/alumno/configuracion")}>⚙️</a>
            </>
          ) : (
            <>
              <a href="/" className={getMobileLinkClass("/")}>🏠</a>
              <a href="/alumnos" className={getMobileLinkClass("/alumnos")}>👥</a>
              <a href="/rutinas" className={getMobileLinkClass("/rutinas")}>📋</a>
              <a href="/ejercicios" className={getMobileLinkClass("/ejercicios")}>💪</a>
              <a href="/configuracion" className={getMobileLinkClass("/configuracion")}>⚙️</a>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
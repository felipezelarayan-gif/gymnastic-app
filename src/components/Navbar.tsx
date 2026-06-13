"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getRolCached, invalidarRolCache } from "@/lib/rol-cache";

type Rol = "profe" | "alumno" | null;

export default function Navbar() {
  const pathname = usePathname();
  const [logueado, setLogueado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [rol, setRol] = useState<Rol>(null);

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isExactActive(href: string): boolean {
    return pathname === href;
  }

  function getDesktopLinkClass(href: string, exact = false): string {
    const baseClass = "inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition";
    const isCurrentPage = exact ? isExactActive(href) : isActive(href);
    
    if (isCurrentPage) {
      return baseClass + " border-emerald-600 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30";
    }
    return baseClass + " border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800";
  }

  function getMobileLinkClass(href: string, exact = false): string {
    const baseClass = "flex items-center justify-center text-2xl rounded-full transition";
    const isCurrentPage = exact ? isExactActive(href) : isActive(href);
    
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
    const rol = await getRolCached(userId);
    setRol(rol as Rol);
  }

  async function cerrarSesion() {
    invalidarRolCache();
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
              <Link href="/alumno" className={getDesktopLinkClass("/alumno", true)} onClick={(e) => { if (isExactActive("/alumno")) e.preventDefault(); }}>
                🏠 <span>Inicio</span>
              </Link>

              <Link href="/alumno/rutina" className={getDesktopLinkClass("/alumno/rutina")} onClick={(e) => { if (isActive("/alumno/rutina")) e.preventDefault(); }}>
                📋 <span>Mi rutina</span>
              </Link>

              <Link href="/alumno/progreso" className={getDesktopLinkClass("/alumno/progreso")} onClick={(e) => { if (isActive("/alumno/progreso")) e.preventDefault(); }}>
                📈 <span>Progreso</span>
              </Link>

              <Link href="/alumno/perfil" className={getDesktopLinkClass("/alumno/perfil")} onClick={(e) => { if (isActive("/alumno/perfil")) e.preventDefault(); }}>
                👤 <span>Mi perfil</span>
              </Link>

              <Link href="/alumno/configuracion" className={getDesktopLinkClass("/alumno/configuracion")} onClick={(e) => { if (isActive("/alumno/configuracion")) e.preventDefault(); }}>
                ⚙️ <span>Configuración</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className={getDesktopLinkClass("/")} onClick={(e) => { if (isActive("/")) e.preventDefault(); }}>
                🏠 <span>Home</span>
              </Link>

              <Link href="/alumnos" className={getDesktopLinkClass("/alumnos")} onClick={(e) => { if (isActive("/alumnos")) e.preventDefault(); }}>
                👥 <span>Alumnos</span>
              </Link>

              <Link href="/rutinas" className={getDesktopLinkClass("/rutinas")} onClick={(e) => { if (isActive("/rutinas")) e.preventDefault(); }}>
                📋 <span>Rutinas</span>
              </Link>

              <Link href="/ejercicios" className={getDesktopLinkClass("/ejercicios")} onClick={(e) => { if (isActive("/ejercicios")) e.preventDefault(); }}>
                💪 <span>Ejercicios</span>
              </Link>

              <Link href="/configuracion" className={getDesktopLinkClass("/configuracion")} onClick={(e) => { if (isActive("/configuracion")) e.preventDefault(); }}>
                ⚙️ <span>Configuración</span>
              </Link>
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
              <Link href="/alumno" className={getMobileLinkClass("/alumno", true)} onClick={(e) => { if (isExactActive("/alumno")) e.preventDefault(); }}>🏠</Link>
              <Link href="/alumno/rutina" className={getMobileLinkClass("/alumno/rutina")} onClick={(e) => { if (isActive("/alumno/rutina")) e.preventDefault(); }}>📋</Link>
              <Link href="/alumno/progreso" className={getMobileLinkClass("/alumno/progreso")} onClick={(e) => { if (isActive("/alumno/progreso")) e.preventDefault(); }}>📈</Link>
              <Link href="/alumno/perfil" className={getMobileLinkClass("/alumno/perfil")} onClick={(e) => { if (isActive("/alumno/perfil")) e.preventDefault(); }}>👤</Link>
              <Link href="/alumno/configuracion" className={getMobileLinkClass("/alumno/configuracion")} onClick={(e) => { if (isActive("/alumno/configuracion")) e.preventDefault(); }}>⚙️</Link>
            </>
          ) : (
            <>
              <Link href="/" className={getMobileLinkClass("/")} onClick={(e) => { if (isActive("/")) e.preventDefault(); }}>🏠</Link>
              <Link href="/alumnos" className={getMobileLinkClass("/alumnos")} onClick={(e) => { if (isActive("/alumnos")) e.preventDefault(); }}>👥</Link>
              <Link href="/rutinas" className={getMobileLinkClass("/rutinas")} onClick={(e) => { if (isActive("/rutinas")) e.preventDefault(); }}>📋</Link>
              <Link href="/ejercicios" className={getMobileLinkClass("/ejercicios")} onClick={(e) => { if (isActive("/ejercicios")) e.preventDefault(); }}>💪</Link>
              <Link href="/configuracion" className={getMobileLinkClass("/configuracion")} onClick={(e) => { if (isActive("/configuracion")) e.preventDefault(); }}>⚙️</Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
}
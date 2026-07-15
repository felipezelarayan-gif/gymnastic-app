"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getRolCached, invalidarRolCache } from "@/lib/rol-cache";
import { useUnsavedChanges } from "@/lib/unsaved-changes-context";

type Rol = "profe" | "alumno" | null;

type MobileTabProps = {
  href: string;
  icon: string;
  label: string;
  isActive: boolean;
  exact?: boolean;
  onNavClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
};

function MobileTab({ href, icon, label, isActive, exact, onNavClick }: MobileTabProps) {
  return (
    <Link
      href={href}
      onClick={(e) => { onNavClick(e, href); if (isActive) e.preventDefault(); }}
      className="flex flex-col items-center justify-center gap-0.5"
    >
      <span className={`flex items-center justify-center w-9 h-9 rounded-full text-xl transition ${
        isActive ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500"
      }`}>
        {icon}
      </span>
      <span className={`text-[11px] font-medium leading-none transition ${
        isActive ? "text-emerald-400" : "text-zinc-500"
      }`}>
        {label}
      </span>
    </Link>
  );
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [logueado, setLogueado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [rol, setRol] = useState<Rol>(null);
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();

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

  function isCurrentPage(href: string, exact = false): boolean {
    return exact ? isExactActive(href) : isActive(href);
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

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (hasUnsavedChanges) {
      const confirmar = confirm("Tenés cambios sin guardar. Si salís ahora, se perderán. ¿Querés continuar?");
      if (!confirmar) {
        e.preventDefault();
        return;
      }

      setHasUnsavedChanges(false);
    }
  }

  async function cerrarSesion() {
    invalidarRolCache();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (cargando) return null;
  if (!logueado) return null;

  // No mostrar Navbar en páginas de auth
  if (pathname === "/login" || pathname === "/reset-password" || pathname === "/bienvenida") return null;

  const isAlumno = rol === "alumno";

  return (
    <>
      {/* DESKTOP */}
      <nav className="hidden md:block bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto p-4 flex gap-2 items-center">
          {isAlumno ? (
            <>
              <Link href="/alumno" className={getDesktopLinkClass("/alumno", true)} onClick={(e) => { handleNavClick(e, "/alumno"); if (isExactActive("/alumno")) e.preventDefault(); }}>
                🏠 <span>Inicio</span>
              </Link>

              <Link href="/alumno/rutina" className={getDesktopLinkClass("/alumno/rutina")} onClick={(e) => { handleNavClick(e, "/alumno/rutina"); if (isActive("/alumno/rutina")) e.preventDefault(); }}>
                📋 <span>Mi rutina</span>
              </Link>

              <Link href="/alumno/progreso" className={getDesktopLinkClass("/alumno/progreso")} onClick={(e) => { handleNavClick(e, "/alumno/progreso"); if (isActive("/alumno/progreso")) e.preventDefault(); }}>
                📈 <span>Progreso</span>
              </Link>

              <Link href="/alumno/perfil" className={getDesktopLinkClass("/alumno/perfil")} onClick={(e) => { handleNavClick(e, "/alumno/perfil"); if (isActive("/alumno/perfil")) e.preventDefault(); }}>
                👤 <span>Mi perfil</span>
              </Link>

              <Link href="/alumno/configuracion" className={getDesktopLinkClass("/alumno/configuracion")} onClick={(e) => { handleNavClick(e, "/alumno/configuracion"); if (isActive("/alumno/configuracion")) e.preventDefault(); }}>
                ⚙️ <span>Configuración</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className={getDesktopLinkClass("/")} onClick={(e) => { handleNavClick(e, "/"); if (isActive("/")) e.preventDefault(); }}>
                🏠 <span>Home</span>
              </Link>

              <Link href="/alumnos" className={getDesktopLinkClass("/alumnos")} onClick={(e) => { handleNavClick(e, "/alumnos"); if (isActive("/alumnos")) e.preventDefault(); }}>
                👥 <span>Alumnos</span>
              </Link>

              <Link href="/rutinas" className={getDesktopLinkClass("/rutinas")} onClick={(e) => { handleNavClick(e, "/rutinas"); if (isActive("/rutinas")) e.preventDefault(); }}>
                📋 <span>Rutinas</span>
              </Link>

              <Link href="/ejercicios" className={getDesktopLinkClass("/ejercicios")} onClick={(e) => { handleNavClick(e, "/ejercicios"); if (isActive("/ejercicios")) e.preventDefault(); }}>
                💪 <span>Ejercicios</span>
              </Link>

              <Link href="/configuracion" className={getDesktopLinkClass("/configuracion")} onClick={(e) => { handleNavClick(e, "/configuracion"); if (isActive("/configuracion")) e.preventDefault(); }}>
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
              <MobileTab href="/alumno" exact icon="🏠" label="Inicio" isActive={isCurrentPage("/alumno", true)} onNavClick={handleNavClick} />
              <MobileTab href="/alumno/rutina" icon="📋" label="Mi rutina" isActive={isCurrentPage("/alumno/rutina")} onNavClick={handleNavClick} />
              <MobileTab href="/alumno/progreso" icon="📈" label="Progreso" isActive={isCurrentPage("/alumno/progreso")} onNavClick={handleNavClick} />
              <MobileTab href="/alumno/perfil" icon="👤" label="Perfil" isActive={isCurrentPage("/alumno/perfil")} onNavClick={handleNavClick} />
              <MobileTab href="/alumno/configuracion" icon="⚙️" label="Config" isActive={isCurrentPage("/alumno/configuracion")} onNavClick={handleNavClick} />
            </>
          ) : (
            <>
              <MobileTab href="/" exact icon="🏠" label="Inicio" isActive={isCurrentPage("/", true)} onNavClick={handleNavClick} />
              <MobileTab href="/alumnos" icon="👥" label="Alumnos" isActive={isCurrentPage("/alumnos")} onNavClick={handleNavClick} />
              <MobileTab href="/rutinas" icon="📋" label="Rutinas" isActive={isCurrentPage("/rutinas")} onNavClick={handleNavClick} />
              <MobileTab href="/ejercicios" icon="💪" label="Ejercicios" isActive={isCurrentPage("/ejercicios")} onNavClick={handleNavClick} />
              <MobileTab href="/configuracion" icon="⚙️" label="Config" isActive={isCurrentPage("/configuracion")} onNavClick={handleNavClick} />
            </>
          )}
        </div>
      </nav>
    </>
  );
}
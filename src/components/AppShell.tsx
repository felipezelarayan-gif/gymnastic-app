"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Cargar componentes pesados de la app solo cuando se necesitan (rutas de la app)
const Navbar = dynamic(() => import("@/components/Navbar"));
const SessionGuard = dynamic(() => import("@/components/SessionGuard"));
const BotonMensajesFlotante = dynamic(
  () => import("@/components/shared/BotonMensajesFlotante")
);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Rutas de la landing/registro que no usan la barra de navegación de la app
  const esLandingOMarketing =
    pathname === "/" ||
    pathname === "/info" ||
    pathname === "/inscripcion";

  if (esLandingOMarketing) {
    return <>{children}</>;
  }

  return (
    <>
      <SessionGuard>
        <Navbar />
        <BotonMensajesFlotante />
        {children}
      </SessionGuard>
    </>
  );
}

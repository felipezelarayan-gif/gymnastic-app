"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { PublicI18nProvider } from "@/lib/i18n-public-context";

// El I18nProvider completo (con todas las traducciones) solo se carga en rutas de la app
const I18nProvider = dynamic(
  () => import("@/lib/i18n-context").then((m) => m.I18nProvider),
  { ssr: false }
);
const UnsavedChangesProvider = dynamic(
  () => import("@/lib/unsaved-changes-context").then((m) => m.UnsavedChangesProvider)
);
const ToastProvider = dynamic(
  () => import("@/components/ui/ToastProvider").then((m) => m.ToastProvider)
);
const AppShell = dynamic(() => import("@/components/AppShell"));

// Rutas públicas que no necesitan los providers de la app
const RUTAS_PUBLICAS = ["/", "/info", "/inscripcion", "/login"];

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const esPublica = RUTAS_PUBLICAS.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  if (esPublica) {
    return (
      <PublicI18nProvider>
        <ToastProvider>{children}</ToastProvider>
      </PublicI18nProvider>
    );
  }

  return (
    <I18nProvider>
      <UnsavedChangesProvider>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </UnsavedChangesProvider>
    </I18nProvider>
  );
}
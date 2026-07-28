import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import SessionGuard from "@/components/SessionGuard";
import BotonMensajesFlotante from "@/components/shared/BotonMensajesFlotante";
import { UnsavedChangesProvider } from "@/lib/unsaved-changes-context";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { I18nProvider } from "@/lib/i18n-context";

export const metadata: Metadata = {
  title: {
    default: "Gymnastic App",
    template: "%s | Gymnastic App",
  },
  description: "Aplicación de entrenamiento para profesores y alumnos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-white pb-24 md:pb-0">
        <I18nProvider>
          <SessionGuard>
            <UnsavedChangesProvider>
              <ToastProvider>
                <Navbar />
                <BotonMensajesFlotante />
                {children}
              </ToastProvider>
            </UnsavedChangesProvider>
          </SessionGuard>
        </I18nProvider>
      </body>
    </html>
  );
}

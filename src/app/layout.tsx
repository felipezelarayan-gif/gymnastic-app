import "./globals.css";
import Navbar from "@/components/Navbar";
import SessionGuard from "@/components/SessionGuard";
import { UnsavedChangesProvider } from "@/lib/unsaved-changes-context";
import { ToastProvider } from "@/components/ui/ToastProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-white pb-24 md:pb-0">
        <SessionGuard>
          <UnsavedChangesProvider>
            <ToastProvider>
              <Navbar />
              {children}
            </ToastProvider>
          </UnsavedChangesProvider>
        </SessionGuard>
      </body>
    </html>
  );
}

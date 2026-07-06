import "./globals.css";
import Navbar from "@/components/Navbar";
import SessionGuard from "@/components/SessionGuard";
import { UnsavedChangesProvider } from "@/lib/unsaved-changes-context";

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
            <Navbar />
            {children}
          </UnsavedChangesProvider>
        </SessionGuard>
      </body>
    </html>
  );
}

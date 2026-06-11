import "./globals.css";
import Navbar from "@/components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-white pb-24 md:pb-0">
        <Navbar />
        {children}
      </body>
    </html>
  );
}

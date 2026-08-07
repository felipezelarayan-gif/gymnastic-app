import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: {
    default: "Forza Zone",
    template: "%s | Forza Zone",
  },
  description: "Plataforma de entrenamiento para entrenadores y atletas",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-white pb-24 md:pb-0">
        <link rel="preconnect" href="https://cptzjiacleezggnzueov.supabase.co" />
        <link rel="preconnect" href="https://gigmyxiixkpioracofdl.supabase.co" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Forza Zone — Plataforma para entrenadores y atletas",
  description:
    "La plataforma para entrenadores y atletas que simplifica la planificación, el seguimiento y la evolución del entrenamiento.",
  openGraph: {
    title: "Forza Zone — Plataforma para entrenadores y atletas",
    description:
      "La plataforma para entrenadores y atletas que simplifica la planificación, el seguimiento y la evolución del entrenamiento.",
    type: "website",
    locale: "es_AR",
    siteName: "Forza Zone",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forza Zone — Plataforma para entrenadores y atletas",
    description:
      "La plataforma para entrenadores y atletas que simplifica la planificación, el seguimiento y la evolución del entrenamiento.",
  },
};

export default function InfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
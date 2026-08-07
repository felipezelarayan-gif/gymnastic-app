import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forza Zone",
    short_name: "Forza Zone",
    description: "Plataforma de entrenamiento para entrenadores y atletas",
    start_url: "/",
    display: "standalone",
    background_color: "#0E0E0E",
    theme_color: "#08A66C",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
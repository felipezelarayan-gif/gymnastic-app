import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Hosts remotos permitidos para next/image (avatares).
    // Si en el futuro se usan avatares de otro dominio, hay que agregarlo acá.
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "cptzjiacleezggnzueov.supabase.co" },
      { protocol: "https", hostname: "gigmyxiixkpioracofdl.supabase.co" },
    ],
  },
};

export default nextConfig;

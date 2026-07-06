"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      // Detecta si la página se cargó desde bfcache (back-forward cache)
      if (event.persisted) {
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session) {
            window.location.replace("/login");
          }
        });
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return <>{children}</>;
}
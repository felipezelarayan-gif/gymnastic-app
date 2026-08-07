"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { t as translateFn } from "@/lib/translations";
import { I18nContext, type Idioma } from "@/lib/i18n-types";

export { I18nContext, useIdioma } from "@/lib/i18n-types";
export type { I18nContextType } from "@/lib/i18n-types";

function detectarIdiomaNavegador(): Idioma {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language?.split("-")[0]?.toLowerCase();
  if (lang === "es") return "es";
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>("es");
  const [cargando, setCargando] = useState(true);

  // Cargar idioma al montar
  useEffect(() => {
    async function cargarIdioma() {
      try {
        // 1. Detectar idioma del navegador
        const browserLang = detectarIdiomaNavegador();

        // 2. Intentar obtener de la DB
        const { data: sessionData } = await supabase.auth.getSession();
        let langFromDB: Idioma | null = null;

        if (sessionData?.session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("idioma")
            .eq("id", sessionData.session.user.id)
            .maybeSingle();

          if (profile?.idioma && (profile.idioma === "es" || profile.idioma === "en")) {
            langFromDB = profile.idioma as Idioma;
          }
        }

        // 3. Fallback a localStorage
        const langFromLS = localStorage.getItem("language") as Idioma | null;
        const langLSValid = langFromLS === "es" || langFromLS === "en";

        // Prioridad: DB > localStorage > browser > "en"
        const idiomaFinal = langFromDB ?? (langLSValid ? langFromLS : browserLang);

        setIdioma(idiomaFinal);
        localStorage.setItem("language", idiomaFinal);
      } catch {
        // Si hay error, usar inglés
        setIdioma("en");
      } finally {
        setCargando(false);
      }
    }

    cargarIdioma();
  }, []);

  const cambiarIdioma = useCallback(async (nuevoIdioma: Idioma) => {
    setIdioma(nuevoIdioma);
    localStorage.setItem("language", nuevoIdioma);

    // Guardar en DB y en auth.users.raw_user_meta_data
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await supabase
          .from("profiles")
          .update({ idioma: nuevoIdioma })
          .eq("id", sessionData.session.user.id);

        // Guardar también en user_metadata para que esté disponible
        // en los templates de email de Supabase Auth (invite, recovery)
        await supabase.auth.updateUser({
          data: { idioma: nuevoIdioma },
        });
      }
    } catch {
      // Si falla la DB, el cambio ya quedó en localStorage
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translateFn(key, idioma, params);
    },
    [idioma]
  );

  return (
    <I18nContext.Provider value={{ t, idioma, cambiarIdioma, cargando }}>
      {children}
    </I18nContext.Provider>
  );
}
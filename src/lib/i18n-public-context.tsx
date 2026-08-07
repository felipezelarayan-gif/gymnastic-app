"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { I18nContext } from "@/lib/i18n-types";
import { tPublico, type IdiomaPublico } from "@/lib/translations-public";

// Provider liviano para páginas públicas (landing, inscripcion, login)
// No llama a Supabase y solo carga las traducciones necesarias.
export function PublicI18nProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdioma] = useState<IdiomaPublico>("es");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    try {
      const langFromLS = localStorage.getItem("language") as IdiomaPublico | null;
      const langLSValid = langFromLS === "es" || langFromLS === "en";
      const browserLang = navigator.language?.split("-")[0]?.toLowerCase();
      const idiomaFinal = langLSValid ? langFromLS : browserLang === "es" ? "es" : "en";
      setIdioma(idiomaFinal);
    } catch {
      setIdioma("es");
    } finally {
      setCargando(false);
    }
  }, []);

  const cambiarIdioma = useCallback(async (nuevoIdioma: IdiomaPublico) => {
    setIdioma(nuevoIdioma);
    try {
      localStorage.setItem("language", nuevoIdioma);
    } catch {
      // ignorar
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return tPublico(key, idioma, params);
    },
    [idioma]
  );

  return (
    <I18nContext.Provider value={{ t, idioma, cambiarIdioma, cargando }}>
      {children}
    </I18nContext.Provider>
  );
}
"use client";

import { createContext, useContext } from "react";

export type Idioma = "es" | "en";

export type I18nContextType = {
  t: (key: string, params?: Record<string, string | number>) => string;
  idioma: Idioma;
  cambiarIdioma: (nuevoIdioma: Idioma) => Promise<void>;
  cargando: boolean;
};

export const I18nContext = createContext<I18nContextType>({
  t: (key) => key,
  idioma: "es",
  cambiarIdioma: async () => {},
  cargando: true,
});

export function useIdioma() {
  return useContext(I18nContext);
}
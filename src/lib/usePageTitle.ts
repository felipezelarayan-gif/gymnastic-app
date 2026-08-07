"use client";

import { useEffect } from "react";
import { useIdioma } from "@/lib/i18n-context";

export function usePageTitle(pageKey: string) {
  const { t, idioma } = useIdioma();

  useEffect(() => {
    const pageTitle = t(`pageTitles.${pageKey}`);
    document.title = `Forza Zone / ${pageTitle}`;
  }, [pageKey, idioma, t]);
}
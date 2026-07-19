"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BotonMensajesFlotante() {
  const [noLeidos, setNoLeidos] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    verificarMensajes();
    const interval = setInterval(verificarMensajes, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verificarMensajes() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) { setVisible(false); return; }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("rol, es_admin")
      .eq("id", sessionData.session.user.id)
      .maybeSingle();

    if (!perfil) { setVisible(false); return; }

    const esSoporte = perfil.rol === "admin" || perfil?.es_admin === true;
    const esProfe = perfil.rol === "profe";

    if (!esSoporte && !esProfe) {
      setVisible(false);
      return;
    }

    let count = 0;

    if (esSoporte) {
      const { count: soporteCount } = await supabase
        .from("mensajes_soporte")
        .select("id", { count: "exact", head: true })
        .eq("leido", false);
      count = soporteCount || 0;
    }

    if (esProfe) {
      const { count: profeCount } = await supabase
        .from("mensajes_soporte")
        .select("id", { count: "exact", head: true })
        .eq("leido", false)
        .eq("destinatario_rol", "profe");
      count = profeCount || 0;
    }

    setNoLeidos(count);
    setVisible(count > 0);
  }

  async function handleClick() {
    if (typeof window === "undefined") return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;
    const { data: perfil } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", sessionData.session.user.id)
      .maybeSingle();
    if (perfil?.rol === "profe") {
      window.location.href = "/mensajes";
    } else {
      window.location.href = "/soporte/mensajes";
    }
  }

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-emerald-600 transition animate-pulse"
      title="Mensajes sin leer"
    >
      💬 <span>{noLeidos}</span>
    </button>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import { useIdioma } from "@/lib/i18n-context";

type Mensaje = {
  id: string;
  remitente_nombre: string | null;
  remitente_email: string | null;
  remitente_rol: string | null;
  motivo: string | null;
  mensaje: string;
  leido: boolean;
  created_at: string;
};

export default function MensajesPage() {
  const router = useRouter();
  const { t } = useIdioma();
  const [loading, setLoading] = useState(true);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState<Mensaje | null>(null);

  useEffect(() => { cargarMensajes(); }, []);

  async function cargarMensajes() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { router.push("/login"); return; }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("rol, es_admin")
      .eq("id", sessionData.session.user.id)
      .maybeSingle();

    // Solo profesores pueden acceder a esta página
    if (perfil?.rol !== "profe") {
      router.push("/");
      return;
    }

    // Traer mensajes donde destinatario_rol = 'profe' y el remitente sea alumno del profesor
    const { data } = await supabase
      .from("mensajes_soporte")
      .select("*")
      .eq("destinatario_rol", "profe")
      .order("created_at", { ascending: false });

    setMensajes(data || []);
    setLoading(false);
  }

  async function marcarLeido(id: string) {
    await supabase.from("mensajes_soporte").update({ leido: true }).eq("id", id);
    setMensajes(mensajes.map((m) => (m.id === id ? { ...m, leido: true } : m)));
  }

  const mensajesFiltrados = filtro === "no-leidos" ? mensajes.filter((m) => !m.leido) : mensajes;

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />
          <div className="h-9 w-48 rounded bg-zinc-800 mb-6" />
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-zinc-900 border border-zinc-800 mb-3" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-3xl mx-auto">
        <BackButton fallback="/" />

        <header className="mt-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("mensajes.titulo")}</h1>
            <p className="text-zinc-400 mt-2">
              {mensajes.filter((m) => !m.leido).length} {t("mensajes.noLeidos")} · {mensajes.length} {t("mensajes.totales")}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFiltro("todos")} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${filtro === "todos" ? "border-emerald-600 bg-emerald-500/20 text-emerald-400" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}>{t("mensajes.todos")}</button>
            <button type="button" onClick={() => setFiltro("no-leidos")} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${filtro === "no-leidos" ? "border-emerald-600 bg-emerald-500/20 text-emerald-400" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}>{t("mensajes.noLeidosBtn")}</button>
          </div>
        </header>

        {mensajesFiltrados.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400">{filtro === "no-leidos" ? t("mensajes.emptyNoLeidos") : t("mensajes.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mensajesFiltrados.map((msg) => (
              <div
                key={msg.id}
                onClick={() => { setMensajeSeleccionado(msg); if (!msg.leido) marcarLeido(msg.id); }}
                className={`rounded-xl border p-4 cursor-pointer transition ${msg.leido ? "border-zinc-800 bg-zinc-900 hover:border-zinc-700" : "border-emerald-800/50 bg-zinc-800/80 hover:border-emerald-600"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{msg.remitente_nombre || t("mensajes.anonimo")}</span>
                    <span className="text-xs text-zinc-500">👤 {t("mensajes.alumno")}</span>
                    {!msg.leido && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {msg.created_at ? new Date(msg.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 truncate">{msg.motivo ? `[${msg.motivo}] ` : ""}{msg.mensaje}</p>
              </div>
            ))}
          </div>
        )}

        {/* Modal detalle */}
        {mensajeSeleccionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{t("mensajes.mensaje")}</h3>
                <button type="button" onClick={() => setMensajeSeleccionado(null)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
              </div>
              <div className="space-y-3 text-sm">
                <div><span className="text-zinc-500">{t("mensajes.de")}:</span> <span className="text-white">{mensajeSeleccionado.remitente_nombre || t("mensajes.anonimo")}</span></div>
                <div><span className="text-zinc-500">{t("mensajes.email")}:</span> <span className="text-white">{mensajeSeleccionado.remitente_email || "—"}</span></div>
                <div><span className="text-zinc-500">{t("mensajes.motivo")}:</span> <span className="text-white">{mensajeSeleccionado.motivo || "—"}</span></div>
                <div><span className="text-zinc-500">{t("mensajes.fecha")}:</span> <span className="text-white">
                  {mensajeSeleccionado.created_at ? new Date(mensajeSeleccionado.created_at).toLocaleString("es-AR") : "—"}
                </span></div>
                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-zinc-300 whitespace-pre-wrap">{mensajeSeleccionado.mensaje}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
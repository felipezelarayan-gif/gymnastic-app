"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";

const motivos = [
  "Problema con mi rutina",
  "Problema con un ejercicio",
  "Problema con mi profesor",
  "Problema con la aplicación",
  "Error técnico",
  "Sugerencia",
  "Otro",
];

type SoporteCardProps = {
  remitenteId: string;
  remitenteNombre: string;
  remitenteEmail: string;
  remitenteRol: string;
  destinatarioRol?: string; // 'soporte' | 'profe' | 'admin'
};

export default function SoporteCard({
  remitenteId,
  remitenteNombre,
  remitenteEmail,
  remitenteRol,
  destinatarioRol: initialDestinatario = "soporte",
}: SoporteCardProps) {
  const { mostrarToast } = useToast();
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [destinatarioRol, setDestinatarioRol] = useState(initialDestinatario);

  // Si es alumno: puede elegir entre "Profesor" o "Soporte Técnico"
  // Si es profesor: puede elegir entre "Administrador" o "Soporte Técnico"
  // Si es admin/soporte: solo Soporte Técnico (sin selector)
  const esAlumno = remitenteRol === "alumno";
  const esProfe = remitenteRol === "profe";
  const mostrarSelector = esAlumno || esProfe;

  async function enviarMensaje() {
    if (enviando) return;
    if (!motivo) {
      mostrarToast("Seleccioná un motivo.", "error");
      return;
    }
    if (!mensaje.trim()) {
      mostrarToast("Escribí tu consulta.", "error");
      return;
    }

    setEnviando(true);
    try {
      const { error } = await supabase.from("mensajes_soporte").insert({
        remitente_id: remitenteId,
        remitente_nombre: remitenteNombre,
        remitente_email: remitenteEmail,
        remitente_rol: remitenteRol,
        destinatario_rol: destinatarioRol,
        motivo,
        mensaje: mensaje.trim(),
        leido: false,
      });

      if (error) throw error;

      // Enviar notificación por email (edge function)
      try {
        const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enviar-email-mensaje`;
        await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
          },
          body: JSON.stringify({
            remitenteId,
            remitenteNombre,
            remitenteEmail,
            remitenteRol,
            destinatarioRol,
            motivo,
            mensaje: mensaje.trim(),
          }),
        });
      } catch (emailErr) {
        // El email es secundario, no bloqueamos el envío del mensaje
        console.error("Error al enviar email:", emailErr);
      }

      mostrarToast("Mensaje enviado correctamente.", "exito");
      setMotivo("");
      setMensaje("");
    } catch (err: any) {
      mostrarToast(err.message || "Error al enviar el mensaje.", "error");
    }
    setEnviando(false);
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
      <h2 className="text-xl font-semibold mb-4">📞 Soporte</h2>

      <div className="space-y-3">
        {mostrarSelector && (
          <select
            value={destinatarioRol}
            onChange={(e) => setDestinatarioRol(e.target.value)}
            className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700 text-white"
          >
            {esAlumno ? (
              <>
                <option value="profe">👨‍🏫 Profesor</option>
                <option value="soporte">🛠️ Soporte Técnico</option>
              </>
            ) : (
              <>
                <option value="admin">👑 Administrador</option>
                <option value="soporte">🛠️ Soporte Técnico</option>
              </>
            )}
          </select>
        )}

        <select
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700 text-white"
        >
          <option value="">Motivo de la consulta</option>
          {motivos.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          className="w-full bg-zinc-800 rounded-xl p-3 min-h-32 border border-zinc-700 text-white"
          placeholder="Describe tu consulta..."
        />

        <button
          type="button"
          onClick={enviarMensaje}
          disabled={enviando}
          className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "📨 Enviar"}
        </button>
      </div>
    </section>
  );
}

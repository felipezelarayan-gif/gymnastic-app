import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { emailLayout, dataCard } from "../_shared/email-layout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  remitenteId: string;
  remitenteNombre: string;
  remitenteEmail: string;
  remitenteRol: string;
  destinatarioRol: string;
  motivo: string;
  mensaje: string;
  idioma?: string;
}

function getLabels(idioma: string) {
  const es = {
    titulo: "Nuevo mensaje recibido",
    descripcion: "Tenés un mensaje de {{nombre}}",
    motivo: "Motivo",
    mensaje: "Mensaje",
    verMensaje: "Ver mensaje en la app →",
    noRespondas: "Forza Zone · No respondas a este email",
  };
  const en = {
    titulo: "New message received",
    descripcion: "You have a message from {{nombre}}",
    motivo: "Reason",
    mensaje: "Message",
    verMensaje: "View message in the app →",
    noRespondas: "Forza Zone · Do not reply to this email",
  };
  return idioma === "en" ? en : es;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: Payload = await req.json();
    console.log("Payload recibido:", JSON.stringify(payload));

    if (!payload.remitenteId || !payload.destinatarioRol || !payload.mensaje) {
      console.log("Error: Faltan datos obligatorios");
      return new Response(
        JSON.stringify({ error: "Faltan datos obligatorios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    console.log("BREVO_API_KEY configurada:", BREVO_API_KEY ? "SÍ" : "NO");
    if (!BREVO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY no configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log("SUPABASE_URL:", supabaseUrl ? "configurada" : "NO");
    console.log("SUPABASE_SERVICE_ROLE_KEY:", serviceRoleKey ? "configurada" : "NO");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Error de configuración del servidor." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Determinar el email del destinatario según el rol
    let destinatarioEmail = "";
    let destinatarioNombre = "";

    if (payload.destinatarioRol === "soporte" || payload.destinatarioRol === "admin") {
      const { data: admins } = await supabaseAdmin
        .from("profiles")
        .select("email, nombre")
        .or("rol.eq.admin,es_admin.eq.true")
        .limit(1);

      if (admins && admins.length > 0) {
        destinatarioEmail = admins[0].email || "";
        destinatarioNombre = admins[0].nombre || "Soporte";
      }
    } else if (payload.destinatarioRol === "profe") {
      const { data: alumno } = await supabaseAdmin
        .from("alumnos")
        .select("profesor_id")
        .eq("user_id", payload.remitenteId)
        .maybeSingle();

      if (alumno?.profesor_id) {
        const { data: profe } = await supabaseAdmin
          .from("profiles")
          .select("email, nombre")
          .eq("id", alumno.profesor_id)
          .maybeSingle();

        if (profe) {
          destinatarioEmail = profe.email || "";
          destinatarioNombre = profe.nombre || "Profesor";
        }
      }
    }

    if (!destinatarioEmail) {
      return new Response(
        JSON.stringify({ error: "No se pudo determinar el destinatario." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const remitenteLabel = payload.remitenteRol === "alumno" ? "Alumno" : payload.remitenteRol === "profe" ? "Profesor" : "Usuario";

    const appUrl = Deno.env.get("APP_URL") || "http://localhost:3000";
    const linkDestino = payload.destinatarioRol === "profe" ? "/mensajes" : "/soporte/mensajes";
    const linkCompleto = `${appUrl}${linkDestino}`;

    const L = getLabels(payload.idioma || "es");

    // Generar el HTML usando el EmailLayout compartido
    const html = emailLayout({
      titulo: L.titulo,
      descripcion: L.descripcion.replace("{{nombre}}", payload.remitenteNombre),
      bodyHtml:
        dataCard(payload.remitenteNombre, `${remitenteLabel} · ${payload.remitenteEmail}`) +
        dataCard(L.motivo, payload.motivo) +
        dataCard(L.mensaje, payload.mensaje),
      ctaText: L.verMensaje,
      ctaUrl: linkCompleto,
      footerText: "Forza Zone",
    });

    // Enviar email via Brevo API
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "Forza Zone",
          email: "entrenamiento-app@hotmail.com",
        },
        to: [
          {
            email: destinatarioEmail,
            name: destinatarioNombre,
          },
        ],
        subject: `Nuevo mensaje de ${payload.remitenteNombre} (${remitenteLabel}) - ${payload.motivo}`,
        htmlContent: html,
      }),
    });

    if (!brevoResponse.ok) {
      const brevoError = await brevoResponse.text();
      console.error("Brevo error:", brevoError);
      return new Response(
        JSON.stringify({ error: "Error al enviar el email." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailEnviado: destinatarioEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { emailLayout, dataCard } from "../_shared/email-layout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Etiquetas bilingües del email
function getLabels(idioma: string) {
  const es = {
    titulo: "Nuevo contacto desde la web",
    descripcion: "Alguien completó el formulario de contacto en nuestro sitio.",
    nombre: "Nombre",
    email: "Email",
    mensaje: "Mensaje",
  };
  const en = {
    titulo: "New contact from the website",
    descripcion: "Someone completed the contact form on our website.",
    nombre: "Name",
    email: "Email",
    mensaje: "Message",
  };
  return idioma === "en" ? en : es;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { nombre, email, mensaje, idioma } = await req.json();

    if (!nombre || !email || !mensaje) {
      return new Response(
        JSON.stringify({ error: "Faltan datos obligatorios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY no configurada." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const L = getLabels(idioma || "es");

    // Generar el HTML usando el EmailLayout compartido
    const html = emailLayout({
      titulo: L.titulo,
      descripcion: L.descripcion,
      bodyHtml:
        dataCard(L.nombre, nombre) +
        dataCard(L.email, email) +
        dataCard(L.mensaje, mensaje),
    });

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
            email: "entrenamiento-app@hotmail.com",
            name: "Forza Zone",
          },
        ],
        replyTo: {
          email: email,
          name: nombre,
        },
        subject: `${L.titulo} - ${nombre}`,
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
      JSON.stringify({ success: true }),
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
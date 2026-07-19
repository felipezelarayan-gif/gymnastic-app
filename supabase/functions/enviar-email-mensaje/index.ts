import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      // Buscar un usuario con rol=admin o es_admin=true
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
      // Buscar el profesor del alumno remitente
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

    // Determinar nombre del remitente para el asunto
    const remitenteLabel = payload.remitenteRol === "alumno" ? "Alumno" : payload.remitenteRol === "profe" ? "Profesor" : "Usuario";

    // Determinar la URL de la app y el link según el destinatario
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:3000";
    const linkDestino = payload.destinatarioRol === "profe" ? "/mensajes" : "/soporte/mensajes";
    const linkCompleto = `${appUrl}${linkDestino}`;

    // Enviar email via Brevo API
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "Gymnastic App",
          email: "entrenamiento-app@hotmail.com",
        },
        to: [
          {
            email: destinatarioEmail,
            name: destinatarioNombre,
          },
        ],
        subject: `Nuevo mensaje de ${payload.remitenteNombre} (${remitenteLabel}) - ${payload.motivo}`,
        htmlContent: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 24px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 8px;">💬</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Nuevo mensaje recibido</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">Tenés un mensaje de ${payload.remitenteNombre}</p>
            </div>

            <!-- Body -->
            <div style="padding: 24px; background-color: #18181b; border: 1px solid #27272a; border-top: none; border-radius: 0 0 12px 12px;">
              <!-- Remitente info -->
              <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background-color: #27272a; border-radius: 10px; margin-bottom: 16px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #059669; display: flex; align-items: center; justify-content: center; font-size: 20px; color: white; flex-shrink: 0;">
                  ${payload.remitenteRol === "alumno" ? "👤" : "👨‍🏫"}
                </div>
                <div style="flex: 1;">
                  <p style="color: #e4e4e7; margin: 0; font-size: 15px; font-weight: 600;">${payload.remitenteNombre}</p>
                  <p style="color: #a1a1aa; margin: 2px 0 0 0; font-size: 13px;">${remitenteLabel} · ${payload.remitenteEmail}</p>
                </div>
              </div>

              <!-- Motivo -->
              <div style="margin-bottom: 16px;">
                <p style="color: #a1a1aa; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Motivo</p>
                <div style="display: inline-block; padding: 4px 12px; background-color: #05966915; border: 1px solid #05966940; border-radius: 20px; color: #34d399; font-size: 13px; font-weight: 500;">
                  ${payload.motivo}
                </div>
              </div>

              <!-- Mensaje -->
              <div style="margin-bottom: 20px;">
                <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Mensaje</p>
                <div style="padding: 16px; background-color: #27272a; border-radius: 10px; border: 1px solid #3f3f46;">
                  <p style="color: #e4e4e7; margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${payload.mensaje}</p>
                </div>
              </div>

              <!-- Botón -->
              <div style="text-align: center; margin-top: 24px;">
                <a href="${linkCompleto}"
                   style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">
                  Ver mensaje en la app →
                </a>
              </div>

              <!-- Footer -->
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #27272a; text-align: center;">
                <p style="color: #52525b; margin: 0; font-size: 12px;">
                  Gymnastic App · No respondas a este email
                </p>
              </div>
            </div>
          </div>
        `,
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
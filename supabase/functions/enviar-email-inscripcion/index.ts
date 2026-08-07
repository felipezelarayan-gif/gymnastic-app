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
    tituloAtleta: "Nueva inscripción de atleta",
    tituloEntrenador: "Nueva inscripción de entrenador",
    descripcion: "Alguien completó el formulario de inscripción.",
    datosContacto: "Datos de contacto",
    nombre: "Nombre",
    email: "Email",
    telefono: "Teléfono",
    datosFisicos: "Datos físicos",
    edad: "Edad",
    sexo: "Sexo",
    altura: "Altura",
    peso: "Peso",
    gimnasio: "Gimnasio",
    tieneGimnasio: "¿Tiene gimnasio?",
    usoGimnasio: "Uso de Forza Zone",
    gym: "Para el gym (varios profesores)",
    individual: "Solo para él/ella",
    si: "Sí",
    no: "No",
    entrenamiento: "Entrenamiento",
    objetivo: "Objetivo",
    experiencia: "Experiencia",
    disponibilidad: "Disponibilidad",
    especialidad: "Especialidad",
    experienciaEntrenador: "Años de experiencia",
    certificaciones: "Certificaciones",
    lesiones: "Lesiones o condiciones",
    mensaje: "Mensaje adicional",
  };

  const en = {
    tituloAtleta: "New athlete registration",
    tituloEntrenador: "New coach registration",
    descripcion: "Someone completed the registration form.",
    datosContacto: "Contact info",
    nombre: "Name",
    email: "Email",
    telefono: "Phone",
    datosFisicos: "Physical data",
    edad: "Age",
    sexo: "Sex",
    altura: "Height",
    peso: "Weight",
    gimnasio: "Gym",
    tieneGimnasio: "Has a gym?",
    usoGimnasio: "Forza Zone use",
    gym: "For the gym (multiple coaches)",
    individual: "Only for him/her",
    si: "Yes",
    no: "No",
    entrenamiento: "Training",
    objetivo: "Goal",
    experiencia: "Experience",
    disponibilidad: "Availability",
    especialidad: "Specialty",
    experienciaEntrenador: "Years of experience",
    certificaciones: "Certifications",
    lesiones: "Injuries or conditions",
    mensaje: "Additional message",
  };

  return idioma === "en" ? en : es;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { tipo, idioma, nombre, email, telefono, edad, sexo, altura_cm, peso_kg, objetivo, experiencia, lesiones, disponibilidad, mensaje, tiene_gimnasio, uso_gimnasio, especialidad, experiencia_entrenador, certificaciones } = payload;

    if (!nombre || !email) {
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
    const esEntrenador = tipo === "entrenador";

    const subject = esEntrenador
      ? `Nueva inscripción - Entrenador - ${nombre}`
      : `Nueva inscripción - Atleta - ${nombre}`;

    const titulo = esEntrenador ? L.tituloEntrenador : L.tituloAtleta;

    // Datos de contacto (común)
    let bodyHtml =
      dataCard(L.nombre, nombre) +
      dataCard(L.email, email) +
      dataCard(L.telefono, telefono || "-");

    // Datos adicionales según tipo
    if (esEntrenador) {
      // Entrenador
      const gimnasioValor = tiene_gimnasio === "si" ? L.si : L.no;
      const usoGimnasioValor = uso_gimnasio === "gym" ? L.gym : L.individual;
      bodyHtml += dataCard(
        L.gimnasio,
        `${L.tieneGimnasio}: ${gimnasioValor}${tiene_gimnasio === "si" ? `<br/>${L.usoGimnasio}: ${usoGimnasioValor}` : ""}`
      );
      bodyHtml += dataCard(
        L.entrenamiento,
        `${L.especialidad}: ${especialidad || "-"}<br/>${L.experienciaEntrenador}: ${experiencia_entrenador || experiencia || "-"}<br/>${L.certificaciones}: ${certificaciones || "-"}<br/>${L.disponibilidad}: ${disponibilidad || "-"}`
      );
    } else {
      // Atleta
      bodyHtml += dataCard(
        L.datosFisicos,
        `${L.edad}: ${edad || "-"}<br/>${L.sexo}: ${sexo || "-"}<br/>${L.altura}: ${altura_cm || "-"} cm<br/>${L.peso}: ${peso_kg || "-"} kg`
      );
      bodyHtml += dataCard(
        L.entrenamiento,
        `${L.objetivo}: ${objetivo || "-"}<br/>${L.experiencia}: ${experiencia || "-"}<br/>${L.disponibilidad}: ${disponibilidad || "-"}`
      );
      if (lesiones) {
        bodyHtml += dataCard(L.lesiones, lesiones);
      }
    }

    if (mensaje) {
      bodyHtml += dataCard(L.mensaje, mensaje);
    }

    const html = emailLayout({
      titulo,
      descripcion: L.descripcion,
      bodyHtml,
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
        subject,
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
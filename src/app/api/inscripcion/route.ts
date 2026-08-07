import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, email, telefono, edad, sexo, altura_cm, peso_kg, objetivo, experiencia, lesiones, disponibilidad, mensaje, tipo, idioma, tiene_gimnasio, uso_gimnasio, especialidad, certificaciones } = body;

    if (!nombre || !email) {
      return NextResponse.json({ error: "Nombre y email son requeridos" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Guardar en Supabase
    const { error: insertError } = await supabaseAdmin.from("inscripciones").insert({
      nombre,
      email,
      telefono: telefono || null,
      edad: edad || null,
      sexo: sexo || null,
      altura_cm: altura_cm || null,
      peso_kg: peso_kg || null,
      objetivo: objetivo || null,
      experiencia: experiencia || null,
      lesiones: lesiones || null,
      disponibilidad: disponibilidad || null,
      mensaje: mensaje || null,
      tipo: tipo || null,
      tiene_gimnasio: tiene_gimnasio || null,
      uso_gimnasio: uso_gimnasio || null,
      especialidad: especialidad || null,
      certificaciones: certificaciones || null,
    });

    if (insertError) {
      console.error("Error al guardar inscripción:", insertError);
    }

    // 2. Enviar email via Edge Function (Brevo)
    try {
      const { error: fnError } = await supabaseAdmin.functions.invoke("enviar-email-inscripcion", {
        body: { tipo, idioma, nombre, email, telefono, edad, sexo, altura_cm, peso_kg, objetivo, experiencia, lesiones, disponibilidad, mensaje, tiene_gimnasio, uso_gimnasio, especialidad, certificaciones },
      });

      if (fnError) {
        console.error("Error al invocar Edge Function inscripcion:", fnError);
      }
    } catch (err) {
      console.error("Error al enviar email inscripción:", err);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al procesar el formulario" }, { status: 500 });
  }
}
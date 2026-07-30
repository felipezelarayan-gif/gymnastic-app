import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, email, mensaje } = body;

    // Validación básica
    if (!nombre || !email || !mensaje) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    // TODO: Configurar envío de email
    // Opciones para implementar:
    // 1. Supabase Edge Function + Resend/SendGrid
    // 2. Nodemailer con SMTP
    // 3. API de Resend directamente
    //
    // Ejemplo con Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'contacto@gymnasticapp.com',
    //   to: process.env.EMAIL_DESTINO!,
    //   subject: `Nuevo contacto de ${nombre}`,
    //   text: `Nombre: ${nombre}\nEmail: ${email}\nMensaje: ${mensaje}`,
    // });

    console.log("Nuevo contacto:", { nombre, email, mensaje });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error al procesar el mensaje" },
      { status: 500 }
    );
  }
}
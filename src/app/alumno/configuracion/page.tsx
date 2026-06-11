"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "entrenamiento-app@hotmail.com";
const APP_VERSION = "1.0.0";
const LAST_UPDATE = "06/06/2026";

type Alumno = {
  id: string;
  user_id: string;
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
  foto_url?: string | null;
  profesor_email?: string | null;
};

const motivos = [
  "Problema con mi rutina",
  "Problema con un ejercicio",
  "Problema con mi profesor",
  "Problema con la aplicación",
  "Error técnico",
  "Sugerencia",
  "Otro",
];

export default function AlumnoConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [alumno, setAlumno] = useState<Alumno | null>(null);

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");

  const [mostrarEmail, setMostrarEmail] = useState(false);
  const [nuevoEmail, setNuevoEmail] = useState("");

  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarDatos() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const user = sessionData.session.user;

    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.rol !== "alumno") {
      window.location.href = "/";
      return;
    }

    const { data, error } = await supabase
      .from("alumnos")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      alert(error?.message || "No se pudo cargar la configuración.");
      setLoading(false);
      return;
    }

    setAlumno(data);
    setNuevoEmail(data.email || user.email || "");
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      cargarDatos();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function iniciales() {
    const nombre = alumno?.nombre?.[0] || "";
    const apellido = alumno?.apellido?.[0] || "";
    return `${nombre}${apellido}`.toUpperCase() || "A";
  }

  async function cambiarPassword() {
    if (!alumno?.email) {
      alert("No se encontró el email del usuario.");
      return;
    }

    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
      alert("Completá todos los campos.");
      return;
    }

    if (passwordNueva !== passwordConfirmar) {
      alert("La nueva contraseña no coincide.");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: alumno.email,
      password: passwordActual,
    });

    if (loginError) {
      alert("La contraseña actual no es correcta.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: passwordNueva,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Contraseña actualizada correctamente.");
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordConfirmar("");
    setMostrarPassword(false);
  }

  async function cambiarEmail() {
    if (!nuevoEmail.trim()) {
      alert("Ingresá un nuevo email.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      email: nuevoEmail.trim(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Se envió una confirmación al nuevo correo.");
    setMostrarEmail(false);
  }

  function enviarSoporte() {
    if (!motivo) {
      alert("Seleccioná un motivo.");
      return;
    }

    if (!mensaje.trim()) {
      alert("Escribí tu consulta.");
      return;
    }

    const enviarAProfesor =
      motivo === "Problema con mi rutina" ||
      motivo === "Problema con un ejercicio";

    const destinatario = enviarAProfesor
      ? alumno?.profesor_email || ADMIN_EMAIL
      : ADMIN_EMAIL;

    const nombreCompleto = `${alumno?.nombre || ""} ${
      alumno?.apellido || ""
    }`.trim();

    const asunto = `Soporte - ${motivo}`;

    const cuerpo = `
Nombre: ${nombreCompleto}
Email: ${alumno?.email || "-"}
Rol: Alumno

Motivo: ${motivo}

Mensaje:
${mensaje}
`;

    const mailto = `mailto:${destinatario}?subject=${encodeURIComponent(
      asunto
    )}&body=${encodeURIComponent(cuerpo)}`;

    window.location.href = mailto;
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading || !alumno) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando configuración...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <Link href="/alumno" className="text-zinc-400 hover:text-white">
          ← Volver al panel
        </Link>

        <header className="mt-6 mb-6">
          <h1 className="text-3xl font-bold">⚙️ Configuración</h1>
          <p className="text-zinc-400 mt-2">
            Administrá tu cuenta, soporte y sesión.
          </p>
        </header>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-xl font-semibold mb-4">👤 Perfil</h2>

          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center text-2xl font-bold text-emerald-400 overflow-hidden">
              {alumno.foto_url ? (
                <img
                  src={alumno.foto_url}
                  alt="Foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                iniciales()
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-2xl font-bold">
                {alumno.nombre} {alumno.apellido || ""}
              </h3>
              <p className="text-zinc-400">{alumno.email || "-"}</p>

              <Link
                href="/alumno/perfil"
                className="mt-3 inline-block rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800"
              >
                ✏️ Editar perfil
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
          <h2 className="text-xl font-semibold mb-4">🔒 Seguridad</h2>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="w-full text-left rounded-xl border border-zinc-800 p-4 hover:bg-zinc-800"
            >
              Cambiar contraseña
            </button>

            {mostrarPassword && (
              <div className="space-y-3">
                <input
                  type="password"
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                  placeholder="Contraseña actual"
                />

                <input
                  type="password"
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                  placeholder="Nueva contraseña"
                />

                <input
                  type="password"
                  value={passwordConfirmar}
                  onChange={(e) => setPasswordConfirmar(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                  placeholder="Confirmar nueva contraseña"
                />

                <button
                  type="button"
                  onClick={cambiarPassword}
                  className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold"
                >
                  Guardar contraseña
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMostrarEmail(!mostrarEmail)}
              className="w-full text-left rounded-xl border border-zinc-800 p-4 hover:bg-zinc-800"
            >
              Cambiar correo electrónico
            </button>

            {mostrarEmail && (
              <div className="space-y-3">
                <input
                  type="email"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  className="w-full bg-zinc-800 rounded-xl p-3"
                  placeholder="Nuevo correo electrónico"
                />

                <button
                  type="button"
                  onClick={cambiarEmail}
                  className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold"
                >
                  Solicitar cambio de email
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
          <h2 className="text-xl font-semibold mb-4">📄 Información</h2>

          <p className="text-zinc-300">Versión {APP_VERSION}</p>
          <p className="text-zinc-400 mt-1">
            Última actualización: {LAST_UPDATE}
          </p>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
          <h2 className="text-xl font-semibold mb-4">📞 Soporte</h2>

          <div className="space-y-3">
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-zinc-800 rounded-xl p-3"
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
              className="w-full bg-zinc-800 rounded-xl p-3 min-h-32"
              placeholder="Describe tu consulta..."
            />

            <button
              type="button"
              onClick={enviarSoporte}
              className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold hover:bg-emerald-600"
            >
              📨 Enviar
            </button>
          </div>
        </section>

        <section className="bg-zinc-900 border border-red-900 rounded-2xl p-5 mt-4">
          <h2 className="text-xl font-semibold mb-4">🚪 Sesión</h2>

          <button
            type="button"
            onClick={cerrarSesion}
            className="w-full rounded-xl border border-red-800 px-5 py-3 text-red-400 hover:bg-red-950"
          >
            Cerrar sesión
          </button>
        </section>
      </div>
    </main>
  );
}

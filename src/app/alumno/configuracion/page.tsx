"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getRolCached } from "@/lib/rol-cache";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import type { FormatoFecha } from "@/lib/utils/formatearFecha";
import InformacionCard from "@/components/ui/InformacionCard";
import { useToast } from "@/components/ui/ToastProvider";

const ADMIN_EMAIL = "entrenamiento-app@hotmail.com";

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
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const { formato, cambiarFormato } = useFormatoFecha();

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarDatos() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      router.push("/login");
      return;
    }

    const user = sessionData.session.user;

    const rol = await getRolCached(user.id);

    if (rol !== "alumno") {
      router.push("/");
      return;
    }

    const { data, error } = await supabase
      .from("alumnos")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      mostrarToast(error?.message || "No se pudo cargar la configuración.", "error");
      setLoading(false);
      return;
    }

    setAlumno(data);
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
    if (guardandoPassword) return;

    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
      mostrarToast("Completá todos los campos.", "error");
      return;
    }

    if (passwordNueva !== passwordConfirmar) {
      mostrarToast("La nueva contraseña no coincide.", "error");
      return;
    }

    if (passwordNueva.length < 8) {
      mostrarToast("La nueva contraseña debe tener al menos 8 caracteres.", "error");
      return;
    }

    if (passwordActual === passwordNueva) {
      mostrarToast("La nueva contraseña debe ser diferente a la actual.", "error");
      return;
    }

    setGuardandoPassword(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        mostrarToast("No se pudo validar la sesión. Volvé a iniciar sesión.", "error");
        router.push("/login");
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordActual,
      });

      if (loginError) {
        mostrarToast("La contraseña actual no es correcta.", "error");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordNueva,
      });

      if (error) {
        mostrarToast(error.message, "error");
        return;
      }

      mostrarToast("Contraseña actualizada correctamente.", "exito");
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirmar("");
      setMostrarPassword(false);
    } finally {
      setGuardandoPassword(false);
    }
  }

  function enviarSoporte() {
    if (!motivo) {
      mostrarToast("Seleccioná un motivo.", "error");
      return;
    }

    if (!mensaje.trim()) {
      mostrarToast("Escribí tu consulta.", "error");
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
    router.replace("/login");
  }

  if (loading || !alumno) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 animate-pulse">
        <div className="max-w-4xl mx-auto">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />
          <div className="h-9 w-48 rounded bg-zinc-800 mb-6" />
          <div className="h-32 rounded-2xl bg-zinc-900 border border-zinc-800 mb-4" />
          <div className="h-32 rounded-2xl bg-zinc-900 border border-zinc-800 mb-4" />
        </div>
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
                  disabled={guardandoPassword}
                  className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {guardandoPassword ? "Guardando..." : "Guardar contraseña"}
                </button>
              </div>
            )}

          </div>
        </section>

        <InformacionCard />

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
          <h2 className="text-xl font-semibold mb-3">📅 Formato de fecha</h2>
          <p className="text-zinc-400 text-sm mb-3">
            Elegí cómo querés ver las fechas en toda la aplicación.
          </p>
          <select
            value={formato}
            onChange={(e) => cambiarFormato(e.target.value as FormatoFecha)}
            className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700 text-white"
          >
            <option value="dd/mm/aa">01/12/26</option>
            <option value="dd/mm/aaaa">01/12/2026</option>
            <option value="mm/dd/aa">12/01/26</option>
            <option value="mm/dd/aaaa">12/01/2026</option>
            <option value="aaaa-mm-dd">2026-12-01</option>
          </select>
          <p className="text-zinc-500 text-sm mt-2">
            Formato actual: <span className="text-zinc-300">{formato}</span>
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

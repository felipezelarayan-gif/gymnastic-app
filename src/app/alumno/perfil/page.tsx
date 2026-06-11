"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Alumno = {
  id: string;
  user_id: string;
  nombre: string;
  apellido?: string | null;
  email?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;
  telefono?: string | null;
  observaciones?: string | null;
  altura_cm?: number | null;
  desconoce_altura?: boolean | null;
  peso_kg?: number | null;
  desconoce_peso?: boolean | null;
  lesiones?: string | null;
  sin_lesiones?: boolean | null;
  observaciones_fisicas?: string | null;
  observaciones_generales?: string | null;
  foto_url?: string | null;
};

export default function AlumnoPerfilPage() {
  const [loading, setLoading] = useState(true);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [form, setForm] = useState<Alumno | null>(null);

  const [verDatosPersonales, setVerDatosPersonales] = useState(false);
  const [verDatosFisicos, setVerDatosFisicos] = useState(false);

  const [editandoDatosPersonales, setEditandoDatosPersonales] = useState(false);
  const [editandoDatosFisicos, setEditandoDatosFisicos] = useState(false);
  const [editandoObservaciones, setEditandoObservaciones] = useState(false);
  const [mostrarOnboarding, setMostrarOnboarding] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  async function cargarPerfil() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const user = sessionData.session.user;
    setUserId(user.id);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("rol,onboarding_completo")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      alert(profileError.message);
      setLoading(false);
      return;
    }

    if (!profile || profile.rol !== "alumno") {
      window.location.href = "/";
      return;
    }
    setMostrarOnboarding(!profile.onboarding_completo);

    const { data, error } = await supabase
      .from("alumnos")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      alert("No se encontró el perfil del alumno.");
      setLoading(false);
      return;
    }

    setAlumno(data);
    setForm(data);
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      cargarPerfil();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function actualizarCampo(
    campo: keyof Alumno,
    valor: Alumno[keyof Alumno]
  ) {
    if (!form) return;

    setForm({
      ...form,
      [campo]: valor,
    });
  }

  function cancelarEdicion() {
    setForm(alumno);
    setEditandoDatosPersonales(false);
    setEditandoDatosFisicos(false);
    setEditandoObservaciones(false);
  }

  async function completarOnboarding() {
    if (!userId) {
      setMostrarOnboarding(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completo: true })
      .eq("id", userId);

    if (error) {
      alert(error.message);
      return;
    }

    setMostrarOnboarding(false);
  }

  async function guardarDatosPersonales() {
    if (!form) return;

    if (!form.nombre?.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }

    if (!form.email?.trim()) {
      alert("El email es obligatorio.");
      return;
    }

    if (!form.fecha_nacimiento) {
      alert("La fecha de nacimiento es obligatoria.");
      return;
    }

    const cambios = {
      nombre: form.nombre,
      apellido: form.apellido || null,
      email: form.email,
      sexo: form.sexo || null,
      fecha_nacimiento: form.fecha_nacimiento,
      telefono: form.telefono || null,
      observaciones: form.observaciones || null,
    };

    const { error } = await supabase
      .from("alumnos")
      .update(cambios)
      .eq("id", form.id);

    if (error) {
      alert(error.message);
      return;
    }

    const actualizado = { ...form, ...cambios };

    setAlumno(actualizado);
    setForm(actualizado);
    setEditandoDatosPersonales(false);
  }

  async function guardarDatosFisicos() {
    if (!form) return;

    const cambios = {
      altura_cm:
        form.desconoce_altura || !form.altura_cm
          ? null
          : Number(form.altura_cm),
      desconoce_altura: !!form.desconoce_altura,

      peso_kg:
        form.desconoce_peso || !form.peso_kg ? null : Number(form.peso_kg),
      desconoce_peso: !!form.desconoce_peso,

      lesiones: form.sin_lesiones ? null : form.lesiones || null,
      sin_lesiones: !!form.sin_lesiones,

      observaciones_fisicas: form.observaciones_fisicas || null,
    };

    const { error } = await supabase
      .from("alumnos")
      .update(cambios)
      .eq("id", form.id);

    if (error) {
      alert(error.message);
      return;
    }

    const actualizado = { ...form, ...cambios };

    setAlumno(actualizado);
    setForm(actualizado);
    setEditandoDatosFisicos(false);
  }

  async function guardarObservacionesGenerales() {
    if (!form) return;

    const cambios = {
      observaciones_generales: form.observaciones_generales || null,
    };

    const { error } = await supabase
      .from("alumnos")
      .update(cambios)
      .eq("id", form.id);

    if (error) {
      alert(error.message);
      return;
    }

    const actualizado = { ...form, ...cambios };

    setAlumno(actualizado);
    setForm(actualizado);
    setEditandoObservaciones(false);
  }

  async function cambiarFoto(event: React.ChangeEvent<HTMLInputElement>) {
  if (!form) return;

  const archivo = event.target.files?.[0];
  if (!archivo) return;

  const extension = archivo.name.split(".").pop();
  const nombreArchivo = `${form.id}-${Date.now()}.${extension}`;
  const rutaArchivo = `alumnos/${nombreArchivo}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(rutaArchivo, archivo, {
      upsert: true,
    });

  if (uploadError) {
    alert(uploadError.message);
    return;
  }

  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(rutaArchivo);

  const fotoUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from("alumnos")
    .update({
      foto_url: fotoUrl,
    })
    .eq("id", form.id);

  if (updateError) {
    alert(updateError.message);
    return;
  }

  const actualizado: Alumno = {
    ...form,
    foto_url: fotoUrl,
  };

  setAlumno(actualizado);
  setForm(actualizado);

  alert("Foto actualizada correctamente.");
}

async function eliminarFoto() {
  if (!form) return;

  const confirmar = confirm("¿Querés eliminar tu foto de perfil?");
  if (!confirmar) return;

  const { error } = await supabase
    .from("alumnos")
    .update({
      foto_url: null,
    })
    .eq("id", form.id);

  if (error) {
    alert(error.message);
    return;
  }

  const actualizado: Alumno = {
    ...form,
    foto_url: null,
  };

  setAlumno(actualizado);
  setForm(actualizado);

  alert("Foto eliminada correctamente.");
}

  function iniciales() {
    const nombre = alumno?.nombre?.[0] || "";
    const apellido = alumno?.apellido?.[0] || "";
    return `${nombre}${apellido}`.toUpperCase() || "A";
  }

  if (loading || !alumno || !form) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando perfil...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        {mostrarOnboarding && (
          <section className="mb-5 rounded-2xl border border-emerald-800 bg-emerald-500/10 p-5">
            <h2 className="text-xl font-bold text-emerald-400">
              👋 Bienvenido a la aplicación
            </h2>

            <p className="mt-2 text-zinc-300">
              Te recomendamos completar tu perfil antes de comenzar a entrenar.
            </p>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  setVerDatosPersonales(true);
                  setEditandoDatosPersonales(true);
                  await completarOnboarding();
                }}
                className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-black"
              >
                Completar ahora
              </button>

              <button
                type="button"
                onClick={completarOnboarding}
                className="rounded-xl border border-zinc-700 px-4 py-2"
              >
                Más tarde
              </button>
            </div>
          </section>
        )}
        <Link href="/alumno" className="text-zinc-400 hover:text-white">
          ← Volver al panel
        </Link>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center text-2xl font-bold text-emerald-400 shrink-0 overflow-hidden">
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
              <h1 className="text-3xl font-bold">
                {alumno.nombre} {alumno.apellido || ""}
              </h1>

              <p className="text-zinc-400 mt-1">Alumno</p>

              <div className="mt-3 flex flex-col gap-2 items-start">
  <label className="cursor-pointer rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
    📷 Cambiar foto
    <input
      type="file"
      accept="image/*"
      onChange={cambiarFoto}
      className="hidden"
    />
  </label>

  {alumno.foto_url && (
    <button
      type="button"
      onClick={eliminarFoto}
      className="rounded-xl border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-950"
    >
      🗑️ Eliminar foto
    </button>
  )}
</div>


            </div>
          </div>
        </section>

        <section className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">👤 Datos personales</h2>

            {!editandoDatosPersonales && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVerDatosPersonales(!verDatosPersonales)}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
                >
                  {verDatosPersonales ? "Ver menos" : "Ver más"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditandoDatosPersonales(true)}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
                >
                  ✏️ Editar
                </button>
              </div>
            )}
          </div>

          {!editandoDatosPersonales ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-zinc-300">
              <p>
                <span className="text-zinc-500">Nombre:</span> {alumno.nombre}
              </p>

              <p>
                <span className="text-zinc-500">Email:</span>{" "}
                {alumno.email || "-"}
              </p>

              <p>
                <span className="text-zinc-500">Sexo:</span>{" "}
                {alumno.sexo || "-"}
              </p>

              <p>
                <span className="text-zinc-500">Fecha nacimiento:</span>{" "}
                {alumno.fecha_nacimiento || "-"}
              </p>

              <p>
                <span className="text-zinc-500">Teléfono:</span>{" "}
                {alumno.telefono || "-"}
              </p>

              {verDatosPersonales && (
                <p className="md:col-span-2">
                  <span className="text-zinc-500">Observaciones:</span>{" "}
                  {alumno.observaciones || "-"}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                value={form.nombre || ""}
                onChange={(e) => actualizarCampo("nombre", e.target.value)}
                className="w-full bg-zinc-800 rounded-xl p-3"
                placeholder="Nombre *"
              />

              <input
                value={form.apellido || ""}
                onChange={(e) => actualizarCampo("apellido", e.target.value)}
                className="w-full bg-zinc-800 rounded-xl p-3"
                placeholder="Apellido"
              />

              <input
                value={form.email || ""}
                onChange={(e) => actualizarCampo("email", e.target.value)}
                className="w-full bg-zinc-800 rounded-xl p-3"
                placeholder="Email *"
              />

              <select
                value={form.sexo || ""}
                onChange={(e) => actualizarCampo("sexo", e.target.value)}
                className="w-full bg-zinc-800 rounded-xl p-3"
              >
                <option value="">Sexo</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Prefiero no decirlo">Prefiero no decirlo</option>
              </select>

              <input
                type="date"
                value={form.fecha_nacimiento || ""}
                onChange={(e) =>
                  actualizarCampo("fecha_nacimiento", e.target.value)
                }
                className="w-full bg-zinc-800 rounded-xl p-3"
              />

              <input
                value={form.telefono || ""}
                onChange={(e) => actualizarCampo("telefono", e.target.value)}
                className="w-full bg-zinc-800 rounded-xl p-3"
                placeholder="Teléfono"
              />

              <textarea
                value={form.observaciones || ""}
                onChange={(e) =>
                  actualizarCampo("observaciones", e.target.value)
                }
                className="w-full bg-zinc-800 rounded-xl p-3 min-h-24"
                placeholder="Observaciones"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="flex-1 rounded-xl border border-zinc-700 py-3"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarDatosPersonales}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">💪 Datos físicos</h2>

            {!editandoDatosFisicos && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVerDatosFisicos(!verDatosFisicos)}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
                >
                  {verDatosFisicos ? "Ver menos" : "Ver más"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditandoDatosFisicos(true)}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
                >
                  ✏️ Editar
                </button>
              </div>
            )}
          </div>

          {!editandoDatosFisicos ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-zinc-300">
              <p>
                <span className="text-zinc-500">Altura:</span>{" "}
                {alumno.desconoce_altura
                  ? "No la conoce"
                  : alumno.altura_cm
                    ? `${alumno.altura_cm} cm`
                    : "-"}
              </p>

              <p>
                <span className="text-zinc-500">Peso:</span>{" "}
                {alumno.desconoce_peso
                  ? "No lo conoce"
                  : alumno.peso_kg
                    ? `${alumno.peso_kg} kg`
                    : "-"}
              </p>

              <p>
                <span className="text-zinc-500">Lesiones:</span>{" "}
                {alumno.sin_lesiones ? "Sin lesiones" : alumno.lesiones || "-"}
              </p>

              {verDatosFisicos && (
                <p className="md:col-span-2">
                  <span className="text-zinc-500">
                    Observaciones físicas:
                  </span>{" "}
                  {alumno.observaciones_fisicas || "-"}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="number"
                value={form.altura_cm || ""}
                disabled={!!form.desconoce_altura}
                onChange={(e) =>
                  actualizarCampo(
                    "altura_cm",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full bg-zinc-800 rounded-xl p-3 disabled:opacity-50"
                placeholder="Altura en cm"
              />

              <label className="flex items-center gap-2 text-zinc-300">
                <input
                  type="checkbox"
                  checked={!!form.desconoce_altura}
                  onChange={(e) =>
                    actualizarCampo("desconoce_altura", e.target.checked)
                  }
                />
                No conozco mi altura
              </label>

              <input
                type="number"
                value={form.peso_kg || ""}
                disabled={!!form.desconoce_peso}
                onChange={(e) =>
                  actualizarCampo(
                    "peso_kg",
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full bg-zinc-800 rounded-xl p-3 disabled:opacity-50"
                placeholder="Peso en kg"
              />

              <label className="flex items-center gap-2 text-zinc-300">
                <input
                  type="checkbox"
                  checked={!!form.desconoce_peso}
                  onChange={(e) =>
                    actualizarCampo("desconoce_peso", e.target.checked)
                  }
                />
                No conozco mi peso
              </label>

              <textarea
                value={form.lesiones || ""}
                disabled={!!form.sin_lesiones}
                onChange={(e) => actualizarCampo("lesiones", e.target.value)}
                className="w-full bg-zinc-800 rounded-xl p-3 min-h-24 disabled:opacity-50"
                placeholder="Lesiones"
              />

              <label className="flex items-center gap-2 text-zinc-300">
                <input
                  type="checkbox"
                  checked={!!form.sin_lesiones}
                  onChange={(e) =>
                    actualizarCampo("sin_lesiones", e.target.checked)
                  }
                />
                No tengo lesiones
              </label>

              <textarea
                value={form.observaciones_fisicas || ""}
                onChange={(e) =>
                  actualizarCampo("observaciones_fisicas", e.target.value)
                }
                className="w-full bg-zinc-800 rounded-xl p-3 min-h-24"
                placeholder="Observaciones físicas"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="flex-1 rounded-xl border border-zinc-700 py-3"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarDatosFisicos}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">
              📝 Observaciones generales
            </h2>

            {!editandoObservaciones && (
              <button
                type="button"
                onClick={() => setEditandoObservaciones(true)}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
              >
                ✏️ Editar
              </button>
            )}
          </div>

          {!editandoObservaciones ? (
            <p className="text-zinc-300 whitespace-pre-wrap">
              {alumno.observaciones_generales ||
                "Sin observaciones generales cargadas."}
            </p>
          ) : (
            <div className="space-y-3">
              <textarea
                value={form.observaciones_generales || ""}
                onChange={(e) =>
                  actualizarCampo("observaciones_generales", e.target.value)
                }
                className="w-full bg-zinc-800 rounded-xl p-3 min-h-32"
                placeholder="Comentarios generales, objetivos, restricciones o aclaraciones."
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="flex-1 rounded-xl border border-zinc-700 py-3"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardarObservacionesGenerales}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

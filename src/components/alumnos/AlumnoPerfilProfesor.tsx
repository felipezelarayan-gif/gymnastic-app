"use client";

import AlumnoRMProfesor from "@/components/alumnos/AlumnoRMProfesor";
import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Alumno = {
  id: string;
  nombre: string;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  foto_url?: string | null;
  fecha_nacimiento?: string | null;
  sexo?: string | null;
  observaciones?: string | null;
  observaciones_generales?: string | null;
  altura_cm?: number | string | null;
  peso_kg?: number | string | null;
  lesiones?: string | null;
  sin_lesiones?: boolean | null;
  observaciones_fisicas?: string | null;
};

const card = "bg-zinc-900 border border-zinc-800 rounded-2xl p-5";
const input = "w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-white";

function calcularEdad(fecha?: string | null) {
  if (!fecha) return null;
  const n = new Date(`${fecha}T00:00:00`);
  const h = new Date();
  let edad = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) edad--;
  return edad;
}

export default function AlumnoPerfilProfesor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [form, setForm] = useState<Alumno | null>(null);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    cargarAlumno();
  }, [id]);

  async function cargarAlumno() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", sessionData.session.user.id)
      .single();

    if (!profile || profile.rol !== "profe") {
      window.location.href = "/alumno";
      return;
    }

    const { data, error } = await supabase
      .from("alumnos")
      .select("id,nombre,apellido,email,telefono,foto_url,fecha_nacimiento,sexo,observaciones,observaciones_generales,altura_cm,peso_kg,lesiones,sin_lesiones,observaciones_fisicas")
      .eq("id", id)
      .single();

    if (error || !data) {
      alert(error?.message || "No se encontró el alumno.");
      setLoading(false);
      return;
    }

    setAlumno(data);
    setForm(data);
    setLoading(false);
  }

  function iniciales() {
    return `${alumno?.nombre?.[0] || ""}${alumno?.apellido?.[0] || ""}`.toUpperCase() || "A";
  }

  function nombreCompleto() {
    return `${alumno?.nombre || ""} ${alumno?.apellido || ""}`.trim();
  }

  function actualizar(campo: keyof Alumno, valor: any) {
    if (!form) return;
    setForm({ ...form, [campo]: valor });
  }

  async function guardarCambios() {
    if (!form) return;
    if (!form.nombre?.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }

    const cambios = {
      nombre: form.nombre,
      apellido: form.apellido || null,
      email: form.email || null,
      telefono: form.telefono || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      sexo: form.sexo || null,
      observaciones: form.observaciones || null,
      observaciones_generales: form.observaciones_generales || null,
      altura_cm: form.altura_cm || null,
      peso_kg: form.peso_kg || null,
      lesiones: form.sin_lesiones ? null : form.lesiones || null,
      sin_lesiones: !!form.sin_lesiones,
      observaciones_fisicas: form.observaciones_fisicas || null,
    };

    const { error } = await supabase.from("alumnos").update(cambios).eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    setEditando(false);
    await cargarAlumno();
  }

  async function borrarAlumno() {
    const confirmar = confirm(`¿Seguro que querés borrar a ${nombreCompleto()}?`);
    if (!confirmar) return;

    const { error } = await supabase.from("alumnos").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/alumnos";
  }

  if (loading) return <main className="min-h-screen bg-zinc-950 text-white p-6">Cargando perfil...</main>;
  if (!alumno || !form) return <main className="min-h-screen bg-zinc-950 text-white p-6">Alumno no encontrado.</main>;

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-5xl mx-auto">
        <a href="/alumnos" className="text-zinc-400 hover:text-white">← Atrás</a>

        <section className={`${card} mt-5`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center text-2xl font-bold text-emerald-400 overflow-hidden shrink-0">
                {alumno.foto_url ? <img src={alumno.foto_url} alt="Foto" className="h-full w-full object-cover" /> : iniciales()}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{nombreCompleto()}</h1>
                <p className="text-zinc-400 mt-1">Perfil del alumno</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:flex gap-2">
              <a href={`/alumnos/${id}/rutinas`} className="rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold hover:bg-emerald-600">Rutina</a>
              <a href={`/alumnos/${id}/historial`} className="rounded-xl border border-zinc-700 px-4 py-3 text-center text-sm hover:bg-zinc-800">Historial</a>
              <button type="button" onClick={() => setEditando(true)} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm hover:bg-zinc-800">Editar</button>
              <button type="button" onClick={borrarAlumno} className="rounded-xl border border-red-800 px-4 py-3 text-sm text-red-400 hover:bg-red-950">Borrar</button>
            </div>
          </div>
        </section>

        <section className={`${card} mt-5`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Datos del alumno</h2>
            {!editando && <button onClick={() => setEditando(true)} className="text-sm text-zinc-400 hover:text-white">✏️ Editar</button>}
          </div>

          {!editando ? (
            <div className="grid md:grid-cols-2 gap-3 text-zinc-300">
              {alumno.email && <p>Email: {alumno.email}</p>}
              {alumno.telefono && <p>Teléfono: {alumno.telefono}</p>}
              {alumno.fecha_nacimiento && <p>Fecha de nacimiento: {alumno.fecha_nacimiento}</p>}
              {alumno.fecha_nacimiento && <p>Edad: {calcularEdad(alumno.fecha_nacimiento)} años</p>}
              {alumno.sexo && <p>Sexo: {alumno.sexo}</p>}
              {alumno.altura_cm && <p>Altura: {alumno.altura_cm} cm</p>}
              {alumno.peso_kg && <p>Peso: {alumno.peso_kg} kg</p>}
              <p>Lesiones: {alumno.sin_lesiones ? "Sin lesiones registradas" : alumno.lesiones || "Sin lesiones registradas"}</p>
              {(alumno.observaciones_generales || alumno.observaciones) && <p className="md:col-span-2 whitespace-pre-wrap">Observaciones: {alumno.observaciones_generales || alumno.observaciones}</p>}
              {alumno.observaciones_fisicas && <p className="md:col-span-2 whitespace-pre-wrap">Observaciones físicas: {alumno.observaciones_fisicas}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <input className={input} value={form.nombre || ""} onChange={(e) => actualizar("nombre", e.target.value)} placeholder="Nombre" />
              <input className={input} value={form.apellido || ""} onChange={(e) => actualizar("apellido", e.target.value)} placeholder="Apellido" />
              <input className={input} value={form.email || ""} onChange={(e) => actualizar("email", e.target.value)} placeholder="Email" />
              <input className={input} value={form.telefono || ""} onChange={(e) => actualizar("telefono", e.target.value)} placeholder="Teléfono" />
              <input type="date" className={input} value={form.fecha_nacimiento || ""} onChange={(e) => actualizar("fecha_nacimiento", e.target.value)} />
              <select className={input} value={form.sexo || ""} onChange={(e) => actualizar("sexo", e.target.value)}>
                <option value="">Sexo</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Prefiero no decirlo">Prefiero no decirlo</option>
              </select>
              <input className={input} value={form.altura_cm || ""} onChange={(e) => actualizar("altura_cm", e.target.value)} placeholder="Altura en cm" />
              <input className={input} value={form.peso_kg || ""} onChange={(e) => actualizar("peso_kg", e.target.value)} placeholder="Peso en kg" />
              <textarea className={`${input} min-h-24`} disabled={!!form.sin_lesiones} value={form.lesiones || ""} onChange={(e) => actualizar("lesiones", e.target.value)} placeholder="Lesiones" />
              <label className="flex items-center gap-2 text-zinc-300"><input type="checkbox" checked={!!form.sin_lesiones} onChange={(e) => actualizar("sin_lesiones", e.target.checked)} /> Sin lesiones</label>
              <textarea className={`${input} min-h-24`} value={form.observaciones_generales || form.observaciones || ""} onChange={(e) => actualizar("observaciones_generales", e.target.value)} placeholder="Observaciones generales" />
              <textarea className={`${input} min-h-24`} value={form.observaciones_fisicas || ""} onChange={(e) => actualizar("observaciones_fisicas", e.target.value)} placeholder="Observaciones físicas" />

                            <div className="flex gap-3">
                <button type="button" onClick={() => { setForm(alumno); setEditando(false); }} className="flex-1 rounded-xl border border-zinc-700 py-3">Cancelar</button>
                <button type="button" onClick={guardarCambios} className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold">Guardar</button>
              </div>
            </div>
          )}
        </section>

        <AlumnoRMProfesor alumnoId={id} />
      </div>
    </main>
  );
}
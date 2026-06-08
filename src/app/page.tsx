"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  nombre: string;
  rol: string;
  foto_url?: string | null;
};

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarPerfil() {
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("SESSION", sessionData);

      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const user = sessionData.session.user;

      const { data, error } = await supabase
  .from("profiles")
  .select("nombre, rol, foto_url")
  .eq("id", user.id)
  .maybeSingle();

if (error) {
  alert(error.message);
  setLoading(false);
  return;
}

if (!data) {
  alert("No se encontró tu perfil.");
  setLoading(false);
  return;
}

      if (data?.rol === "alumno") {
        window.location.href = "/alumno";
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    cargarPerfil();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-8">
        Cargando...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Gymnastic App</h1>

          <p className="mt-3 text-zinc-400">No estás logueado.</p>

          <a href="/login" className="mt-4 inline-block underline">
            Ir al login
          </a>
        </div>
      </main>
    );
  }

  if (profile.rol === "alumno") {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-8">
        <h1 className="text-3xl font-bold">Hola, {profile.nombre}</h1>

        <p className="mt-3 text-zinc-400">Estás entrando como alumno.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
  <img
    src={
      profile.foto_url ||
      "https://placehold.co/120x120/png?text=👤"
    }
    alt="Foto de perfil"
    className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"
  />

  <div>
    <h1 className="text-3xl font-bold">
      Panel del profe
    </h1>

    <p className="text-zinc-400 mt-1">
      Hola, {profile.nombre}
    </p>
  </div>
</header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/alumnos"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
          >
            <h2 className="text-xl font-semibold">
  👥 Alumnos
</h2>

            <p className="text-zinc-400 mt-2">
  Ver, crear y administrar alumnos.
</p>
          </a>

          <a
            href="/rutinas"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
          >
            <h2 className="text-xl font-semibold">
  📋 Rutinas
</h2>

            <p className="text-zinc-400 mt-2">
  Crear rutinas y asignarlas a alumnos.
</p>
          </a>

          <a
            href="/ejercicios"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
          >
            <h2 className="text-xl font-semibold">
  💪 Ejercicios
</h2>

            <p className="text-zinc-400 mt-2">
  Ver y editar ejercicios con videos de YouTube.
</p>
          </a>

          <a
            href="/historial"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
          >
            <h2 className="text-xl font-semibold">
  📈 Historial
</h2>

            <p className="text-zinc-400 mt-2">
  Revisar entrenamientos completados y progreso.
</p>
          </a>
          
<a
  href="/evaluaciones"
  className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
>
  <h2 className="text-xl font-semibold">
    📏 Evaluaciones
  </h2>

  <p className="text-zinc-400 mt-2">
    Próximamente: FMS, RM, tests físicos y evaluaciones.
  </p>
</a>

          <a
            href="/configuracion"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition md:col-span-2"
          >
            <h2 className="text-xl font-semibold">
  ⚙️ Configuración
</h2>

            <p className="text-zinc-400 mt-2">
  Gestionar profesores, permisos y ajustes generales.
</p>
          </a>
        </section>
      </div>
    </main>
  );
}
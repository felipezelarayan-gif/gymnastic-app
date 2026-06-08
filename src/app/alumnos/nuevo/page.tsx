"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NuevoAlumnoPage() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function crearAlumno() {
    if (!nombre.trim()) {
      alert("Ingresá el nombre del alumno.");
      return;
    }

    if (!email.trim()) {
      alert("Ingresá el email del alumno.");
      return;
    }

    if (!password.trim() || password.length < 6) {
      alert("Ingresá una contraseña temporal de al menos 6 caracteres.");
      return;
    }

    setGuardando(true);

    const { data, error } = await supabase.functions.invoke("crear-usuario", {
      body: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim(),
        password,
        rol: "alumno",
      },
    });

    setGuardando(false);

    if (error) {
      alert(error.message);
      return;
    }

    if (data?.error) {
      alert(data.error);
      return;
    }

    alert("Alumno creado correctamente.");
    window.location.href = "/alumnos";
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-3xl mx-auto">
        <a href="/alumnos" className="text-zinc-400 hover:text-white">
          ← Volver a alumnos
        </a>

        <header className="mt-6 mb-6">
          <h1 className="text-3xl font-bold">Agregar alumno</h1>
          <p className="text-zinc-400 mt-2">
            Crea el alumno y su acceso a la app.
          </p>
        </header>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="space-y-4">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
              placeholder="Nombre *"
            />

            <input
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
              placeholder="Apellido"
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
              placeholder="Email *"
            />

            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
              placeholder="Teléfono"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700"
              placeholder="Contraseña temporal *"
            />

            <div className="flex gap-3 pt-3">
              <a
                href="/alumnos"
                className="flex-1 text-center rounded-xl border border-zinc-700 py-3 text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </a>

              <button
                type="button"
                onClick={crearAlumno}
                disabled={guardando}
                className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold hover:bg-emerald-600 disabled:opacity-50"
              >
                {guardando ? "Creando..." : "Crear alumno"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import CrearEjercicioModal from "@/components/ejercicios/CrearEjercicioModal";
import EditarEjercicioModal from "@/components/ejercicios/EditarEjercicioModal";
import BackButton from "@/components/BackButton";

type Ejercicio = {
  id: string;
  nombre: string;
  grupo_muscular?: string | null;
  patron_movimiento?: string;
  youtube_url?: string | null;
  peso_corporal?: boolean | null;
};

type Profile = {
  id: string;
  rol: string;
  es_admin?: boolean;
};

export default function EjerciciosPage() {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarEditarModal, setMostrarEditarModal] = useState(false);
  const [ejercicioEditando, setEjercicioEditando] = useState<Ejercicio | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  async function cargarEjercicios() {
    const { data, error } = await supabase
      .from("ejercicios")
      .select("id,nombre,grupo_muscular,patron_movimiento,youtube_url,peso_corporal")
      .order("nombre");

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setEjercicios(data || []);
    setLoading(false);
  }

  function handleEjercicioCreado(ejercicio: { id: string; nombre: string; grupo_muscular?: string | null; youtube_url?: string | null; peso_corporal?: boolean | null }) {
    setEjercicios((prev) => [
      ...prev,
      {
        id: ejercicio.id,
        nombre: ejercicio.nombre,
        grupo_muscular: ejercicio.grupo_muscular || null,
        patron_movimiento: ejercicio.grupo_muscular || undefined,
        youtube_url: ejercicio.youtube_url || undefined,
        peso_corporal: ejercicio.peso_corporal || false,
      },
    ]);
  }

  function handleEjercicioActualizado(ejercicio: Ejercicio) {
    setEjercicios((prev) =>
      prev.map((e) => (e.id === ejercicio.id ? ejercicio : e))
    );
  }

  function abrirEditar(ejercicio: Ejercicio) {
    setEjercicioEditando(ejercicio);
    setMostrarEditarModal(true);
  }

  async function verificarDependencias(ejercicioId: string): Promise<{ tieneDependencias: boolean; mensaje: string }> {
    // Verificar si está en rutinas
    const { count: rutinasCount } = await supabase
      .from("rutina_ejercicios")
      .select("*", { count: "exact", head: true })
      .eq("ejercicio_id", ejercicioId);

    // Verificar si está en evaluaciones RM
    const { count: evaluacionesRMCount } = await supabase
      .from("evaluaciones_rm_resultados")
      .select("*", { count: "exact", head: true })
      .eq("ejercicio_id", ejercicioId);

    // Verificar si está en evaluaciones FMS (no aplica directamente, pero por si acaso)
    const { count: evaluacionesFMSCount } = await supabase
      .from("evaluaciones_fms_tests")
      .select("*", { count: "exact", head: true })
      .eq("test_nombre", (ejercicios.find(e => e.id === ejercicioId)?.nombre || ""));

    const totalDependencias = (rutinasCount || 0) + (evaluacionesRMCount || 0) + (evaluacionesFMSCount || 0);

    if (totalDependencias === 0) {
      return { tieneDependencias: false, mensaje: "" };
    }

    const mensaje = `Este ejercicio está siendo usado en:\n`;
    const partes: string[] = [];
    if (rutinasCount && rutinasCount > 0) partes.push(`• ${rutinasCount} rutina(s)`);
    if (evaluacionesRMCount && evaluacionesRMCount > 0) partes.push(`• ${evaluacionesRMCount} evaluación(es) RM`);
    if (evaluacionesFMSCount && evaluacionesFMSCount > 0) partes.push(`• ${evaluacionesFMSCount} evaluación(es) FMS`);

    return {
      tieneDependencias: true,
      mensaje: mensaje + "\n" + partes.join("\n") + "\n\nSi lo borrás, se perderá esta información."
    };
  }

  async function borrarEjercicio(id: string) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("es_admin")
      .eq("id", (await supabase.auth.getSession()).data.session?.user.id)
      .single();

    const esAdmin = profileData?.es_admin || false;

    if (userRole !== "profesor" && userRole !== "profe" && userRole !== "admin" && !esAdmin) {
      alert("No tenés permisos para borrar ejercicios.");
      return;
    }

    const { tieneDependencias, mensaje } = await verificarDependencias(id);

    if (tieneDependencias) {
      const confirmar = confirm(mensaje + "\n\n¿Estás seguro que querés borrarlo de todas formas?");
      if (!confirmar) return;
    } else {
      const confirmar = confirm("¿Seguro que querés borrar este ejercicio?");
      if (!confirmar) return;
    }

    const { error } = await supabase.from("ejercicios").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setEjercicios((prev) => prev.filter((e) => e.id !== id));
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user.id) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("rol, es_admin")
      .eq("id", sessionData.session.user.id)
      .single();

    if (profile) {
      setUserRole(profile.rol);
    }

    await cargarEjercicios();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        Cargando ejercicios...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <BackButton fallback="/" />
          <h1 className="text-3xl font-bold mt-4">Ejercicios</h1>
          <p className="text-zinc-400 mt-1">
            Banco de ejercicios y videos explicativos.
          </p>
        </div>

        <div className="grid gap-3">
          {ejercicios.map((ejercicio) => (
            <div
              key={ejercicio.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold">
                      {ejercicio.nombre}
                    </h2>

                    {ejercicio.peso_corporal && (
                      <span className="inline-block px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-700 text-emerald-300 text-xs font-medium">
                        Peso corporal
                      </span>
                    )}
                  </div>

                  {ejercicio.grupo_muscular && (
                    <p className="text-zinc-400 text-sm mt-1">
                      {ejercicio.grupo_muscular}
                    </p>
                  )}

                  {ejercicio.youtube_url && (
                    <a
                      href={ejercicio.youtube_url}
                      target="_blank"
                      className="text-emerald-400 text-sm mt-2 inline-block"
                    >
                      ▶ Ver video
                    </a>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEditar(ejercicio)}
                    className="rounded-lg border border-zinc-700 px-3 py-2 hover:bg-zinc-800"
                    title="Editar"
                  >
                    ✏️
                  </button>

                  {(userRole === "profesor" || userRole === "profe" || userRole === "admin") && (
                    <button
                      type="button"
                      onClick={() => borrarEjercicio(ejercicio.id)}
                      className="rounded-lg border border-red-800 px-3 py-2 hover:bg-red-950"
                      title="Borrar"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMostrarModal(true)}
          className="fixed right-6 bottom-24 md:bottom-6 w-14 h-14 rounded-full bg-emerald-500 text-white text-3xl font-bold shadow-lg hover:bg-emerald-600"
        >
          +
        </button>

        <CrearEjercicioModal
          abierto={mostrarModal}
          onCerrar={() => setMostrarModal(false)}
          onCreado={handleEjercicioCreado}
        />

        <EditarEjercicioModal
          abierto={mostrarEditarModal}
          onCerrar={() => setMostrarEditarModal(false)}
          onActualizado={handleEjercicioActualizado}
          ejercicio={ejercicioEditando}
        />
      </div>
    </main>
  );
}
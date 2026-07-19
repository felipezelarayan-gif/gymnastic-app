"use client";

import AlumnoRMProfesor from "@/components/alumnos/AlumnoRMProfesor";
import { use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getRolCached } from "@/lib/rol-cache";
import BackButton from "@/components/BackButton";
import { useFormatoFecha } from "@/lib/utils/useFormatoFecha";
import { obtenerMetricasResumen } from "@/lib/alumno/obtenerMetricasResumen";
import { useToast } from "@/components/ui/ToastProvider";
import ModalAccionesAlumno from "@/components/shared/ModalAccionesAlumno";

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
  activo?: boolean | null;
};

type ProfeDisponible = {
  id: string;
  nombre: string | null;
  email: string | null;
  tipo: string;
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
  const { formatearFechaCorta } = useFormatoFecha();
  const [loading, setLoading] = useState(true);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [editando, setEditando] = useState(false);
  const { mostrarToast } = useToast();
  const [rutinasCompletadas, setRutinasCompletadas] = useState(0);
  const [evaluacionesCompletadas, setEvaluacionesCompletadas] = useState(0);
  const [ejerciciosCompletados, setEjerciciosCompletados] = useState(0);

  // Modal de editar
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoApellido, setNuevoApellido] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");
  const [nuevoFechaNac, setNuevoFechaNac] = useState("");
  const [nuevoSexo, setNuevoSexo] = useState("");
  const [nuevoAltura, setNuevoAltura] = useState("");
  const [nuevoPeso, setNuevoPeso] = useState("");
  const [nuevoLesiones, setNuevoLesiones] = useState("");
  const [nuevoSinLesiones, setNuevoSinLesiones] = useState(false);
  const [nuevoObsGenerales, setNuevoObsGenerales] = useState("");
  const [nuevoObsFisicas, setNuevoObsFisicas] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Estados para acciones
  const [mostrarAcciones, setMostrarAcciones] = useState(false);
  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [mostrarConfirmarBorrar, setMostrarConfirmarBorrar] = useState(false);
  const [profesoresDisponibles, setProfesoresDisponibles] = useState<ProfeDisponible[]>([]);
  const [profeSeleccionado, setProfeSeleccionado] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  useEffect(() => {
    cargarAlumno();
  }, [id]);

  function abrirModalEditar() {
    if (!alumno) return;
    setNuevoNombre(alumno.nombre || "");
    setNuevoApellido(alumno.apellido || "");
    setNuevoEmail(alumno.email || "");
    setNuevoTelefono(alumno.telefono || "");
    setNuevoFechaNac(alumno.fecha_nacimiento || "");
    setNuevoSexo(alumno.sexo || "");
    setNuevoAltura(String(alumno.altura_cm ?? ""));
    setNuevoPeso(String(alumno.peso_kg ?? ""));
    setNuevoLesiones(alumno.lesiones || "");
    setNuevoSinLesiones(!!alumno.sin_lesiones);
    setNuevoObsGenerales(alumno.observaciones_generales || alumno.observaciones || "");
    setNuevoObsFisicas(alumno.observaciones_fisicas || "");
    setEditando(true);
  }

  async function guardarCambios() {
    if (!nuevoNombre.trim()) {
      mostrarToast("El nombre es obligatorio.", "info");
      return;
    }

    setGuardando(true);

    const cambios = {
      nombre: nuevoNombre.trim(),
      apellido: nuevoApellido.trim() || null,
      email: nuevoEmail.trim() || null,
      telefono: nuevoTelefono.trim() || null,
      fecha_nacimiento: nuevoFechaNac || null,
      sexo: nuevoSexo || null,
      observaciones: nuevoObsGenerales || null,
      observaciones_generales: null,
      altura_cm: nuevoAltura || null,
      peso_kg: nuevoPeso || null,
      lesiones: nuevoSinLesiones ? null : nuevoLesiones || null,
      sin_lesiones: !!nuevoSinLesiones,
      observaciones_fisicas: nuevoObsFisicas || null,
    };

    const { error } = await supabase.from("alumnos").update(cambios).eq("id", id);
    setGuardando(false);

    if (error) {
      mostrarToast(error.message, "error");
      return;
    }

    mostrarToast("Datos actualizados correctamente.", "exito");
    setEditando(false);
    await cargarAlumno();
  }

  async function cargarAlumno() {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const rol = await getRolCached(sessionData.session.user.id);

    if (rol !== "profe") {
      window.location.href = "/alumno";
      return;
    }

    const { data, error } = await supabase
      .from("alumnos")
      .select("id,nombre,apellido,email,telefono,foto_url,fecha_nacimiento,sexo,observaciones,observaciones_generales,altura_cm,peso_kg,lesiones,sin_lesiones,observaciones_fisicas,activo")
      .eq("id", id)
      .single();

    if (error || !data) {
      mostrarToast(error?.message || "No se encontró el alumno.", "error");
      setLoading(false);
      return;
    }

    setAlumno(data);

    obtenerMetricasResumen(supabase, id).then((metricas) => {
      setRutinasCompletadas(metricas.rutinasCompletadas);
      setEvaluacionesCompletadas(metricas.evaluacionesCompletadas);
      setEjerciciosCompletados(metricas.ejerciciosCompletados);
    });

    setLoading(false);
  }

  function iniciales() {
    return `${alumno?.nombre?.[0] || ""}${alumno?.apellido?.[0] || ""}`.toUpperCase() || "A";
  }

  function nombreCompleto() {
    return `${alumno?.nombre || ""} ${alumno?.apellido || ""}`.trim();
  }

  // --- Acciones ---

  async function abrirModalAcciones() {
    setMostrarAcciones(true);
    setErrorAccion(null);

    // Cargar profesores disponibles para transferir
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;

    const userId = sessionData.session.user.id;

    const { data: profeActual } = await supabase
      .from("profiles")
      .select("id, creado_por")
      .eq("id", userId)
      .maybeSingle();

    if (!profeActual) return;

    const disponibles: ProfeDisponible[] = [];

    // 1. Soporte (rol: admin)
    const { data: soportes } = await supabase
      .from("profiles")
      .select("id, nombre, email")
      .eq("rol", "admin");

    if (soportes) {
      soportes.forEach((s) => {
        disponibles.push({ id: s.id, nombre: s.nombre, email: s.email, tipo: "🛠️ Soporte" });
      });
    }

    // 2. El admin que creó al profesor
    if (profeActual.creado_por) {
      const { data: admin } = await supabase
        .from("profiles")
        .select("id, nombre, email")
        .eq("id", profeActual.creado_por)
        .maybeSingle();

      if (admin) {
        disponibles.push({ id: admin.id, nombre: admin.nombre, email: admin.email, tipo: "👑 Mi admin" });
      }

      // 3. Otros profes con el mismo admin
      const { data: otrosProfes } = await supabase
        .from("profiles")
        .select("id, nombre, email")
        .eq("rol", "profe")
        .eq("creado_por", profeActual.creado_por)
        .neq("id", userId);

      if (otrosProfes) {
        otrosProfes.forEach((p) => {
          disponibles.push({ id: p.id, nombre: p.nombre, email: p.email, tipo: "👨‍🏫 Profesor" });
        });
      }
    }

    setProfesoresDisponibles(disponibles);
  }

  async function transferirAlumno() {
    if (!profeSeleccionado) {
      mostrarToast("Seleccioná un profesor para transferir.", "error");
      return;
    }

    setProcesando(true);
    setErrorAccion(null);

    const { error } = await supabase
      .from("alumnos")
      .update({ profesor_id: profeSeleccionado })
      .eq("id", id);

    setProcesando(false);

    if (error) {
      setErrorAccion(error.message);
      return;
    }

    mostrarToast("Alumno transferido correctamente.", "exito");
    setMostrarTransferir(false);
    setMostrarAcciones(false);
    await cargarAlumno();
  }

  async function pausarAlumno() {
    setProcesando(true);
    setErrorAccion(null);

    const nuevoEstado = !alumno?.activo;

    const { error } = await supabase
      .from("alumnos")
      .update({ activo: nuevoEstado })
      .eq("id", id);

    setProcesando(false);

    if (error) {
      setErrorAccion(error.message);
      return;
    }

    mostrarToast(
      nuevoEstado ? "Alumno reanudado correctamente." : "Alumno pausado correctamente.",
      "exito"
    );
    setMostrarAcciones(false);
    await cargarAlumno();
  }

  async function borrarAlumno() {
    setProcesando(true);
    setErrorAccion(null);

    try {
      const res = await fetch("/api/borrar-alumno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alumnoId: id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al borrar el alumno.");
      }

      window.location.href = "/alumnos";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al borrar el alumno.";
      setErrorAccion(msg);
      setProcesando(false);
    }
  }

  const acciones = [
    {
      id: "transferir",
      icono: "🔄",
      titulo: "Transferir",
      descripcion: "Cambiar el alumno a otro profesor",
      color: "blue" as const,
      onClick: () => { setMostrarTransferir(true); setErrorAccion(null); },
    },
    {
      id: "pausar",
      icono: alumno?.activo === false ? "▶️" : "⏸️",
      titulo: alumno?.activo === false ? "Reanudar" : "Pausar",
      descripcion: alumno?.activo === false
        ? "El alumno volverá a tener acceso a la app"
        : "El alumno perderá el acceso a la app",
      color: "yellow" as const,
      onClick: pausarAlumno,
      disabled: procesando,
    },
    {
      id: "borrar",
      icono: "🗑️",
      titulo: "Borrar",
      descripcion: "Eliminar permanentemente al alumno y todos sus datos",
      color: "red" as const,
      onClick: () => { setMostrarConfirmarBorrar(true); setErrorAccion(null); },
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-5xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-zinc-800 shrink-0" />
                <div className="space-y-2">
                  <div className="h-7 w-48 rounded bg-zinc-800" />
                  <div className="h-4 w-28 rounded bg-zinc-800" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:flex gap-2">
                <div className="h-11 w-24 rounded-xl bg-zinc-800" />
                <div className="h-11 w-28 rounded-xl bg-zinc-800" />
                <div className="h-11 w-24 rounded-xl bg-zinc-800" />
                <div className="h-11 w-24 rounded-xl bg-zinc-800" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 mt-5">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-36 rounded bg-zinc-800" />
              <div className="h-4 w-16 rounded bg-zinc-800" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-64 rounded bg-zinc-800" />
              <div className="h-4 w-48 rounded bg-zinc-800" />
              <div className="h-4 w-56 rounded bg-zinc-800" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="h-20 rounded-2xl bg-zinc-800" />
            <div className="h-20 rounded-2xl bg-zinc-800" />
            <div className="h-20 rounded-2xl bg-zinc-800" />
          </div>
        </div>
      </main>
    );
  }
  if (!alumno) return <main className="min-h-screen bg-zinc-950 text-white p-6">Alumno no encontrado.</main>;

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-5xl mx-auto">
        <BackButton fallback="/alumnos" />

        {/* Card 1: Foto + Nombre + Botones */}
        <section className={`${card} mt-5`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-700 flex items-center justify-center text-2xl font-bold text-emerald-400 overflow-hidden shrink-0">
                {alumno.foto_url ? <img src={alumno.foto_url} alt="Foto" className="h-full w-full object-cover" /> : iniciales()}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{nombreCompleto()}</h1>
                <p className="text-zinc-400 mt-1">Perfil del alumno</p>
                {alumno.activo === false && (
                  <span className="inline-block mt-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                    🚫 Pausado
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href={`/alumnos/${id}/rutinas`} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold hover:bg-emerald-600">Rutina</a>
              <a href={`/alumnos/${id}/historial`} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm hover:bg-zinc-800">Historial</a>
              <button
                type="button"
                onClick={abrirModalAcciones}
                className="rounded-xl border border-zinc-700 px-4 py-3 text-sm hover:bg-zinc-800 text-lg leading-none"
                title="Acciones"
              >
                ⋮
              </button>
            </div>
          </div>
        </section>

        {/* Card 2: Datos del alumno */}
        <section className={`${card} mt-5`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Datos del alumno</h2>
            <button onClick={abrirModalEditar} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">✏️ Editar</button>
          </div>

          <div className="grid md:grid-cols-2 gap-3 text-zinc-300">
            {alumno.email && <p>Email: {alumno.email}</p>}
            {alumno.telefono && <p>Teléfono: {alumno.telefono}</p>}
            {alumno.fecha_nacimiento && <p>Fecha de nacimiento: {formatearFechaCorta(alumno.fecha_nacimiento)}</p>}
            {alumno.fecha_nacimiento && <p>Edad: {calcularEdad(alumno.fecha_nacimiento)} años</p>}
            {alumno.sexo && <p>Sexo: {alumno.sexo}</p>}
            {alumno.altura_cm && <p>Altura: {alumno.altura_cm} cm</p>}
            {alumno.peso_kg && <p>Peso: {alumno.peso_kg} kg</p>}
            <p>Lesiones: {alumno.sin_lesiones ? "Sin lesiones registradas" : alumno.lesiones || "Sin lesiones registradas"}</p>
            {(alumno.observaciones_generales || alumno.observaciones) && <p className="md:col-span-2 whitespace-pre-wrap">Observaciones: {alumno.observaciones_generales || alumno.observaciones}</p>}
            {alumno.observaciones_fisicas && <p className="md:col-span-2 whitespace-pre-wrap">Observaciones físicas: {alumno.observaciones_fisicas}</p>}
          </div>
        </section>

        {/* Card 3: Estadísticas */}
        <section className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-400">Rutinas completadas</p>
            <p className="text-2xl font-bold mt-1">{rutinasCompletadas}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-400">Evaluaciones</p>
            <p className="text-2xl font-bold mt-1">{evaluacionesCompletadas}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-400">Ejercicios</p>
            <p className="text-2xl font-bold mt-1">{ejerciciosCompletados}</p>
          </div>
        </section>

        {/* Card 4: Records máximos */}
        <AlumnoRMProfesor alumnoId={id} />

        {/* Modal de acciones reutilizable */}
        <ModalAccionesAlumno
          abierto={mostrarAcciones}
          onCerrar={() => { setMostrarAcciones(false); setErrorAccion(null); }}
          acciones={acciones}
          error={errorAccion}
        />

        {/* Modal: Transferir */}
        {mostrarTransferir && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold">🔄 Transferir alumno</h3>
                <button
                  type="button"
                  onClick={() => { setMostrarTransferir(false); setErrorAccion(null); }}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <p className="text-zinc-400 text-sm mb-4">
                Seleccioná a quién querés transferir a <strong>{nombreCompleto()}</strong>:
              </p>

              {errorAccion && (
                <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {profesoresDisponibles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfeSeleccionado(p.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      profeSeleccionado === p.id
                        ? "border-emerald-600 bg-emerald-500/10"
                        : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.nombre || "Sin nombre"}</p>
                      <p className="text-xs text-zinc-500 truncate">{p.tipo} {p.email ? `· ${p.email}` : ""}</p>
                    </div>
                    {profeSeleccionado === p.id && (
                      <span className="text-emerald-400 text-lg">✓</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMostrarTransferir(false); setErrorAccion(null); }}
                  className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={transferirAlumno}
                  disabled={procesando || !profeSeleccionado}
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {procesando ? "Transfiriendo..." : "Transferir"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirmar borrar */}
        {mostrarConfirmarBorrar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-red-400 mb-3">🗑️ Borrar alumno</h3>
              <p className="text-zinc-300 text-sm leading-relaxed mb-2">
                Esta acción eliminará <strong>permanentemente</strong> a <strong>{nombreCompleto()}</strong> y todos sus datos relacionados:
              </p>
              <ul className="text-zinc-400 text-sm list-disc list-inside mb-4 space-y-1">
                <li>Rutinas asignadas</li>
                <li>Entrenamientos registrados</li>
                <li>Evaluaciones RM y resultados</li>
                <li>Evaluaciones FMS y tests</li>
                <li>RM actuales e historial</li>
              </ul>
              <p className="text-red-400 text-sm font-semibold mb-5">Esta acción no se puede deshacer.</p>
              {errorAccion && (
                <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMostrarConfirmarBorrar(false); setErrorAccion(null); }}
                  disabled={procesando}
                  className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={borrarAlumno}
                  disabled={procesando}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {procesando ? "Borrando..." : "Sí, borrar alumno"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Editar alumno */}
        {editando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-xl font-bold">✏️ Editar alumno</h3>
                <button type="button" onClick={() => setEditando(false)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 space-y-3">
                <input className={input} value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre *" />
                <input className={input} value={nuevoApellido} onChange={(e) => setNuevoApellido(e.target.value)} placeholder="Apellido" />
                <input className={input} value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} placeholder="Email" />
                <input className={input} value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} placeholder="Teléfono" />
                <input type="date" className={input} value={nuevoFechaNac} onChange={(e) => setNuevoFechaNac(e.target.value)} />
                <select className={input} value={nuevoSexo} onChange={(e) => setNuevoSexo(e.target.value)}>
                  <option value="">Sexo</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input className={input} value={nuevoAltura} onChange={(e) => setNuevoAltura(e.target.value)} placeholder="Altura en cm" />
                  <input className={input} value={nuevoPeso} onChange={(e) => setNuevoPeso(e.target.value)} placeholder="Peso en kg" />
                </div>
                <textarea className={`${input} min-h-24`} disabled={nuevoSinLesiones} value={nuevoLesiones} onChange={(e) => setNuevoLesiones(e.target.value)} placeholder="Lesiones" />
                <label className="flex items-center gap-2 text-zinc-300 text-sm">
                  <input type="checkbox" checked={nuevoSinLesiones} onChange={(e) => setNuevoSinLesiones(e.target.checked)} />
                  Sin lesiones
                </label>
                <textarea className={`${input} min-h-24`} value={nuevoObsGenerales} onChange={(e) => setNuevoObsGenerales(e.target.value)} placeholder="Observaciones" />
                <textarea className={`${input} min-h-24`} value={nuevoObsFisicas} onChange={(e) => setNuevoObsFisicas(e.target.value)} placeholder="Observaciones físicas" />
              </div>

              <div className="flex gap-3 mt-4 shrink-0 border-t border-zinc-800 pt-4">
                <button type="button" onClick={() => setEditando(false)} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800">Cancelar</button>
                <button type="button" onClick={guardarCambios} disabled={guardando} className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
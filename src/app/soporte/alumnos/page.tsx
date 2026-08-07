"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";
import { obtenerEstadoAlumnoProfesor } from "@/lib/alumno/obtenerEstadoAlumnoProfesor";
import ModalAccionesAdmin from "@/components/shared/ModalAccionesAdmin";

type AlumnoConProfesor = {
  id: string;
  user_id: string | null;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  activo: boolean;
  pausado: boolean;
  profesorId: string | null;
  profesorNombre: string | null;
  profesorEmail: string | null;
};

type Profesor = {
  id: string;
  nombre: string | null;
  email: string | null;
};

export default function SoporteAlumnosPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const { t } = useIdioma();
  const [loading, setLoading] = useState(true);
  const [alumnos, setAlumnos] = useState<AlumnoConProfesor[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroProfesor, setFiltroProfesor] = useState("todos");
  const [filtrosAbierto, setFiltrosAbierto] = useState(false);
  const [currentUserRol, setCurrentUserRol] = useState<string | null>(null);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any>(null);
  const [mostrarAcciones, setMostrarAcciones] = useState(false);
  const [mostrarConfirmarPausar, setMostrarConfirmarPausar] = useState(false);
  const [mostrarConfirmarBorrar, setMostrarConfirmarBorrar] = useState(false);
  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [profesoresDisponibles, setProfesoresDisponibles] = useState<Profesor[]>([]);
  const [profeSeleccionado, setProfeSeleccionado] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  useEffect(() => { cargarAlumnos(); }, []);

  async function cargarAlumnos() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { router.push("/login"); return; }

    const { data: perfilActual } = await supabase.from("profiles").select("rol").eq("id", sessionData.session.user.id).maybeSingle();
    setCurrentUserRol(perfilActual?.rol || null);

    if (perfilActual?.rol !== "admin") {
      router.push("/soporte");
      return;
    }

    const { data: profesData } = await supabase.from("profiles").select("id, nombre, email").eq("rol", "profe").order("nombre", { ascending: true });
    setProfesores(profesData || []);
    const profesMap = new Map((profesData || []).map((p) => [p.id, p]));

    const { data: alumnosData } = await supabase.from("alumnos").select("id, user_id, nombre, apellido, email, profesor_id, activo").order("nombre", { ascending: true });
    if (!alumnosData) { setLoading(false); return; }

    const fechaLimite = new Date(); fechaLimite.setDate(fechaLimite.getDate() - 30);
    const { data: asignacionesRecientes } = await supabase.from("rutina_asignaciones").select("alumno_id").or(`fecha_asignacion.gte.${fechaLimite.toISOString()},fecha_completada.gte.${fechaLimite.toISOString()},created_at.gte.${fechaLimite.toISOString()}`);
    const alumnosActivosSet = new Set((asignacionesRecientes || []).map((a: any) => a.alumno_id));

    setAlumnos(alumnosData.map((a) => {
      const profe = a.profesor_id ? profesMap.get(a.profesor_id) : null;
      const estado = obtenerEstadoAlumnoProfesor(a.activo, alumnosActivosSet.has(a.id));
      return { id: a.id, user_id: a.user_id, nombre: a.nombre, apellido: a.apellido, email: a.email, activo: estado.estado === "activo", pausado: estado.estado === "pausado", profesorId: a.profesor_id, profesorNombre: profe?.nombre || null, profesorEmail: profe?.email || null };
    }));
    setLoading(false);
  }

  function abrirAccionesAlumno(alumno: AlumnoConProfesor) { setAlumnoSeleccionado(alumno); setErrorAccion(null); setMostrarAcciones(true); }

  async function abrirTransferir() {
    setErrorAccion(null);
    // Cargar todos los profesores y admins disponibles
    const { data: perfiles } = await supabase
      .from("profiles")
      .select("id, nombre, email, rol")
      .in("rol", ["profe", "admin"])
      .order("nombre", { ascending: true });

    const disponibles = (perfiles || []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      email: p.email,
    }));
    setProfesoresDisponibles(disponibles);
    setProfeSeleccionado("");
    setMostrarTransferir(true);
  }

  async function transferirAlumno() {
    if (!alumnoSeleccionado || !profeSeleccionado) {
      mostrarToast(t("soporte.alumnosPage.seleccionarProfe"), "error");
      return;
    }

    setProcesando(true);
    setErrorAccion(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setErrorAccion("No autorizado.");
        setProcesando(false);
        return;
      }

      const res = await fetch("/api/transferir-alumno", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          alumnoId: alumnoSeleccionado.id,
          nuevoProfesorId: profeSeleccionado,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al transferir");

      mostrarToast(t("soporte.alumnosPage.alumnoTransferido"), "exito");
      setMostrarTransferir(false);
      setMostrarAcciones(false);
      await cargarAlumnos();
    } catch (err: any) {
      setErrorAccion(err.message);
    }
    setProcesando(false);
  }

  async function togglePausarAlumno() {
    if (!alumnoSeleccionado) return;
    setProcesando(true); setErrorAccion(null);
    try {
      const nuevoEstado = alumnoSeleccionado.pausado ? true : false;
      await supabase.from("alumnos").update({ activo: nuevoEstado }).eq("id", alumnoSeleccionado.id);
      mostrarToast(t("soporte.alumnosPage." + (alumnoSeleccionado.pausado ? "reanudado" : "pausado")), "exito");
      setMostrarAcciones(false); setMostrarConfirmarPausar(false); await cargarAlumnos();
    } catch (err) { setErrorAccion("Error al cambiar el estado."); }
    setProcesando(false);
  }

  async function borrarAlumno() {
    if (!alumnoSeleccionado) return;
    setProcesando(true); setErrorAccion(null);
    try {
      const res = await fetch("/api/borrar-alumno", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alumnoId: alumnoSeleccionado.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al borrar");
      mostrarToast("Alumno eliminado permanentemente.", "exito");
      setMostrarAcciones(false); setMostrarConfirmarBorrar(false); await cargarAlumnos();
    } catch (err: any) { setErrorAccion(err.message); }
    setProcesando(false);
  }

  const alumnosFiltrados = alumnos.filter((a) => {
    if (search) {
      const term = search.toLowerCase();
      if (![a.nombre, a.apellido, a.email, a.profesorNombre].filter(Boolean).join(" ").toLowerCase().includes(term)) return false;
    }
    if (filtroEstado === "activo" && !a.activo) return false;
    if (filtroEstado === "inactivo" && a.activo) return false;
    if (filtroProfesor !== "todos" && a.profesorId !== filtroProfesor) return false;
    return true;
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-5xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" /><div className="h-9 w-48 rounded bg-zinc-800 mb-6" /><div className="h-12 rounded-xl bg-zinc-800 mb-6" />
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-zinc-900 border border-zinc-800 mb-3" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-5xl mx-auto">
        <BackButton fallback="/soporte" />
        <header className="mt-6 mb-6">
          <h1 className="text-3xl font-bold">{t("soporte.alumnos")}</h1>
          <p className="text-zinc-400 mt-2">{alumnos.length} {alumnos.length === 1 ? t("alumnos.registrado") : t("alumnos.registrados")} en el sistema</p>
        </header>

        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => setFiltrosAbierto(!filtrosAbierto)} className={`shrink-0 rounded-xl border px-4 py-2 text-sm transition ${filtroEstado !== "todos" || filtroProfesor !== "todos" ? "border-emerald-600 bg-emerald-500/20 text-emerald-400" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"}`}><span className="hidden sm:inline">{t("common.filtrar")}</span><span className="sm:hidden">⚙️</span></button>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("soporte.alumnosPage.buscarPlaceholder")} className="flex-1 bg-zinc-900 rounded-xl p-4 border border-zinc-700 text-white placeholder-zinc-500" />
          </div>
          {filtrosAbierto && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
              <div>
                <p className="text-sm text-zinc-400 mb-3">{t("soporte.alumnosPage.filtrarEstado")}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setFiltroEstado("todos")} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${filtroEstado === "todos" ? "border-emerald-600 bg-emerald-500/20 text-emerald-400" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}>{t("common.todos")}</button>
                  <button type="button" onClick={() => setFiltroEstado("activo")} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${filtroEstado === "activo" ? "border-emerald-600 bg-emerald-500/20 text-emerald-400" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}>✅ {t("soporte.alumnosPage.activos")}</button>
                  <button type="button" onClick={() => setFiltroEstado("inactivo")} className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition ${filtroEstado === "inactivo" ? "border-red-600 bg-red-500/20 text-red-400" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"}`}>❌ {t("soporte.alumnosPage.inactivos")}</button>
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-400 mb-3">{t("soporte.alumnosPage.filtrarProfesor")}</p>
                <select value={filtroProfesor} onChange={(e) => setFiltroProfesor(e.target.value)} className="w-full bg-zinc-800 rounded-xl p-3 border border-zinc-700 text-white">
                  <option value="todos">{t("soporte.alumnosPage.todosProfesores")}</option>
                  {profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre || t("common.sinNombre")} {p.email ? `(${p.email})` : ""}</option>)}
                  <option value="sin">{t("soporte.alumnosPage.sinProfesor")}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {alumnosFiltrados.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center"><p className="text-zinc-400">{search ? t("soporte.alumnosPage.noEncontrados") : t("soporte.alumnosPage.noRegistrados")}</p></div>
        ) : (
          <div className="space-y-2">
            {alumnosFiltrados.map((alumno) => (
              <a key={alumno.id} href={`/soporte/perfil/${alumno.user_id || alumno.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition cursor-pointer">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{alumno.nombre || t("common.sinNombre")} {alumno.apellido || ""}</p>
                  {alumno.email && <p className="text-zinc-500 text-sm truncate">{alumno.email}</p>}
                </div>
                <div className="flex items-center gap-3 text-sm shrink-0">
                  {alumno.profesorNombre ? <span className="text-zinc-400">👨‍🏫 {alumno.profesorNombre}</span> : <span className="text-zinc-600">{t("soporte.alumnosPage.sinProfesor")}</span>}
                  {(() => { const e = obtenerEstadoAlumnoProfesor(alumno.pausado ? false : true, alumno.activo && !alumno.pausado); return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.colorClasses}`}>{e.icono} {e.label}</span>; })()}
                  {currentUserRol === "admin" && (
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); abrirAccionesAlumno(alumno); }} className="rounded-lg border border-zinc-700 px-2 py-1 text-sm hover:bg-zinc-800 text-lg leading-none" title={t("common.acciones")}>⋮</button>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {alumnoSeleccionado && (
        <ModalAccionesAdmin abierto={mostrarAcciones} onCerrar={() => { setMostrarAcciones(false); setErrorAccion(null); }} titulo={t("common.accionesTitulo", { nombre: alumnoSeleccionado.nombre || t("common.sinNombre") })} error={errorAccion}
          acciones={[
            { id: "transferir", icono: "🔄", titulo: t("soporte.alumnosPage.transferirBtn"), descripcion: t("soporte.alumnosPage.transferirDesc"), color: "blue", onClick: () => abrirTransferir() },
            { id: "pausar", icono: alumnoSeleccionado.pausado ? "▶️" : "⏸️", titulo: alumnoSeleccionado.pausado ? t("common.reanudarUsuario") : t("common.pausarUsuario"), descripcion: alumnoSeleccionado.pausado ? t("soporte.alumnosPage.reanudarDesc") : t("soporte.alumnosPage.pausarDesc"), color: "yellow", onClick: () => setMostrarConfirmarPausar(true) },
            { id: "borrar", icono: "🗑️", titulo: t("common.eliminarUsuario"), descripcion: t("soporte.alumnosPage.borrarDesc"), color: "red", onClick: () => setMostrarConfirmarBorrar(true) },
          ]}
        />
      )}

      {mostrarConfirmarPausar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            {alumnoSeleccionado?.pausado ? (
              <><h3 className="text-xl font-bold text-emerald-400 mb-3">▶️ {t("common.reanudarUsuario")}</h3><p className="text-zinc-300 text-sm mb-4">{t("soporte.alumnosPage.confirmarReanudar", { nombre: alumnoSeleccionado?.nombre })}</p><p className="text-zinc-500 text-sm mb-5">{t("soporte.alumnosPage.reanudarDesc")}</p>
                {errorAccion && <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>}
                <div className="flex gap-3"><button type="button" onClick={() => { setMostrarConfirmarPausar(false); setErrorAccion(null); }} disabled={procesando} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50">{t("common.cancelarBtn")}</button>
                <button type="button" onClick={togglePausarAlumno} disabled={procesando} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">{procesando ? t("common.reanudando") : t("common.siReanudar")}</button></div></>
            ) : (
              <><h3 className="text-xl font-bold text-yellow-400 mb-3">⏸️ {t("common.pausarUsuario")}</h3><p className="text-zinc-300 text-sm mb-4">{t("soporte.alumnosPage.confirmarPausar", { nombre: alumnoSeleccionado?.nombre })}</p><p className="text-zinc-500 text-sm mb-5">{t("soporte.alumnosPage.pausarInfo")}</p>
                {errorAccion && <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>}
                <div className="flex gap-3"><button type="button" onClick={() => { setMostrarConfirmarPausar(false); setErrorAccion(null); }} disabled={procesando} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50">{t("common.cancelarBtn")}</button>
                <button type="button" onClick={togglePausarAlumno} disabled={procesando} className="flex-1 rounded-xl bg-yellow-600 py-3 text-sm font-semibold hover:bg-yellow-700 disabled:opacity-50">{procesando ? t("common.pausando") : t("common.siPausar")}</button></div></>
            )}
          </div>
        </div>
      )}

      {mostrarConfirmarBorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-red-400 mb-3">🗑️ {t("common.eliminarUsuario")}</h3>
            <p className="text-zinc-300 text-sm mb-4">{t("soporte.alumnosPage.confirmarBorrar", { nombre: alumnoSeleccionado?.nombre })}</p>
            <p className="text-red-400 text-sm font-semibold mb-5">{t("soporte.alumnosPage.borrarNoDeshacer")}</p>
            {errorAccion && <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">{errorAccion}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setMostrarConfirmarBorrar(false); setErrorAccion(null); }} disabled={procesando} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm hover:bg-zinc-800 disabled:opacity-50">{t("common.cancelarBtn")}</button>
              <button type="button" onClick={borrarAlumno} disabled={procesando} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold hover:bg-red-700 disabled:opacity-50">{procesando ? t("common.eliminando") : t("common.siEliminar")}</button>
            </div>
          </div>
        </div>
      )}

      {mostrarTransferir && alumnoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">{t("soporte.alumnosPage.transferirTitulo")}</h3>
              <button
                type="button"
                onClick={() => { setMostrarTransferir(false); setErrorAccion(null); }}
                className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <p className="text-zinc-400 text-sm mb-4" dangerouslySetInnerHTML={{
              __html: t("soporte.alumnosPage.transferirDescripcion", { nombre: alumnoSeleccionado.nombre || t("common.sinNombre") }) + ":"
            }} />

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
                    <p className="text-sm font-medium truncate">{p.nombre || t("common.sinNombre")}</p>
                    {p.email && <p className="text-xs text-zinc-500 truncate">{p.email}</p>}
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
                {t("common.cancelarBtn")}
              </button>
              <button
                type="button"
                onClick={transferirAlumno}
                disabled={procesando || !profeSeleccionado}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {procesando ? t("soporte.alumnosPage.transfiriendo") : t("soporte.alumnosPage.transferirBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
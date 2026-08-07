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
import { useIdioma } from "@/lib/i18n-context";
import { useAccionesAlumno } from "@/lib/alumno/useAccionesAlumno";

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
  const { t } = useIdioma();
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

  // Estados para acciones (usando hook reutilizable)
  const {
    mostrarAcciones,
    setMostrarAcciones,
    mostrarTransferir,
    setMostrarTransferir,
    mostrarConfirmarBorrar,
    setMostrarConfirmarBorrar,
    profesoresDisponibles,
    profeSeleccionado,
    setProfeSeleccionado,
    procesando,
    errorAccion,
    setErrorAccion,
    abrirModalAcciones,
    transferirAlumno,
    pausarAlumno,
    borrarAlumno,
    acciones,
  } = useAccionesAlumno(id, alumno, cargarAlumno);

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
      mostrarToast(t("perfil.nombreRequerido"), "info");
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

    mostrarToast(t("alumnos.datosActualizados"), "exito");
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
      mostrarToast(error?.message || t("alumnos.noEncontrado"), "error");
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

  // --- Acciones (usando hook reutilizable) ---

  async function handleTransferir() {
    await transferirAlumno();
  }

  async function handlePausar() {
    await pausarAlumno();
  }

  async function handleBorrar() {
    await borrarAlumno();
  }

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
  if (!alumno) return <main className="min-h-screen bg-zinc-950 text-white p-6">{t("alumnos.noEncontrado")}</main>;

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
                <p className="text-zinc-400 mt-1">{t("alumnos.perfilTitulo")}</p>
                {alumno.activo === false && (
                  <span className="inline-block mt-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                    {t("alumnos.pausado")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href={`/alumnos/${id}/rutinas`} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold hover:bg-emerald-600">{t("alumnos.rutina")}</a>
              <a href={`/alumnos/${id}/historial`} className="rounded-xl border border-zinc-700 px-4 py-3 text-sm hover:bg-zinc-800">{t("alumnos.historial")}</a>
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
            <h2 className="text-xl font-semibold">{t("alumnos.datosAlumno")}</h2>
            <button onClick={abrirModalEditar} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">✏️ {t("perfil.editar")}</button>
          </div>

          <div className="grid md:grid-cols-2 gap-3 text-zinc-300">
            {alumno.email && <p>{t("common.email")}: {alumno.email}</p>}
            {alumno.telefono && <p>{t("common.telefono")}: {alumno.telefono}</p>}
            {alumno.fecha_nacimiento && <p>{t("alumnos.fechaNacimientoLabel")} {formatearFechaCorta(alumno.fecha_nacimiento)}</p>}
            {alumno.fecha_nacimiento && <p>{t("alumnos.edadLabel")} {calcularEdad(alumno.fecha_nacimiento)} {t("alumnos.anios")}</p>}
            {alumno.sexo && <p>{t("alumnos.sexoLabel")} {alumno.sexo}</p>}
            {alumno.altura_cm && <p>{t("alumnos.alturaLabel")} {alumno.altura_cm} {t("alumnos.cm")}</p>}
            {alumno.peso_kg && <p>{t("alumnos.pesoLabel")} {alumno.peso_kg} {t("alumnos.kg")}</p>}
            <p>{t("alumnos.lesionesLabel")} {alumno.sin_lesiones ? t("alumnos.sinLesionesRegistradas") : alumno.lesiones || t("alumnos.sinLesionesRegistradas")}</p>
            {(alumno.observaciones_generales || alumno.observaciones) && <p className="md:col-span-2 whitespace-pre-wrap">{t("alumnos.observacionesLabel")} {alumno.observaciones_generales || alumno.observaciones}</p>}
            {alumno.observaciones_fisicas && <p className="md:col-span-2 whitespace-pre-wrap">{t("alumnos.observacionesFisicasLabel")} {alumno.observaciones_fisicas}</p>}
          </div>
        </section>

        {/* Card 3: Estadísticas */}
        <section className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-400">{t("alumnos.rutinasCompletadas")}</p>
            <p className="text-2xl font-bold mt-1">{rutinasCompletadas}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-400">{t("alumnos.evaluaciones")}</p>
            <p className="text-2xl font-bold mt-1">{evaluacionesCompletadas}</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-400">{t("alumnos.ejercicios")}</p>
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
                <h3 className="text-xl font-bold">{t("alumnos.transferirTitulo")}</h3>
                <button
                  type="button"
                  onClick={() => { setMostrarTransferir(false); setErrorAccion(null); }}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <p className="text-zinc-400 text-sm mb-4" dangerouslySetInnerHTML={{
                __html: t("alumnos.transferirDescripcion", { nombre: nombreCompleto() }) + ":"
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
                      <p className="text-sm font-medium truncate">{p.nombre || t("configuracion.sinNombre")}</p>
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
                  {t("alumnos.cancelar")}
                </button>
                <button
                  type="button"
                  onClick={handleTransferir}
                  disabled={procesando || !profeSeleccionado}
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {procesando ? t("alumnos.transfiriendo") : t("alumnos.transferirBtn")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirmar borrar */}
        {mostrarConfirmarBorrar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold text-red-400 mb-3">{t("alumnos.borrarTitulo")}</h3>
              <p className="text-zinc-300 text-sm leading-relaxed mb-2">
                {t("alumnos.borrarConfirmacion", { nombre: nombreCompleto() })}
              </p>
              <ul className="text-zinc-400 text-sm list-disc list-inside mb-4 space-y-1">
                <li>{t("alumnos.borrarItem1")}</li>
                <li>{t("alumnos.borrarItem2")}</li>
                <li>{t("alumnos.borrarItem3")}</li>
                <li>{t("alumnos.borrarItem4")}</li>
                <li>{t("alumnos.borrarItem5")}</li>
              </ul>
              <p className="text-red-400 text-sm font-semibold mb-5">{t("alumnos.borrarNoDeshacer")}</p>
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
                  {t("alumnos.cancelar")}
                </button>
                <button
                  type="button"
                  onClick={handleBorrar}
                  disabled={procesando}
                  className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {procesando ? t("alumnos.guardando") : t("alumnos.siBorrarAlumno")}
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
                <h3 className="text-xl font-bold">{t("alumnos.editarTitulo")}</h3>
                <button type="button" onClick={() => setEditando(false)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 space-y-3">
                <input className={input} value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder={t("perfil.nombrePlaceholder")} />
                <input className={input} value={nuevoApellido} onChange={(e) => setNuevoApellido(e.target.value)} placeholder={t("perfil.apellidoPlaceholder")} />
                <input className={input} value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} placeholder={t("perfil.emailPlaceholder")} />
                <input className={input} value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} placeholder={t("perfil.telefonoPlaceholder")} />
                <input type="date" className={input} value={nuevoFechaNac} onChange={(e) => setNuevoFechaNac(e.target.value)} />
                <select className={input} value={nuevoSexo} onChange={(e) => setNuevoSexo(e.target.value)}>
                  <option value="">{t("perfil.sexo")}</option>
                  <option value="Masculino">{t("perfil.masculino")}</option>
                  <option value="Femenino">{t("perfil.femenino")}</option>
                  <option value="Prefiero no decirlo">{t("perfil.prefieroNoDecir")}</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input className={input} value={nuevoAltura} onChange={(e) => setNuevoAltura(e.target.value)} placeholder={t("perfil.alturaPlaceholder")} />
                  <input className={input} value={nuevoPeso} onChange={(e) => setNuevoPeso(e.target.value)} placeholder={t("perfil.pesoPlaceholder")} />
                </div>
                <textarea className={`${input} min-h-24`} disabled={nuevoSinLesiones} value={nuevoLesiones} onChange={(e) => setNuevoLesiones(e.target.value)} placeholder={t("perfil.lesionesPlaceholder")} />
                <label className="flex items-center gap-2 text-zinc-300 text-sm">
                  <input type="checkbox" checked={nuevoSinLesiones} onChange={(e) => setNuevoSinLesiones(e.target.checked)} />
                  {t("alumnos.sinLesiones")}
                </label>
                <textarea className={`${input} min-h-24`} value={nuevoObsGenerales} onChange={(e) => setNuevoObsGenerales(e.target.value)} placeholder={t("perfil.observacionesPlaceholder")} />
                <textarea className={`${input} min-h-24`} value={nuevoObsFisicas} onChange={(e) => setNuevoObsFisicas(e.target.value)} placeholder={t("perfil.observacionesFisicasPlaceholder")} />
              </div>

              <div className="flex gap-3 mt-4 shrink-0 border-t border-zinc-800 pt-4">
                <button type="button" onClick={() => setEditando(false)} className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 hover:bg-zinc-800">{t("alumnos.cancelar")}</button>
                <button type="button" onClick={guardarCambios} disabled={guardando} className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
                  {guardando ? t("alumnos.guardando") : t("alumnos.guardarCambios")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
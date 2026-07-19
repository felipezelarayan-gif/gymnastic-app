"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { obtenerEstadoAlumnoProfesor } from "@/lib/alumno/obtenerEstadoAlumnoProfesor";

type ProfileData = {
  id: string;
  nombre: string | null;
  email: string | null;
  rol: string;
  es_admin: boolean;
  creado_por: string | null;
  creado_por_nombre: string | null;
  creado_por_email: string | null;
  created_at: string;
};

type ProfesorInfo = {
  id: string;
  nombre: string | null;
  email: string | null;
  es_admin: boolean;
  creado_por: string | null;
  totalAlumnos: number;
  alumnosActivos: number;
  alumnosPausados: number;
};

type AlumnoDetalle = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  activoBD: boolean | null;
  tieneAsignaciones: boolean;
  ultimaRutinaAsignada: string | null;
  ultimaFechaCompletada: string | null;
};

type RutinaInfo = {
  id: string;
  nombre: string;
  fecha_asignacion: string | null;
  fecha_completada: string | null;
  completada: boolean;
};

type EvaluacionInfo = {
  id: string;
  tipo: string;
  nombre: string;
  fecha: string | null;
  estado: string;
};

export default function SoportePerfilPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profesores, setProfesores] = useState<ProfesorInfo[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoDetalle[]>([]);
  const [totalAlumnos, setTotalAlumnos] = useState(0);
  const [totalRutinas, setTotalRutinas] = useState(0);
  const [totalEvalRM, setTotalEvalRM] = useState(0);
  const [totalEvalFMS, setTotalEvalFMS] = useState(0);
  const [creadorNombre, setCreadorNombre] = useState<string | null>(null);
  const [creadorEmail, setCreadorEmail] = useState<string | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [modalRutinasAbierto, setModalRutinasAbierto] = useState(false);
  const [modalEvalAbierto, setModalEvalAbierto] = useState(false);

  // Datos del alumno (vista detalle)
  const [alumnoData, setAlumnoData] = useState<any>(null);
  const [alumnoProfesor, setAlumnoProfesor] = useState<{ id: string; nombre: string | null; email: string | null } | null>(null);
  const [alumnoRutinas, setAlumnoRutinas] = useState<RutinaInfo[]>([]);
  const [alumnoEvaluaciones, setAlumnoEvaluaciones] = useState<EvaluacionInfo[]>([]);

  useEffect(() => {
    cargarPerfil();
  }, [params.id]);

  async function cargarPerfil() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/login");
      return;
    }

    // Solo soporte (rol=admin) puede acceder a perfiles desde /soporte
    const { data: perfilActual } = await supabase
      .from("profiles")
      .select("rol, es_admin")
      .eq("id", sessionData.session.user.id)
      .maybeSingle();

    if (perfilActual?.rol !== "admin") {
      router.push("/soporte");
      return;
    }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("id, nombre, email, rol, es_admin, creado_por, created_at")
      .eq("id", params.id)
      .maybeSingle();

    if (!perfil) {
      setLoading(false);
      return;
    }

    // Obtener creador
    let creadorNom: string | null = null;
    let creadorEm: string | null = null;
    if (perfil.creado_por) {
      const { data: creador } = await supabase
        .from("profiles")
        .select("nombre, email")
        .eq("id", perfil.creado_por)
        .maybeSingle();
      creadorNom = creador?.nombre || null;
      creadorEm = creador?.email || null;
    }
    setCreadorNombre(creadorNom);
    setCreadorEmail(creadorEm);
    setProfile({ ...perfil, creado_por_nombre: creadorNom, creado_por_email: creadorEm });

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);
    const fechaLimiteISO = fechaLimite.toISOString();

    const dosMesesAtras = new Date();
    dosMesesAtras.setMonth(dosMesesAtras.getMonth() - 2);
    const dosMesesISO = dosMesesAtras.toISOString();

    const { data: asignacionesRecientes } = await supabase
      .from("rutina_asignaciones")
      .select("alumno_id")
      .or(`fecha_asignacion.gte.${fechaLimiteISO},fecha_completada.gte.${fechaLimiteISO},created_at.gte.${fechaLimiteISO}`);

    const alumnosActivosSet = new Set((asignacionesRecientes || []).map((a: any) => a.alumno_id));

    // === VISTA DE ALUMNO ===
    if (perfil.rol === "alumno") {
      const { data: alumno } = await supabase
        .from("alumnos")
        .select("*, profesor_id")
        .eq("user_id", perfil.id)
        .maybeSingle();

      if (alumno) {
        setAlumnoData(alumno);

        if (alumno.profesor_id) {
          const { data: profe } = await supabase
            .from("profiles")
            .select("id, nombre, email")
            .eq("id", alumno.profesor_id)
            .maybeSingle();
          setAlumnoProfesor(profe);
        }

        // Obtener rutinas de los últimos 2 meses
        const { data: rutinas } = await supabase
          .from("rutina_asignaciones")
          .select(`
            id, completada, fecha_asignacion, fecha_completada,
            rutinas ( id, nombre )
          `)
          .eq("alumno_id", alumno.id)
          .gte("created_at", dosMesesISO)
          .order("created_at", { ascending: false });

        if (rutinas) {
          setAlumnoRutinas(
            rutinas.map((r: any) => ({
              id: r.id,
              nombre: r.rutinas?.nombre || "Sin nombre",
              fecha_asignacion: r.fecha_asignacion,
              fecha_completada: r.fecha_completada,
              completada: r.completada || false,
            }))
          );
        }
        setTotalRutinas(rutinas?.length || 0);

        // Obtener evaluaciones de los últimos 2 meses
        const [evalRM, evalFMS] = await Promise.all([
          supabase
            .from("evaluaciones_rm")
            .select("id, nombre, fecha_realizacion, estado")
            .eq("alumno_id", alumno.id)
            .is("deleted_at", null)
            .gte("created_at", dosMesesISO)
            .order("created_at", { ascending: false }),
          supabase
            .from("evaluaciones_fms")
            .select("id, estado, created_at")
            .eq("alumno_id", alumno.id)
            .is("deleted_at", null)
            .gte("created_at", dosMesesISO)
            .order("created_at", { ascending: false }),
        ]);

        const evals: EvaluacionInfo[] = [
          ...(evalRM.data || []).map((e: any) => ({
            id: e.id,
            tipo: "RM",
            nombre: e.nombre || "Evaluación RM",
            fecha: e.fecha_realizacion,
            estado: e.estado,
          })),
          ...(evalFMS.data || []).map((e: any) => ({
            id: e.id,
            tipo: "FMS",
            nombre: "Evaluación FMS",
            fecha: e.created_at,
            estado: e.estado,
          })),
        ];
        setAlumnoEvaluaciones(evals);
        setTotalEvalRM(evalRM.data?.length || 0);
        setTotalEvalFMS(evalFMS.data?.length || 0);
      }
    }

    // === VISTA DE ADMIN/PROFE ===
    if (perfil.rol === "admin" || perfil.rol === "profe") {
      const { data: profesData } = await supabase
        .from("profiles")
        .select("id, nombre, email, es_admin, creado_por")
        .eq("rol", "profe")
        .eq("creado_por", perfil.id)
        .order("nombre", { ascending: true });

      if (profesData) {
        const profesoresInfo: ProfesorInfo[] = await Promise.all(
          profesData.map(async (p) => {
            const { data: alumnosData } = await supabase
              .from("alumnos")
              .select("id, activo")
              .eq("profesor_id", p.id);
            const total = alumnosData?.length || 0;
            const activos = alumnosData?.filter((a) => a.activo !== false && alumnosActivosSet.has(a.id)).length || 0;
            const pausados = alumnosData?.filter((a) => a.activo === false).length || 0;
            return {
              id: p.id, nombre: p.nombre, email: p.email, es_admin: p.es_admin || false,
              creado_por: p.creado_por, totalAlumnos: total, alumnosActivos: activos, alumnosPausados: pausados,
            };
          })
        );
        setProfesores(profesoresInfo);
      }

      if (perfil.rol === "profe") {
        const [{ count: countAlumnos }, { count: countRutinas }, { count: countEvalRM }, { count: countEvalFMS }, { data: alumnosData }] = await Promise.all([
          supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("profesor_id", perfil.id),
          supabase.from("rutinas").select("id", { count: "exact", head: true }).eq("profesor_id", perfil.id),
          supabase.from("evaluaciones_rm").select("id", { count: "exact", head: true }).eq("profesor_id", perfil.id).is("deleted_at", null),
          supabase.from("evaluaciones_fms").select("id", { count: "exact", head: true }).eq("profesor_id", perfil.id).is("deleted_at", null),
          supabase.from("alumnos").select("id, nombre, apellido, email, activo").eq("profesor_id", perfil.id).order("nombre", { ascending: true }),
        ]);
        setTotalAlumnos(countAlumnos || 0);
        setTotalRutinas(countRutinas || 0);
        setTotalEvalRM(countEvalRM || 0);
        setTotalEvalFMS(countEvalFMS || 0);

        if (alumnosData) {
          const alumnosConDetalle: AlumnoDetalle[] = await Promise.all(
            alumnosData.map(async (a) => {
              const { data: ultimaAsignacion } = await supabase
                .from("rutina_asignaciones")
                .select("fecha_asignacion, fecha_completada")
                .eq("alumno_id", a.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              return {
                id: a.id, nombre: a.nombre, apellido: a.apellido, email: a.email,
                activoBD: a.activo, tieneAsignaciones: alumnosActivosSet.has(a.id),
                ultimaRutinaAsignada: ultimaAsignacion?.fecha_asignacion || null,
                ultimaFechaCompletada: ultimaAsignacion?.fecha_completada || null,
              };
            })
          );
          setAlumnos(alumnosConDetalle);
        }
      }
    }

    setLoading(false);
  }

  function formatearFecha(fecha: string | null): string {
    if (!fecha) return "—";
    try {
      return new Date(fecha).toLocaleDateString("es-AR", { year: "numeric", month: "2-digit", day: "2-digit" });
    } catch { return "—"; }
  }

  const alumnosActivos = alumnos.filter((a) => obtenerEstadoAlumnoProfesor(a.activoBD, a.tieneAsignaciones).estado === "activo").length;
  const alumnosInactivos = alumnos.filter((a) => obtenerEstadoAlumnoProfesor(a.activoBD, a.tieneAsignaciones).estado === "inactivo").length;
  const alumnosPausados = alumnos.filter((a) => obtenerEstadoAlumnoProfesor(a.activoBD, a.tieneAsignaciones).estado === "pausado").length;

  // Estado del alumno (vista alumno)
  let estadoAlumno = null;
  if (alumnoData && profile?.rol === "alumno") {
    const activoBD = alumnoData.activo === true;
    const tieneAsign = totalRutinas > 0;
    estadoAlumno = obtenerEstadoAlumnoProfesor(activoBD, tieneAsign);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-5 w-20 rounded bg-zinc-800 mb-6" />
          <div className="h-9 w-48 rounded bg-zinc-800 mb-6" />
          <div className="h-48 rounded-2xl bg-zinc-900 border border-zinc-800" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-3xl mx-auto">
          <BackButton fallback="/soporte" />
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400">Perfil no encontrado.</p>
          </div>
        </div>
      </main>
    );
  }

  // ===== VISTA DE ALUMNO =====
  if (profile.rol === "alumno") {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
        <div className="max-w-3xl mx-auto">
          <BackButton fallback="/soporte" />

          <header className="mt-6 mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">👤 {profile.nombre || "Sin nombre"}</h1>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">👤 Alumno</span>
              {estadoAlumno && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoAlumno.colorClasses}`}>
                  {estadoAlumno.icono} {estadoAlumno.label}
                </span>
              )}
            </div>
            <p className="text-zinc-400 mt-2">Vista de solo lectura</p>
          </header>

          <div className="space-y-4">
            {/* Información básica */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-lg font-semibold mb-4">📋 Información básica</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-500">Email</p>
                  <p className="text-white">{profile.email || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Teléfono</p>
                  <p className="text-white">{alumnoData?.telefono || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Fecha de nacimiento</p>
                  <p className="text-white">{alumnoData?.fecha_nacimiento ? formatearFecha(alumnoData.fecha_nacimiento) : "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Sexo</p>
                  <p className="text-white">{alumnoData?.sexo || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Registrado el</p>
                  <p className="text-white">{profile.created_at ? formatearFecha(profile.created_at) : "—"}</p>
                </div>
              </div>
            </section>

            {/* Datos físicos */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-lg font-semibold mb-4">💪 Datos físicos</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-zinc-500">Altura</p>
                  <p className="text-white">{alumnoData?.altura_cm ? `${alumnoData.altura_cm} cm` : "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Peso</p>
                  <p className="text-white">{alumnoData?.peso_kg ? `${alumnoData.peso_kg} kg` : "—"}</p>
                </div>
              </div>
            </section>

            {/* Profesor asignado */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-lg font-semibold mb-4">👨‍🏫 Profesor asignado</h2>
              {alumnoProfesor ? (
                <Link href={`/soporte/perfil/${alumnoProfesor.id}`} className="hover:opacity-80 transition">
                  <p className="text-white">{alumnoProfesor.nombre || "Sin nombre"}</p>
                  {alumnoProfesor.email && <p className="text-zinc-500 text-sm">{alumnoProfesor.email}</p>}
                </Link>
              ) : (
                <p className="text-zinc-500">Sin profesor asignado</p>
              )}
            </section>

            {/* Métricas */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-lg font-semibold mb-4">📊 Métricas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">📋 Rutinas</p>
                    {alumnoRutinas.length > 0 && (
                      <button type="button" onClick={() => setModalRutinasAbierto(true)} className="text-xs text-emerald-400 hover:underline">Ver detalles</button>
                    )}
                  </div>
                  <p className="text-3xl font-bold mt-1">{totalRutinas}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-400">📏 Eval. RM</p>
                    {alumnoEvaluaciones.filter(e => e.tipo === "RM").length > 0 && (
                      <button type="button" onClick={() => setModalEvalAbierto(true)} className="text-xs text-emerald-400 hover:underline">Ver detalles</button>
                    )}
                  </div>
                  <p className="text-3xl font-bold mt-1">{totalEvalRM}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">📏 Eval. FMS</p>
                  <p className="text-3xl font-bold mt-1">{totalEvalFMS}</p>
                </div>
              </div>
            </section>

            {/* Observaciones */}
            {alumnoData?.observaciones && (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h2 className="text-lg font-semibold mb-4">📝 Observaciones</h2>
                <p className="text-zinc-300 whitespace-pre-wrap">{alumnoData.observaciones}</p>
              </section>
            )}
          </div>

          {/* Modal: Detalle de rutinas */}
          {modalRutinasAbierto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
              <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col">
                <div className="flex items-center justify-between border-b border-zinc-800 p-6 pb-4 shrink-0">
                  <div>
                    <h3 className="text-xl font-bold">📋 Rutinas (últimos 2 meses)</h3>
                    <p className="text-zinc-500 text-sm mt-1">{alumnoRutinas.length} rutinas</p>
                  </div>
                  <button type="button" onClick={() => setModalRutinasAbierto(false)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {alumnoRutinas.length === 0 ? <p className="text-zinc-400 text-center">Sin rutinas en los últimos 2 meses.</p> : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-xs text-zinc-500 px-3 pb-2 font-medium">
                        <div className="col-span-4">Nombre</div>
                        <div className="col-span-3">Asignada</div>
                        <div className="col-span-3">Completada</div>
                        <div className="col-span-2">Estado</div>
                      </div>
                      {alumnoRutinas.map((r) => (
                        <div key={r.id} className="grid grid-cols-12 gap-2 items-center rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">
                          <div className="col-span-4 font-medium truncate">{r.nombre}</div>
                          <div className="col-span-3 text-zinc-400 text-xs">{formatearFecha(r.fecha_asignacion)}</div>
                          <div className="col-span-3 text-zinc-400 text-xs">{formatearFecha(r.fecha_completada)}</div>
                          <div className="col-span-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${r.completada ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                              {r.completada ? "✅ Compl." : "⏳ Pend."}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal: Detalle de evaluaciones */}
          {modalEvalAbierto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
              <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col">
                <div className="flex items-center justify-between border-b border-zinc-800 p-6 pb-4 shrink-0">
                  <div>
                    <h3 className="text-xl font-bold">📏 Evaluaciones (últimos 2 meses)</h3>
                    <p className="text-zinc-500 text-sm mt-1">{alumnoEvaluaciones.length} evaluaciones</p>
                  </div>
                  <button type="button" onClick={() => setModalEvalAbierto(false)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {alumnoEvaluaciones.length === 0 ? <p className="text-zinc-400 text-center">Sin evaluaciones en los últimos 2 meses.</p> : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-xs text-zinc-500 px-3 pb-2 font-medium">
                        <div className="col-span-3">Tipo</div>
                        <div className="col-span-5">Nombre</div>
                        <div className="col-span-2">Fecha</div>
                        <div className="col-span-2">Estado</div>
                      </div>
                      {alumnoEvaluaciones.map((e) => (
                        <div key={e.id} className="grid grid-cols-12 gap-2 items-center rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">
                          <div className="col-span-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${e.tipo === "RM" ? "bg-purple-500/10 text-purple-400" : "bg-cyan-500/10 text-cyan-400"}`}>
                              {e.tipo}
                            </span>
                          </div>
                          <div className="col-span-5 font-medium truncate">{e.nombre}</div>
                          <div className="col-span-2 text-zinc-400 text-xs">{formatearFecha(e.fecha)}</div>
                          <div className="col-span-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${e.estado === "cargado" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                              {e.estado === "cargado" ? "✅ Compl." : "⏳ Pend."}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ===== VISTA DE PROFE/ADMIN =====
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6 pb-28">
      <div className="max-w-3xl mx-auto">
        <BackButton fallback="/soporte" />

        <header className="mt-6 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">
              {profile.rol === "admin" ? "🛠️" : "👨‍🏫"} {profile.nombre || "Sin nombre"}
            </h1>
            {profile.rol === "admin" ? (
              <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">🛠️ Soporte</span>
            ) : profile.es_admin ? (
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">👑 Admin</span>
            ) : (
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">👨‍🏫 Profesor</span>
            )}
          </div>
          <p className="text-zinc-400 mt-2">Vista de solo lectura</p>
        </header>

        <div className="space-y-4">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold mb-4">📋 Información</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-zinc-500">Email</p>
                <p className="text-white">{profile.email || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Rol</p>
                <p className="text-white capitalize">{profile.rol === "admin" ? "Soporte" : "Profesor"}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Creado por</p>
                <p className="text-white">{profile.creado_por_nombre || creadorNombre || "—"}</p>
                {(profile.creado_por_email || creadorEmail) && <p className="text-zinc-500 text-xs">{profile.creado_por_email || creadorEmail}</p>}
              </div>
              <div>
                <p className="text-sm text-zinc-500">Fecha de creación</p>
                <p className="text-white">
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </p>
              </div>
            </div>
          </section>

          {(profile.rol === "admin" || profile.es_admin) && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-lg font-semibold mb-4">📊 Mis métricas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">👨‍🏫 Profesores creados</p>
                  <p className="text-3xl font-bold mt-1">{profesores.length}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">👥 Alumnos totales</p>
                  <p className="text-3xl font-bold mt-1">{profesores.reduce((sum, p) => sum + p.totalAlumnos, 0)}</p>
                </div>
              </div>
            </section>
          )}

          {profile.rol === "profe" && (
            <>
              <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h2 className="text-lg font-semibold mb-4">📊 Métricas</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-sm text-zinc-400">👥 Alumnos</p>
                    <p className="text-3xl font-bold mt-1">{totalAlumnos}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-sm text-zinc-400">📋 Rutinas</p>
                    <p className="text-3xl font-bold mt-1">{totalRutinas}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-sm text-zinc-400">📏 Eval. RM</p>
                    <p className="text-3xl font-bold mt-1">{totalEvalRM}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="text-sm text-zinc-400">📏 Eval. FMS</p>
                    <p className="text-3xl font-bold mt-1">{totalEvalFMS}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">👥 Alumnos</h2>
                  {alumnos.length > 0 && (
                    <button type="button" onClick={() => setModalDetalleAbierto(true)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">Ver detalle</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-emerald-800/50 bg-zinc-950 p-4">
                    <p className="text-xs text-emerald-400">✅ Activos</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-400">{alumnosActivos}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4">
                    <p className="text-xs text-zinc-400">⏸️ Inactivos</p>
                    <p className="text-2xl font-bold mt-1 text-zinc-300">{alumnosInactivos}</p>
                  </div>
                  <div className="rounded-xl border border-red-800/50 bg-zinc-950 p-4">
                    <p className="text-xs text-red-400">🚫 Pausados</p>
                    <p className="text-2xl font-bold mt-1 text-red-400">{alumnosPausados}</p>
                  </div>
                </div>
              </section>
            </>
          )}

          {(profile.rol === "admin" || profile.es_admin) && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-lg font-semibold mb-4">👨‍🏫 Profesores creados ({profesores.length})</h2>
              {profesores.length === 0 ? <p className="text-zinc-500">No creaste ningún profesor todavía.</p> : (
                <div className="space-y-2">
                  {profesores.map((prof) => (
                    <Link key={prof.id} href={`/soporte/perfil/${prof.id}`} className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition hover:opacity-80 ${prof.es_admin ? "border-amber-500/50 bg-zinc-950" : "border-zinc-800 bg-zinc-950"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{prof.nombre || "Sin nombre"}</p>
                          {prof.es_admin && <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[8px] font-semibold text-amber-400">👑 Admin</span>}
                        </div>
                        {prof.email && <p className="text-xs text-zinc-500 truncate">{prof.email}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm text-zinc-400">👥 {prof.totalAlumnos}</p>
                        <p className="text-xs text-zinc-500">{prof.alumnosActivos} activos · {prof.alumnosPausados} pausados</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Modal: Detalle de alumnos (profe) */}
        {modalDetalleAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 p-6 pb-4 shrink-0">
                <div>
                  <h3 className="text-xl font-bold">👥 Alumnos</h3>
                  <p className="text-zinc-500 text-sm mt-1">{alumnos.length} alumnos · {alumnosActivos} activos · {alumnosInactivos} inactivos · {alumnosPausados} pausados</p>
                </div>
                <button type="button" onClick={() => setModalDetalleAbierto(false)} className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {alumnos.length === 0 ? <p className="text-zinc-400 text-center">No tiene alumnos asignados.</p> : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs text-zinc-500 px-3 pb-2 font-medium">
                      <div className="col-span-4">Nombre</div>
                      <div className="col-span-3">Email</div>
                      <div className="col-span-2">Estado</div>
                      <div className="col-span-2">Últ. rutina</div>
                      <div className="col-span-1">Compl.</div>
                    </div>
                    {alumnos.map((alumno) => {
                      const estado = obtenerEstadoAlumnoProfesor(alumno.activoBD, alumno.tieneAsignaciones);
                      return (
                        <div key={alumno.id} className="grid grid-cols-12 gap-2 items-center rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">
                          <div className="col-span-4 font-medium truncate">{alumno.nombre || "Sin nombre"} {alumno.apellido || ""}</div>
                          <div className="col-span-3 text-zinc-500 truncate text-xs">{alumno.email || "—"}</div>
                          <div className="col-span-2"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${estado.colorClasses}`}>{estado.icono} {estado.label}</span></div>
                          <div className="col-span-2 text-zinc-400 text-xs">{formatearFecha(alumno.ultimaRutinaAsignada)}</div>
                          <div className="col-span-1 text-zinc-400 text-xs">{formatearFecha(alumno.ultimaFechaCompletada)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
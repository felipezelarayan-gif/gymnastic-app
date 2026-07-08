"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { supabase } from "@/lib/supabase";
import {
  obtenerPendientesAlumno,
  type PendienteAlumno,
} from "@/lib/alumno/obtenerPendientesAlumnos";
import { parseFechaLocal, formatearFechaCorta } from "@/lib/utils/formatearFecha";
import VerEvaluacionModal from "@/components/alumno/VerEvaluacionModal";


function getTipoDisplay(actividad: PendienteAlumno) {
  if (actividad.tipo === "rutina") return "Rutina";
  if (actividad.subtipo) return `Evaluaci\u00f3n ${actividad.subtipo.toUpperCase()}`;
  return "Evaluaci\u00f3n";
}

function obtenerTimestampActividad(actividad: PendienteAlumno) {
  if (!actividad.fecha) return Number.MAX_SAFE_INTEGER;

  const timestamp = parseFechaLocal(actividad.fecha)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export default function NuevaRutinaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<PendienteAlumno[]>([]);
  const [modalEvaluacion, setModalEvaluacion] = useState<{
    open: boolean;
    id: string;
    subtipo: "rm" | "fms";
  } | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      // Leer sesion local (sin viaje HTTP)
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        setError("No se pudo obtener el usuario actual.");
        setLoading(false);
        return;
      }
      // Get alumno record
      const { data: alumnoRows, error: alumnoError } = await supabase
        .from("alumnos")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (alumnoError || !alumnoRows) {
        setError("No se pudo encontrar el alumno vinculado a este usuario.");
        setLoading(false);
        return;
      }
      // Get pendientes
      const resumenPendientes = await obtenerPendientesAlumno(supabase, alumnoRows.id);
      setPendientes(resumenPendientes.pendientes || []);
    } catch (e) {
      setError("Ocurrio un error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Count for planificacion
  const pendientesOrdenados = [...pendientes].sort(
    (a, b) => obtenerTimestampActividad(a) - obtenerTimestampActividad(b)
  );
  const rutinasPendientes = pendientesOrdenados.filter(p => p.tipo === "rutina").length;
  const evaluacionesPendientes = pendientesOrdenados.filter(p => p.tipo !== "rutina").length;
  const proximo = pendientesOrdenados.length > 0 ? pendientesOrdenados[0] : null;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8 animate-pulse">
        <div className="h-8 w-24 rounded bg-zinc-800" />
        {/* Proximo a realizar skeleton */}
        <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
          <div className="h-6 w-48 rounded bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-zinc-800" />
            <div className="h-6 w-64 rounded bg-zinc-800" />
            <div className="h-4 w-40 rounded bg-zinc-800" />
            <div className="h-10 w-40 rounded-lg bg-zinc-800 mt-4" />
          </div>
        </div>
        {/* Planificacion skeleton */}
        <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
          <div className="h-6 w-36 rounded bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-4 w-56 rounded bg-zinc-800" />
            <div className="h-4 w-56 rounded bg-zinc-800" />
            <div className="h-10 w-28 rounded-lg bg-zinc-800 mt-3" />
          </div>
        </div>
        {/* Historial skeleton */}
        <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
          <div className="h-6 w-28 rounded bg-zinc-800" />
          <div className="h-4 w-72 rounded bg-zinc-800" />
          <div className="h-10 w-32 rounded-lg bg-zinc-800 mt-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <BackButton fallback="/alumno" />
      {/* Proximo a realizar */}
      <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Proximo a realizar</h2>
        {error ? (
          <div className="text-red-400">{error}</div>
        ) : proximo ? (
          <div>
            <div className="text-zinc-300 mb-1">{getTipoDisplay(proximo)}</div>
            <div className="text-lg font-bold text-zinc-100 mb-1">{proximo.nombre}</div>
            {proximo.fecha && (
              <div className="text-zinc-400 mb-3">{formatearFechaCorta(proximo.fecha)}</div>
            )}
                {proximo.tipo === "rutina" ? (
                  <Link
                    href={`/alumno/rutina/${proximo.id}`}
                    className="inline-block px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                  >
                    Comenzar rutina
                  </Link>
                ) : proximo.puedeCargarAlumno ? (
                  <Link
                    href={proximo.href}
                    className="inline-block px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                  >
                    Realizar evaluacion
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setModalEvaluacion({
                        open: true,
                        id: proximo.id,
                        subtipo: (proximo.subtipo as "rm" | "fms") || "rm",
                      })
                    }
                    className="inline-block px-4 py-2 rounded-lg bg-zinc-700 text-white font-semibold hover:bg-zinc-600 transition"
                  >
                    Ver evaluacion
                  </button>
                )}
          </div>
        ) : (
          <div className="text-zinc-400">No tienes rutinas ni evaluaciones pendientes.</div>
        )}
      </div>

      {!error && (
        <>
      {/* Planificacion */}
      <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Planificacion</h2>
        <div className="flex flex-col gap-1 text-zinc-300">
          <span>Rutinas pendientes <span className="font-semibold text-zinc-100">({rutinasPendientes})</span></span>
          <span>Evaluaciones pendientes <span className="font-semibold text-zinc-100">({evaluacionesPendientes})</span></span>
        </div>
        <Link
          href="/alumno/rutina/planificacion"
          className="inline-block mt-3 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 font-semibold border border-zinc-700 hover:bg-zinc-700 transition"
        >
          Ver mas
        </Link>
      </div>

      {/* Historial */}
      <div className="bg-zinc-900 rounded-xl p-6 shadow space-y-3">
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">Historial</h2>
        <div className="text-zinc-300 mb-3">
          Consulta aqui tu historial de rutinas y evaluaciones completadas.
        </div>
        <Link
          href="/alumno/rutina/historial"
          className="inline-block mt-3 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-200 font-semibold border border-zinc-700 hover:bg-zinc-700 transition"
        >
          Ver historial
        </Link>
      </div>

      {modalEvaluacion?.open && (
        <VerEvaluacionModal
          open={modalEvaluacion.open}
          onClose={() => setModalEvaluacion(null)}
          evaluacionId={modalEvaluacion.id}
          subtipo={modalEvaluacion.subtipo}
        />
      )}
        </>
      )}
    </div>
  );
}
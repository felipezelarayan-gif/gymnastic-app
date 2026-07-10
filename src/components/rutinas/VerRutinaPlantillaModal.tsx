"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AsignarModal from "@/components/shared/AsignarModal";

type VerRutinaPlantillaModalProps = {
  open: boolean;
  onClose: () => void;
  rutinaId: string;
  profesorId: string;
};

type RutinaData = {
  id: string;
  nombre: string;
  objetivo: string | null;
  estructura: string | null;
};

type EntradaCalorEjercicio = {
  id: string;
  nombre_ejercicio: string;
  series: number | null;
  tipo_prescripcion: string | null;
  repeticiones: string | null;
  duracion: string | null;
  orden: number | null;
};

type RutinaEjercicio = {
  id: string;
  nombre_ejercicio: string;
  series: number | null;
  tipo_prescripcion: string | null;
  repeticiones: string | null;
  peso: string | null;
  porcentaje_rm: string | null;
  rir: string | null;
  descanso: string | null;
  observaciones: string | null;
  orden: number | null;
  tipo_configuracion: string | null;
};

type Alumno = {
  id: string;
  nombre: string;
};

export default function VerRutinaPlantillaModal({
  open,
  onClose,
  rutinaId,
  profesorId,
}: VerRutinaPlantillaModalProps) {
  const [loading, setLoading] = useState(false);
  const [rutina, setRutina] = useState<RutinaData | null>(null);
  const [entradaCalor, setEntradaCalor] = useState<EntradaCalorEjercicio[]>([]);
  const [ejercicios, setEjercicios] = useState<RutinaEjercicio[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [mostrarAsignar, setMostrarAsignar] = useState(false);

  useEffect(() => {
    if (!open || !rutinaId) return;

    let cancelled = false;

    async function cargarDatos() {
      setLoading(true);

      try {
        // 1. Cargar datos de la rutina
        const { data: rutinaData } = await supabase
          .from("rutinas")
          .select("id, nombre, objetivo, estructura")
          .eq("id", rutinaId)
          .single();

        if (cancelled) return;
        if (rutinaData) setRutina(rutinaData);

        // 2. Cargar entrada en calor
        const { data: entradaData } = await supabase
          .from("rutina_entrada_calor")
          .select("id, nombre_ejercicio, series, tipo_prescripcion, repeticiones, duracion, orden")
          .eq("rutina_id", rutinaId)
          .order("orden", { ascending: true });

        if (!cancelled) {
          setEntradaCalor(entradaData || []);
        }

        // 3. Cargar ejercicios principales
        const { data: ejerciciosData } = await supabase
          .from("rutina_ejercicios")
          .select("id, nombre_ejercicio, series, tipo_prescripcion, repeticiones, peso, porcentaje_rm, rir, descanso, observaciones, orden, tipo_configuracion")
          .eq("rutina_id", rutinaId)
          .order("orden", { ascending: true });

        if (!cancelled) {
          setEjercicios(ejerciciosData || []);
        }

        // 4. Cargar alumnos del profesor
        const { data: alumnosData } = await supabase
          .from("alumnos")
          .select("id, nombre")
          .eq("profesor_id", profesorId)
          .order("nombre");

        if (!cancelled) {
          setAlumnos(alumnosData || []);
        }
      } catch (error) {
        console.error("Error cargando datos de la rutina:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    cargarDatos();

    return () => {
      cancelled = true;
    };
  }, [open, rutinaId, profesorId]);

  async function handleAsignar(seleccionados: { id: string; nombre: string; fechaAsignacion?: string }[]) {
    const asignaciones = seleccionados.map((alumno) => ({
      alumno_id: alumno.id,
      rutina_id: rutinaId,
      fecha_asignacion: alumno.fechaAsignacion || new Date().toISOString().slice(0, 10),
      completada: false,
    }));

    const { error } = await supabase.from("rutina_asignaciones").insert(asignaciones);

    if (error) {
      throw new Error(error.message);
    }

    // Redirigir a /rutinas
    window.location.href = "/rutinas";
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
            <div>
              <p className="text-sm text-zinc-500">Rutina</p>
              <h3 className="text-xl font-bold text-zinc-100 mt-1">
                🏋️ {rutina?.nombre || "Cargando..."}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Contenido scrolleable */}
          <div className="overflow-y-auto flex-1 pr-1 space-y-4">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-48 rounded bg-zinc-800" />
                <div className="h-4 w-64 rounded bg-zinc-800" />
                <div className="h-4 w-56 rounded bg-zinc-800" />
                <div className="h-20 w-full rounded-xl bg-zinc-800" />
                <div className="h-20 w-full rounded-xl bg-zinc-800" />
              </div>
            ) : (
              <>
                {/* Entrada en calor */}
                {entradaCalor.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wide">
                      🔥 Entrada en calor
                    </p>
                    <div className="space-y-2">
                      {entradaCalor.map((ej) => (
                        <div
                          key={ej.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
                        >
                          <p className="font-semibold text-zinc-200 text-sm">
                            {ej.orden ? `${ej.orden}. ` : ""}{ej.nombre_ejercicio}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-400">
                            {ej.series && <span>{ej.series} series</span>}
                            {ej.tipo_prescripcion === "tiempo" && ej.duracion && (
                              <span>| {ej.duracion}</span>
                            )}
                            {ej.tipo_prescripcion !== "tiempo" && ej.repeticiones && (
                              <span>| {ej.repeticiones} reps</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ejercicios principales */}
                {ejercicios.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wide">
                      💪 Ejercicios principales
                    </p>
                    <div className="space-y-2">
                      {ejercicios.map((ej) => (
                        <div
                          key={ej.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
                        >
                          <p className="font-semibold text-zinc-200 text-sm">
                            {ej.orden ? `${ej.orden}. ` : ""}{ej.nombre_ejercicio}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                            {ej.series && <span>{ej.series} series</span>}
                            {ej.repeticiones && <span>· {ej.repeticiones} reps</span>}
                            {ej.peso && <span>· {ej.peso}</span>}
                            {ej.porcentaje_rm && <span>· {ej.porcentaje_rm}% RM</span>}
                            {ej.rir && <span>· RIR: {ej.rir}</span>}
                          </div>
                          {ej.descanso && (
                            <p className="text-xs text-zinc-500 mt-1">Descanso: {ej.descanso}</p>
                          )}
                          {ej.observaciones && (
                            <p className="text-xs text-zinc-500 mt-1">{ej.observaciones}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sin ejercicios */}
                {entradaCalor.length === 0 && ejercicios.length === 0 && (
                  <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-zinc-500">
                    <p className="text-sm">Esta rutina no tiene ejercicios cargados.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 flex gap-3 shrink-0 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => setMostrarAsignar(true)}
              disabled={loading || !rutina}
              className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Asignar a alumnos
            </button>
          </div>
        </div>
      </div>

      {/* AsignarModal */}
      {mostrarAsignar && (
        <AsignarModal
          tipo="alumnos"
          items={alumnos.map((a) => ({ id: a.id, nombre: a.nombre }))}
          onClose={() => setMostrarAsignar(false)}
          onConfirm={handleAsignar}
        />
      )}
    </>
  );
}
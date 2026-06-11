

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type RegistroHistorial = {
  id: string;
  created_at?: string | null;
  peso_kg?: number | string | null;
  repeticiones?: number | string | null;
  rm_calculado?: number | string | null;
  rpe?: number | string | null;
  rir?: number | string | null;
};

type Props = {
  abierto: boolean;
  alumnoId?: string | null;
  ejercicioId?: string | null;
  nombreEjercicio?: string | null;
  onCerrar: () => void;
};

function fecha(valor?: string | null) {
  if (!valor) return "Sin fecha";
  return new Date(valor).toLocaleDateString("es-AR");
}

function numero(valor?: number | string | null) {
  if (valor === null || valor === undefined || valor === "") return "-";
  return Number(valor).toFixed(1).replace(".0", "");
}

export default function EjercicioHistorialModal({
  abierto,
  alumnoId,
  ejercicioId,
  nombreEjercicio,
  onCerrar,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [registros, setRegistros] = useState<RegistroHistorial[]>([]);

  useEffect(() => {
    if (!abierto || !alumnoId || !ejercicioId) return;
    cargarHistorial();
  }, [abierto, alumnoId, ejercicioId]);

  async function cargarHistorial() {
    if (!alumnoId || !ejercicioId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("registros_entrenamiento")
      .select("id,created_at,peso_kg,repeticiones,rm_calculado,rpe,rir")
      .eq("alumno_id", alumnoId)
      .eq("ejercicio_id", ejercicioId)
      .eq("completado", true)
      .order("created_at", { ascending: false })
      .limit(10);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setRegistros((data || []) as RegistroHistorial[]);
  }

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Historial del ejercicio</h2>
            <p className="mt-1 text-zinc-400">
              {nombreEjercicio || "Ejercicio seleccionado"}
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-5">
          {loading ? (
            <p className="text-zinc-400">Cargando historial...</p>
          ) : registros.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-zinc-400">
              Este alumno todavía no tiene registros para este ejercicio.
            </p>
          ) : (
            <div className="space-y-2">
              {registros.map((registro) => (
                <div
                  key={registro.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                >
                  <p className="text-sm font-semibold text-zinc-200">
                    {fecha(registro.created_at)}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {registro.peso_kg !== null && registro.peso_kg !== undefined && (
                      <span className="rounded-full bg-zinc-800 px-3 py-1">
                        Peso: {numero(registro.peso_kg)} kg
                      </span>
                    )}

                    {registro.repeticiones !== null &&
                      registro.repeticiones !== undefined && (
                        <span className="rounded-full bg-zinc-800 px-3 py-1">
                          Reps: {numero(registro.repeticiones)}
                        </span>
                      )}

                    {registro.rm_calculado !== null &&
                      registro.rm_calculado !== undefined && (
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400">
                          RM: {numero(registro.rm_calculado)} kg
                        </span>
                      )}

                    {registro.rpe !== null && registro.rpe !== undefined && (
                      <span className="rounded-full bg-zinc-800 px-3 py-1">
                        RPE: {numero(registro.rpe)}
                      </span>
                    )}

                    {registro.rir !== null && registro.rir !== undefined && (
                      <span className="rounded-full bg-zinc-800 px-3 py-1">
                        RIR: {numero(registro.rir)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
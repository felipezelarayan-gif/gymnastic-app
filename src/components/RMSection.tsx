"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  alumnoId: string;
};

type Ejercicio = {
  id: string;
  nombre: string;
};

type RMActual = {
  id: string;
  rm_calculado: number;
  ejercicio_id: string;
  ejercicios?: {
    nombre: string;
  };
};

export default function RMSection({ alumnoId }: Props) {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [rms, setRms] = useState<RMActual[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);

  const [ejercicioId, setEjercicioId] = useState("");
  const [peso, setPeso] = useState("");
  const [repeticiones, setRepeticiones] = useState("");

  useEffect(() => {
    cargarEjercicios();
    cargarRMs();
  }, []);

  async function cargarEjercicios() {
    const { data } = await supabase
      .from("ejercicios")
      .select("id,nombre")
      .order("nombre");

    setEjercicios(data || []);
  }

  async function cargarRMs() {
    const { data } = await supabase
      .from("rms_actuales")
      .select(`
        *,
        ejercicios (
          nombre
        )
      `)
      .eq("alumno_id", alumnoId);

    setRms(data || []);
  }

  function calcularEpley(
    pesoKg: number,
    reps: number
  ) {
    return Number(
      (
        pesoKg *
        (1 + reps / 30)
      ).toFixed(2)
    );
  }

  async function guardarRM() {
    if (!ejercicioId || !peso || !repeticiones) {
      alert("Completá todos los campos");
      return;
    }

    const pesoNumero = Number(peso);
    const repsNumero = Number(repeticiones);

    const rmCalculado = calcularEpley(
      pesoNumero,
      repsNumero
    );

    await supabase
      .from("rms_historial")
      .insert({
        alumno_id: alumnoId,
        ejercicio_id: ejercicioId,
        peso_kg: pesoNumero,
        repeticiones: repsNumero,
        rm_calculado: rmCalculado,
        origen: "manual",
      });

    const { data: existente } = await supabase
      .from("rms_actuales")
      .select("*")
      .eq("alumno_id", alumnoId)
      .eq("ejercicio_id", ejercicioId)
      .maybeSingle();

    if (!existente) {
      await supabase
        .from("rms_actuales")
        .insert({
          alumno_id: alumnoId,
          ejercicio_id: ejercicioId,
          peso_kg: pesoNumero,
          repeticiones: repsNumero,
          rm_calculado: rmCalculado,
        });
    } else {
      if (
        rmCalculado >
        Number(existente.rm_calculado || 0)
      ) {
        await supabase
          .from("rms_actuales")
          .update({
            peso_kg: pesoNumero,
            repeticiones: repsNumero,
            rm_calculado: rmCalculado,
            actualizado_en: new Date(),
          })
          .eq("id", existente.id);
      }
    }

    setMostrarModal(false);
    setPeso("");
    setRepeticiones("");
    setEjercicioId("");

    cargarRMs();
  }

  return (
    <>
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            RM
          </h2>

          <button
            onClick={() => setMostrarModal(true)}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white"
          >
            + Registrar marca
          </button>
        </div>

        {rms.length === 0 ? (
          <p className="text-zinc-400">
            Sin registros todavía.
          </p>
        ) : (
          <div className="space-y-2">
            {rms.map((rm) => (
              <div
                key={rm.id}
                className="flex justify-between border-b border-zinc-800 pb-2"
              >
                <span>
                  {rm.ejercicios?.nombre}
                </span>

                <span className="font-semibold">
                  {rm.rm_calculado} kg
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 w-full max-w-md">

            <h2 className="text-xl font-bold mb-4">
              Registrar RM
            </h2>

            <div className="space-y-3">

              <select
                value={ejercicioId}
                onChange={(e) =>
                  setEjercicioId(e.target.value)
                }
                className="w-full bg-zinc-800 rounded-xl p-3"
              >
                <option value="">
                  Seleccionar ejercicio
                </option>

                {ejercicios.map((ejercicio) => (
                  <option
                    key={ejercicio.id}
                    value={ejercicio.id}
                  >
                    {ejercicio.nombre}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Peso (kg)"
                value={peso}
                onChange={(e) =>
                  setPeso(e.target.value)
                }
                className="w-full bg-zinc-800 rounded-xl p-3"
              />

              <input
                type="number"
                placeholder="Repeticiones"
                value={repeticiones}
                onChange={(e) =>
                  setRepeticiones(e.target.value)
                }
                className="w-full bg-zinc-800 rounded-xl p-3"
              />

            </div>

            <div className="flex gap-3 mt-5">

              <button
                onClick={() =>
                  setMostrarModal(false)
                }
                className="flex-1 border border-zinc-700 rounded-xl py-3"
              >
                Cancelar
              </button>

              <button
                onClick={guardarRM}
                className="flex-1 bg-emerald-500 rounded-xl py-3 font-semibold"
              >
                Guardar
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
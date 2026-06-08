"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type RMActual = {
  id: string;
  alumno_id: string;
  ejercicio_id: string;
  peso_kg?: number | string | null;
  repeticiones?: number | string | null;
  rm_calculado?: number | string | null;
  actualizado_en?: string | null;
};

type RMHistorial = {
  id: string;
  alumno_id: string;
  ejercicio_id: string;
  peso_kg?: number | string | null;
  repeticiones?: number | string | null;
  rm_calculado?: number | string | null;
  fecha?: string | null;
  created_at?: string | null;
  origen?: string | null;
};

type EjercicioNombre = {
  ejercicio_id: string;
  nombre_ejercicio: string;
};

type Props = {
  alumnoId: string;
};

function formatoFecha(fecha?: string | null) {
  if (!fecha) return "Sin fecha";
  return new Date(fecha).toLocaleDateString("es-AR");
}

function numero(valor?: number | string | null) {
  if (valor === null || valor === undefined || valor === "") return "-";
  return Number(valor).toFixed(1).replace(".0", "");
}

export default function AlumnoRMProfesor({ alumnoId }: Props) {
  const [loading, setLoading] = useState(true);
  const [rmsActuales, setRmsActuales] = useState<RMActual[]>([]);
  const [historial, setHistorial] = useState<RMHistorial[]>([]);
  const [nombres, setNombres] = useState<EjercicioNombre[]>([]);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [mostrarCantidad, setMostrarCantidad] = useState(5);

  useEffect(() => {
    cargarRM();
  }, [alumnoId]);

  async function cargarRM() {
    setLoading(true);

    const { data: actualesData, error: actualesError } = await supabase
      .from("rms_actuales")
      .select("*")
      .eq("alumno_id", alumnoId)
      .order("actualizado_en", { ascending: false });

    if (actualesError) {
      alert(actualesError.message);
      setLoading(false);
      return;
    }

    const { data: historialData, error: historialError } = await supabase
      .from("rms_historial")
      .select("*")
      .eq("alumno_id", alumnoId)
      .order("fecha", { ascending: false });

    if (historialError) {
      alert(historialError.message);
      setLoading(false);
      return;
    }

    const ejercicioIds = Array.from(
      new Set(
        [
          ...(actualesData || []).map((item) => item.ejercicio_id),
          ...(historialData || []).map((item) => item.ejercicio_id),
        ].filter(Boolean)
      )
    );

    let nombresData: EjercicioNombre[] = [];

    if (ejercicioIds.length > 0) {
      const { data: rutinaEjerciciosData } = await supabase
        .from("rutina_ejercicios")
        .select("ejercicio_id,nombre_ejercicio")
        .in("ejercicio_id", ejercicioIds);

      const mapa = new Map<string, string>();

      (rutinaEjerciciosData || []).forEach((item) => {
        if (item.ejercicio_id && item.nombre_ejercicio) {
          mapa.set(item.ejercicio_id, item.nombre_ejercicio);
        }
      });

      nombresData = Array.from(mapa.entries()).map(
        ([ejercicio_id, nombre_ejercicio]) => ({
          ejercicio_id,
          nombre_ejercicio,
        })
      );
    }

    setRmsActuales((actualesData || []) as RMActual[]);
    setHistorial((historialData || []) as RMHistorial[]);
    setNombres(nombresData);
    setLoading(false);
  }

  function nombreEjercicio(ejercicioId: string) {
    const encontrado = nombres.find((item) => item.ejercicio_id === ejercicioId);
    return encontrado?.nombre_ejercicio || "Ejercicio sin nombre";
  }

  function historialPorEjercicio(ejercicioId: string) {
    return historial.filter((item) => item.ejercicio_id === ejercicioId);
  }

  async function recalcularRMActual(ejercicioId: string) {
    const { data: historialEjercicio, error } = await supabase
      .from("rms_historial")
      .select("*")
      .eq("alumno_id", alumnoId)
      .eq("ejercicio_id", ejercicioId)
      .order("rm_calculado", { ascending: false })
      .limit(1);

    if (error) {
      alert(error.message);
      return;
    }

    const mejor = historialEjercicio?.[0];

    if (!mejor) {
      await supabase
        .from("rms_actuales")
        .delete()
        .eq("alumno_id", alumnoId)
        .eq("ejercicio_id", ejercicioId);

      return;
    }

    const { data: existente } = await supabase
      .from("rms_actuales")
      .select("id")
      .eq("alumno_id", alumnoId)
      .eq("ejercicio_id", ejercicioId)
      .maybeSingle();

    if (!existente) {
      await supabase.from("rms_actuales").insert({
        alumno_id: alumnoId,
        ejercicio_id: ejercicioId,
        peso_kg: mejor.peso_kg,
        repeticiones: mejor.repeticiones,
        rm_calculado: mejor.rm_calculado,
        actualizado_en: new Date().toISOString(),
      });
    } else {
      await supabase
        .from("rms_actuales")
        .update({
          peso_kg: mejor.peso_kg,
          repeticiones: mejor.repeticiones,
          rm_calculado: mejor.rm_calculado,
          actualizado_en: new Date().toISOString(),
        })
        .eq("id", existente.id);
    }
  }

  async function borrarRegistro(historialItem: RMHistorial) {
    const confirmar = confirm("¿Querés borrar este registro de RM?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("rms_historial")
      .delete()
      .eq("id", historialItem.id);

    if (error) {
      alert(error.message);
      return;
    }

    await recalcularRMActual(historialItem.ejercicio_id);
    await cargarRM();
  }

  const rmsVisibles = useMemo(
    () => rmsActuales.slice(0, mostrarCantidad),
    [rmsActuales, mostrarCantidad]
  );

  if (loading) {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-5">
        <p className="text-zinc-400">Cargando RM...</p>
      </section>
    );
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold">🏆 Récords Máximos (RM)</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Se muestran solo récords nuevos o registros cargados desde evaluaciones.
          </p>
        </div>
      </div>

      {rmsActuales.length === 0 ? (
        <p className="text-zinc-400">
          Este alumno todavía no tiene marcas registradas.
        </p>
      ) : (
        <div className="space-y-3">
          {rmsVisibles.map((rm) => {
            const abierto = !!abiertos[rm.ejercicio_id];
            const historialEjercicio = historialPorEjercicio(rm.ejercicio_id);

            return (
              <div
                key={rm.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {nombreEjercicio(rm.ejercicio_id)}
                    </h3>

                    <p className="text-sm text-zinc-400 mt-1">
                      Último registro: {formatoFecha(rm.actualizado_en)}
                    </p>

                    <p className="text-sm text-zinc-500">
                      {numero(rm.peso_kg)} kg x {numero(rm.repeticiones)} reps
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-3xl font-bold text-emerald-400">
                      {numero(rm.rm_calculado)} kg
                    </p>

                    <div className="flex gap-2 mt-3 md:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setAbiertos((actual) => ({
                            ...actual,
                            [rm.ejercicio_id]: !actual[rm.ejercicio_id],
                          }))
                        }
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        {abierto ? "Ocultar evolución" : "Ver evolución"}
                      </button>
                    </div>
                  </div>
                </div>

                {abierto && (
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    {historialEjercicio.length === 0 ? (
                      <p className="text-zinc-500 text-sm">
                        Sin registros históricos.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {historialEjercicio.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 p-3"
                          >
                            <div>
                              <p className="text-sm font-semibold">
                                {numero(item.rm_calculado)} kg
                              </p>
                              <p className="text-xs text-zinc-500">
                                {formatoFecha(item.fecha || item.created_at)} ·{" "}
                                {numero(item.peso_kg)} kg x{" "}
                                {numero(item.repeticiones)} reps ·{" "}
                                {item.origen || "entrenamiento"}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => borrarRegistro(item)}
                              className="rounded-lg border border-red-800 px-3 py-2 text-xs text-red-400 hover:bg-red-950"
                            >
                              Borrar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {mostrarCantidad < rmsActuales.length && (
            <button
              type="button"
              onClick={() => setMostrarCantidad(mostrarCantidad + 5)}
              className="w-full rounded-xl border border-zinc-700 py-3 text-zinc-300 hover:bg-zinc-800"
            >
              Mostrar más
            </button>
          )}
        </div>
      )}
    </section>
  );
}
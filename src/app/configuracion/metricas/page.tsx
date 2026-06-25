"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MetricaProfesor = {
  profesorId: string;
  nombre: string;
  email: string;
  totalAlumnos: number;
  alumnosActivos: number;
};

type MetricasAdminCache = {
  metricas: MetricaProfesor[];
  savedAt: string;
};

const METRICAS_ADMIN_CACHE_KEY = "config_metricas_admin_profesores_v1";

export default function MetricasConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<MetricaProfesor[]>([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);

  useEffect(() => {
    cargarMetricas();
  }, []);

  function cargarMetricasDesdeCache() {
    try {
      const cacheRaw = localStorage.getItem(METRICAS_ADMIN_CACHE_KEY);
      if (!cacheRaw) return;

      const cache = JSON.parse(cacheRaw) as MetricasAdminCache;
      if (!cache.metricas) return;

      setMetricas(cache.metricas);
      setUltimaActualizacion(cache.savedAt || null);
      setLoading(false);
    } catch {
      // Si el cache falla, seguimos cargando desde Supabase.
    }
  }

  function guardarMetricasEnCache(metricasActualizadas: MetricaProfesor[]) {
    try {
      const cache: MetricasAdminCache = {
        metricas: metricasActualizadas,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(METRICAS_ADMIN_CACHE_KEY, JSON.stringify(cache));
      setUltimaActualizacion(cache.savedAt);
    } catch {
      // Si localStorage falla, la pantalla debe seguir funcionando normal.
    }
  }

  async function cargarMetricas() {
    setLoading(true);
    cargarMetricasDesdeCache();

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!sessionData.session || !token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch("/api/admi/metricas-profesores", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "No se pudieron cargar las métricas.");
      setLoading(false);
      if (response.status === 401) {
        window.location.href = "/login";
      }
      if (response.status === 403) {
        window.location.href = "/configuracion";
      }
      return;
    }

    const metricasCalculadas = (data.metricas || []) as MetricaProfesor[];

    setMetricas(metricasCalculadas);
    guardarMetricasEnCache(metricasCalculadas);
    setLoading(false);
  }

  const totalGeneralAlumnos = useMemo(
    () => metricas.reduce((total, item) => total + item.totalAlumnos, 0),
    [metricas]
  );

  const totalGeneralAlumnosActivos = useMemo(
    () => metricas.reduce((total, item) => total + item.alumnosActivos, 0),
    [metricas]
  );

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-zinc-400">Configuración</p>
            <h1 className="text-2xl sm:text-3xl font-bold">📊 Métricas de profesores</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Resumen administrativo de alumnos por profesor.
            </p>
          </div>

          <Link
            href="/configuracion"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-900"
          >
            Volver a configuración
          </Link>
        </header>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-xl font-semibold mb-4">Métricas administrativas</h2>
          {ultimaActualizacion && (
            <p className="text-xs text-zinc-500 mb-4">
              Última actualización cacheada: {new Date(ultimaActualizacion).toLocaleString("es-AR")}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-zinc-400">Cargando métricas...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">Total alumnos</p>
                  <p className="text-3xl font-bold mt-1">{totalGeneralAlumnos}</p>
                  <p className="text-xs text-zinc-500 mt-1">Todos los profesores</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">Alumnos activos</p>
                  <p className="text-3xl font-bold mt-1">{totalGeneralAlumnosActivos}</p>
                  <p className="text-xs text-zinc-500 mt-1">Con rutina asignada en los últimos 30 días</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-400">Profesores</p>
                  <p className="text-3xl font-bold mt-1">{metricas.length}</p>
                  <p className="text-xs text-zinc-500 mt-1">Con rol profe</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-950 text-zinc-400">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Profesor</th>
                      <th className="text-left px-4 py-3 font-medium">Email</th>
                      <th className="text-right px-4 py-3 font-medium">Total alumnos</th>
                      <th className="text-right px-4 py-3 font-medium">Alumnos activos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.map((item) => (
                      <tr key={item.profesorId} className="border-t border-zinc-800">
                        <td className="px-4 py-3 font-medium">{item.nombre}</td>
                        <td className="px-4 py-3 text-zinc-400">{item.email}</td>
                        <td className="px-4 py-3 text-right font-semibold">{item.totalAlumnos}</td>
                        <td className="px-4 py-3 text-right font-semibold">{item.alumnosActivos}</td>
                      </tr>
                    ))}

                    {metricas.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                          No hay profesores para mostrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
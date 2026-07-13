"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";
import SkeletonEvaluaciones from "@/components/SkeletonEvaluaciones";
import EvaluacionPendienteList from "@/components/EvaluacionPendienteList";
import { useToast } from "@/components/ui/ToastProvider";

type EvaluacionPendiente = {
  id: string;
  alumno_id: string;
  profesor_id?: string | null;
  alumno_nombre: string;
  fecha_asignacion: string | null;
  observaciones: string | null;
  cantidad_items: number;
};

type TipoEvaluacion = "rm" | "fms";

const CONFIG: Record<TipoEvaluacion, {
  tabla: string;
  tablaResultados: string;
  columnaResultados: string;
  labelItems: string;
  titulo: string;
  descripcion: string;
  emoji: string;
}> = {
  rm: {
    tabla: "evaluaciones_rm",
    tablaResultados: "evaluaciones_rm_resultados",
    columnaResultados: "evaluacion_rm_id",
    labelItems: "ejercicios",
    titulo: "⚡ Evaluaciones RM pendientes",
    descripcion: "Elegí una evaluación pendiente para cargarla. Los ejercicios y el protocolo se cargan recién al entrar.",
    emoji: "✅",
  },
  fms: {
    tabla: "evaluaciones_fms",
    tablaResultados: "evaluaciones_fms_tests",
    columnaResultados: "evaluacion_fms_id",
    labelItems: "tests",
    titulo: "Evaluaciones FMS pendientes",
    descripcion: "Elegí una evaluación pendiente para cargar los 7 patrones de movimiento.",
    emoji: "OK",
  },
};

export default function RealizarEvaluacionesPage() {
  return (
    <Suspense fallback={<SkeletonEvaluaciones />}>
      <RealizarEvaluacionesContent />
    </Suspense>
  );
}

function RealizarEvaluacionesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipo = searchParams.get("tipo") as TipoEvaluacion | null;
  const { mostrarToast } = useToast();

  const [evaluaciones, setEvaluaciones] = useState<EvaluacionPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [profesorId, setProfesorId] = useState<string | null>(null);

  useEffect(() => {
    if (!tipo) {
      setLoading(false);
      return;
    }

    const config = CONFIG[tipo];

    async function cargarEvaluacionesPendientes() {
      const { data: sessionData } = await supabase.auth.getSession();
      const profesorActualId = sessionData.session?.user.id;

      if (!profesorActualId) {
        mostrarToast("No se pudo identificar al profesor.", "error");
        router.push("/login");
        return;
      }

      setProfesorId(profesorActualId);

      const { data: evaluacionesData, error: evaluacionesError } = await supabase
        .from(config.tabla)
        .select("id, alumno_id, profesor_id, fecha_asignacion, observaciones")
        .eq("estado", "pendiente")
        .eq("profesor_id", profesorActualId)
        .is("deleted_at", null)
        .order("fecha_asignacion", { ascending: true });

      if (evaluacionesError) {
        mostrarToast(evaluacionesError.message, "error");
        setLoading(false);
        return;
      }

      const evaluacionesBase = evaluacionesData || [];

      if (evaluacionesBase.length === 0) {
        setEvaluaciones([]);
        setLoading(false);
        return;
      }

      const alumnoIds = Array.from(
        new Set(evaluacionesBase.map((evaluacion) => evaluacion.alumno_id).filter(Boolean))
      );
      const evaluacionIds = evaluacionesBase.map((evaluacion) => evaluacion.id);

      const [{ data: alumnosData, error: alumnosError }, { data: resultadosData, error: resultadosError }] = await Promise.all([
        supabase.from("alumnos").select("id, nombre, profesor_id").in("id", alumnoIds).eq("profesor_id", profesorActualId),
        supabase.from(config.tablaResultados).select(config.columnaResultados).in(config.columnaResultados, evaluacionIds),
      ]);

      if (alumnosError) {
        mostrarToast(alumnosError.message, "error");
        setLoading(false);
        return;
      }

      if (resultadosError) {
        mostrarToast(resultadosError.message, "error");
        setLoading(false);
        return;
      }

      const alumnosPorId = new Map((alumnosData || []).map((alumno) => [alumno.id, alumno.nombre]));
      const cantidadPorEvaluacion = new Map<string, number>();

      (resultadosData || []).forEach((resultado) => {
        const evaluacionId = resultado[config.columnaResultados as keyof typeof resultado] as string;
        cantidadPorEvaluacion.set(
          evaluacionId,
          (cantidadPorEvaluacion.get(evaluacionId) || 0) + 1
        );
      });

      setEvaluaciones(
        evaluacionesBase.map((evaluacion) => ({
          id: evaluacion.id,
          alumno_id: evaluacion.alumno_id,
          profesor_id: evaluacion.profesor_id,
          alumno_nombre: alumnosPorId.get(evaluacion.alumno_id) || "Alumno sin nombre",
          fecha_asignacion: evaluacion.fecha_asignacion,
          observaciones: evaluacion.observaciones,
          cantidad_items: cantidadPorEvaluacion.get(evaluacion.id) || 0,
        }))
      );

      setLoading(false);
    }

    cargarEvaluacionesPendientes();
  }, [tipo, router, mostrarToast]);

  async function borrarEvaluacion(evaluacionId: string) {
    if (!tipo) return;
    const config = CONFIG[tipo];

    const confirmar = window.confirm(
      `⚠️ Esta acción eliminará permanentemente la evaluación ${tipo.toUpperCase()} y todos sus registros asociados.\n\nEsta acción no se puede deshacer.\n\n¿Deseás continuar?`
    );

    if (!confirmar) return;

    setBorrandoId(evaluacionId);

    if (!profesorId) {
      mostrarToast("No se pudo validar el profesor actual.", "error");
      setBorrandoId(null);
      return;
    }

    const { data: evaluacionPropia, error: evaluacionPropiaError } = await supabase
      .from(config.tabla)
      .select("id")
      .eq("id", evaluacionId)
      .eq("profesor_id", profesorId)
      .maybeSingle();

    if (evaluacionPropiaError) {
      mostrarToast(evaluacionPropiaError.message, "error");
      setBorrandoId(null);
      return;
    }

    if (!evaluacionPropia) {
      mostrarToast("No tenés permiso para borrar esta evaluación.", "error");
      setBorrandoId(null);
      return;
    }

    const { error: resultadosError } = await supabase
      .from(config.tablaResultados)
      .delete()
      .eq(config.columnaResultados, evaluacionId);

    if (resultadosError) {
      mostrarToast(resultadosError.message, "error");
      setBorrandoId(null);
      return;
    }

    const { error: evaluacionError } = await supabase
      .from(config.tabla)
      .delete()
      .eq("id", evaluacionId)
      .eq("profesor_id", profesorId);

    if (evaluacionError) {
      mostrarToast(evaluacionError.message, "error");
      setBorrandoId(null);
      return;
    }

    setEvaluaciones((prev) => prev.filter((evaluacion) => evaluacion.id !== evaluacionId));
    setBorrandoId(null);
  }

  if (!tipo) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <BackButton fallback="/evaluaciones" />
          </div>
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Realizar evaluaciones</h1>
            <p className="text-zinc-400 mt-2">Seleccioná el tipo de evaluación que querés realizar.</p>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/evaluaciones/realizar?tipo=rm"
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 hover:border-zinc-700 transition"
            >
              <h2 className="text-xl font-semibold">⚡ Test RM</h2>
              <p className="text-zinc-400 mt-2 text-sm">Evaluaciones de repetición máxima pendientes.</p>
            </Link>
            <Link
              href="/evaluaciones/realizar?tipo=fms"
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 hover:border-zinc-700 transition"
            >
              <h2 className="text-xl font-semibold">🎯 Test FMS</h2>
              <p className="text-zinc-400 mt-2 text-sm">Evaluaciones de movimiento funcional pendientes.</p>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return <SkeletonEvaluaciones />;
  }

  const config = CONFIG[tipo];

  const evaluacionesParaLista = evaluaciones.map((e) => ({
    id: e.id,
    alumno_nombre: e.alumno_nombre,
    fecha_asignacion: e.fecha_asignacion,
    observaciones: e.observaciones,
    cantidad_items: e.cantidad_items,
    label_items: config.labelItems,
  }));

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <BackButton fallback="/evaluaciones/realizar" />
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold">{config.titulo}</h1>
          <p className="text-zinc-400 mt-2">{config.descripcion}</p>
        </header>

        <EvaluacionPendienteList
          evaluaciones={evaluacionesParaLista}
          tipo={tipo}
          borrandoId={borrandoId}
          emptyEmoji={config.emoji}
          emptyTitulo={`No hay evaluaciones ${tipo.toUpperCase()} pendientes`}
          onBorrar={borrarEvaluacion}
        />
      </div>
    </main>
  );
}
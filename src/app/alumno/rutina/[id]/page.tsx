

"use client";

import { useParams } from "next/navigation";
import RutinaEntrenamientoView from "@/components/rutinas/RutinaEntrenamientoView";

export default function AlumnoNuevaRutinaPage() {
  const params = useParams<{ id: string }>();
  const asignacionId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  if (!asignacionId) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <h1 className="text-lg font-semibold">Rutina no encontrada</h1>
          <p className="mt-2 text-sm text-zinc-500">
            No se pudo identificar la rutina asignada.
          </p>
        </div>
      </main>
    );
  }

  return (
    <RutinaEntrenamientoView
      asignacionId={asignacionId}
      modo="alumno"
    />
  );
}
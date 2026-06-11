export default function EvaluacionesPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Evaluaciones</h1>

        <div className="rounded-2xl border-2 border-yellow-500/30 bg-yellow-500/5 p-8 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-3">
            Funcionalidad no disponible
          </h2>
          <p className="text-zinc-300 text-lg">
            Las evaluaciones (FMS, RM, tests físicos) estarán disponibles próximamente.
          </p>
          <p className="text-zinc-400 mt-3 text-sm">
            Estamos trabajando para traerte esta funcionalidad.
          </p>
        </div>
      </div>
    </main>
  );
}
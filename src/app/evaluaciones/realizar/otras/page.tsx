"use client";

export default function RealizarOtrasProximamente() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">

        <div className="text-6xl mb-6">🚧</div>

        <h1 className="text-3xl font-bold mb-3">Próximamente</h1>

        <p className="text-zinc-400 leading-relaxed mb-8">
          Estamos trabajando en el módulo de otras evaluaciones. Próximamente vas a poder registrar{" "}
          <span className="text-zinc-200">tests físicos</span>,{" "}
          <span className="text-zinc-200">evaluaciones morfológicas</span>,{" "}
          <span className="text-zinc-200">tests posturales</span> y cualquier evaluación personalizada.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Lo que viene</p>
          <ul className="space-y-2 text-sm text-zinc-400">
            {[
              "Tests de resistencia (Cooper, Course Navette)",
              "Evaluaciones morfológicas (peso, talla, IMC, pliegues)",
              "Tests de flexibilidad (Sit & Reach, Thomas)",
              "Evaluaciones posturales",
              "Protocolos personalizados",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-zinc-700 mt-0.5">○</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <a
          href="/evaluaciones"
          className="inline-block border border-zinc-700 text-zinc-300 px-6 py-3 rounded-lg hover:bg-zinc-800 transition"
        >
          ← Volver a evaluaciones
        </a>
      </div>
    </main>
  );
}

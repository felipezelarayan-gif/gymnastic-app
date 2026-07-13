export default function SkeletonEvaluaciones() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto animate-pulse">
        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-4 w-20 rounded bg-zinc-800" />
        </div>

        {/* Header skeleton */}
        <div className="mb-10">
          <div className="h-8 w-64 rounded bg-zinc-800 mb-3" />
          <div className="h-4 w-full max-w-xl rounded bg-zinc-800/60" />
        </div>

        {/* Section title skeleton */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-3 w-32 rounded bg-zinc-800" />
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Grid of cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
          <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
          <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
        </div>

        {/* Second section title skeleton */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-3 w-40 rounded bg-zinc-800" />
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Second grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
          <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
          <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
        </div>
      </div>
    </main>
  );
}
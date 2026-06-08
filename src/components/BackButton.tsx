"use client";

export default function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 transition"
    >
      ← Atrás
    </button>
  );
}
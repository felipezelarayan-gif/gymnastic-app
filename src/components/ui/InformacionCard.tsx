export const APP_VERSION = "3.0.0";
export const LAST_UPDATE = "19/07/2026";

export default function InformacionCard() {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-4">
      <h2 className="text-xl font-semibold mb-3">📄 Información</h2>
      <p className="text-zinc-300">Versión {APP_VERSION}</p>
      <p className="text-zinc-400 mt-1">
        Última actualización: {LAST_UPDATE}
      </p>
    </section>
  );
}
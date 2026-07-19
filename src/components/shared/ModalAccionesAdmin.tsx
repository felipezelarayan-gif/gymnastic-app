"use client";

type Accion = {
  id: string;
  icono: string;
  titulo: string;
  descripcion: string;
  color: "blue" | "yellow" | "red" | "purple";
  onClick: () => void;
  disabled?: boolean;
};

type ModalAccionesAdminProps = {
  abierto: boolean;
  onCerrar: () => void;
  titulo?: string;
  acciones: Accion[];
  error?: string | null;
};

const colores = {
  blue: { borde: "border-blue-800", hover: "hover:bg-blue-950/30", texto: "text-blue-400" },
  yellow: { borde: "border-yellow-800", hover: "hover:bg-yellow-950/30", texto: "text-yellow-400" },
  red: { borde: "border-red-800", hover: "hover:bg-red-950/30", texto: "text-red-400" },
  purple: { borde: "border-purple-800", hover: "hover:bg-purple-950/30", texto: "text-purple-400" },
};

export default function ModalAccionesAdmin({
  abierto,
  onCerrar,
  titulo = "⚙️ Acciones",
  acciones,
  error,
}: ModalAccionesAdminProps) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold">{titulo}</h3>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 bg-red-950/50 border border-red-800 rounded-xl p-3">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {acciones.map((accion) => {
            const color = colores[accion.color];
            return (
              <button
                key={accion.id}
                type="button"
                onClick={accion.onClick}
                disabled={accion.disabled}
                className={`w-full flex items-center gap-4 rounded-xl border ${color.borde} bg-zinc-950 p-4 text-left ${color.hover} transition disabled:opacity-50`}
              >
                <span className="text-2xl">{accion.icono}</span>
                <div>
                  <p className={`font-semibold ${color.texto}`}>{accion.titulo}</p>
                  <p className="text-xs text-zinc-500">{accion.descripcion}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
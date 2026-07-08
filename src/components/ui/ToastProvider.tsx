"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastTipo = "exito" | "error" | "info";

type Toast = {
  id: string;
  mensaje: string;
  tipo: ToastTipo;
};

type ToastContextType = {
  mostrarToast: (mensaje: string, tipo?: ToastTipo) => void;
};

const ToastContext = createContext<ToastContextType>({
  mostrarToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mostrarToast = useCallback((mensaje: string, tipo: ToastTipo = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nuevoToast: Toast = { id, mensaje, tipo };

    setToasts((prev) => [...prev, nuevoToast]);

    // Solo auto-dismiss si no es error
    if (tipo !== "error") {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }
  }, []);

  function cerrarToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}

      {/* Container de toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => {
          const estilos =
            toast.tipo === "exito"
              ? "border-emerald-700/50 bg-emerald-950/90 text-emerald-200"
              : toast.tipo === "error"
                ? "border-red-700/50 bg-red-950/90 text-red-200"
                : "border-zinc-700/50 bg-zinc-950/90 text-zinc-200";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm min-w-[280px] max-w-[400px] animate-in slide-in-from-right ${estilos}`}
            >
              <span className="text-lg shrink-0 mt-0.5">
                {toast.tipo === "exito" ? "✅" : toast.tipo === "error" ? "⚠️" : "ℹ️"}
              </span>
              <p className="text-sm flex-1">{toast.mensaje}</p>
              <button
                type="button"
                onClick={() => cerrarToast(toast.id)}
                className="text-sm opacity-60 hover:opacity-100 transition-opacity shrink-0"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
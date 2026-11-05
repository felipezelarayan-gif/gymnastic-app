"use client";

import type { ReactNode } from "react";

type RutinaEjercicioModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  cancelLabel: string;
  saveLabel: string;
  savingLabel?: string;
  saving?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

export default function RutinaEjercicioModal({
  open,
  title,
  onClose,
  onSave,
  cancelLabel,
  saveLabel,
  savingLabel,
  saving = false,
  disabled = false,
  children,
}: RutinaEjercicioModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
      <div className="flex min-h-full items-start justify-center py-4">
        <div className="flex max-h-[90vh] w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="shrink-0 border-b border-zinc-800 p-6 pb-4">
            <h2 className="text-[1rem] font-bold">{title}</h2>
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto px-6 pb-4">
            {children}
          </div>

          <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-6 pt-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={disabled}
                className="flex-1 rounded-xl border border-zinc-700 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={disabled}
                className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && savingLabel ? savingLabel : saveLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

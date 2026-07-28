"use client";

import { useRouter } from "next/navigation";
import { useIdioma } from "@/lib/i18n-context";

interface BackButtonProps {
  fallback?: string;
  children?: React.ReactNode;
}

export default function BackButton({ fallback = "/", children }: BackButtonProps) {
  const router = useRouter();
  const { t } = useIdioma();

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 2) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 transition"
    >
      {children || t("common.atrasBtn")}
    </button>
  );
}

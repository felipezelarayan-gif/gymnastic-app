"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RealizarFMSOld() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/evaluaciones/realizar?tipo=fms");
  }, [router]);
  return null;
}
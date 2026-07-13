"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RealizarRMOld() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/evaluaciones/realizar?tipo=rm");
  }, [router]);
  return null;
}
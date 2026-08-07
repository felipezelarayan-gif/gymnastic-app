"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";

export type ProfeDisponible = {
  id: string;
  nombre: string | null;
  email: string | null;
  tipo: string;
};

export type AccionAlumno = {
  id: string;
  icono: string;
  titulo: string;
  descripcion: string;
  color: "blue" | "yellow" | "red";
  onClick: () => void;
  disabled?: boolean;
};

type AlumnoBase = {
  id: string;
  activo?: boolean | null;
};

export function useAccionesAlumno(alumnoId: string, alumno: AlumnoBase | null, onCambio?: () => void) {
  const { t } = useIdioma();
  const { mostrarToast } = useToast();

  const [mostrarAcciones, setMostrarAcciones] = useState(false);
  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [mostrarConfirmarBorrar, setMostrarConfirmarBorrar] = useState(false);
  const [profesoresDisponibles, setProfesoresDisponibles] = useState<ProfeDisponible[]>([]);
  const [profeSeleccionado, setProfeSeleccionado] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  async function cargarProfesoresDisponibles() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;

    const userId = sessionData.session.user.id;

    const { data: profeActual } = await supabase
      .from("profiles")
      .select("id, creado_por")
      .eq("id", userId)
      .maybeSingle();

    if (!profeActual) return;

    const disponibles: ProfeDisponible[] = [];
    const idsVistos = new Set<string>();

    const { data: soportes } = await supabase
      .from("profiles")
      .select("id, nombre, email")
      .eq("rol", "admin");

    if (soportes) {
      soportes.forEach((s) => {
        if (!idsVistos.has(s.id)) {
          idsVistos.add(s.id);
          disponibles.push({ id: s.id, nombre: s.nombre, email: s.email, tipo: "🛠️ Soporte" });
        }
      });
    }

    if (profeActual.creado_por) {
      const { data: admin } = await supabase
        .from("profiles")
        .select("id, nombre, email")
        .eq("id", profeActual.creado_por)
        .maybeSingle();

      if (admin && !idsVistos.has(admin.id)) {
        idsVistos.add(admin.id);
        disponibles.push({ id: admin.id, nombre: admin.nombre, email: admin.email, tipo: "👑 Mi admin" });
      }

      const { data: otrosProfes } = await supabase
        .from("profiles")
        .select("id, nombre, email")
        .eq("rol", "profe")
        .eq("creado_por", profeActual.creado_por)
        .neq("id", userId);

      if (otrosProfes) {
        otrosProfes.forEach((p) => {
          if (!idsVistos.has(p.id)) {
            idsVistos.add(p.id);
            disponibles.push({ id: p.id, nombre: p.nombre, email: p.email, tipo: "👨‍🏫 Hermano" });
          }
        });
      }
    }

    // Profesores creados por mí (hijos)
    const { data: misProfes } = await supabase
      .from("profiles")
      .select("id, nombre, email")
      .eq("rol", "profe")
      .eq("creado_por", userId);

    if (misProfes) {
      misProfes.forEach((p) => {
        if (!idsVistos.has(p.id)) {
          idsVistos.add(p.id);
          disponibles.push({ id: p.id, nombre: p.nombre, email: p.email, tipo: "👨‍🏫 Hijo" });
        }
      });
    }

    setProfesoresDisponibles(disponibles);
  }

  function abrirModalAcciones() {
    setMostrarAcciones(true);
    setErrorAccion(null);
    cargarProfesoresDisponibles();
  }

  async function transferirAlumno() {
    if (!profeSeleccionado) {
      mostrarToast(t("alumnos.seleccionarProfe"), "error");
      return;
    }

    setProcesando(true);
    setErrorAccion(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setErrorAccion("No autorizado.");
        setProcesando(false);
        return;
      }

      const res = await fetch("/api/transferir-alumno", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          alumnoId,
          nuevoProfesorId: profeSeleccionado,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al transferir");

      mostrarToast(t("alumnos.alumnoTransferido"), "exito");
      setMostrarTransferir(false);
      setMostrarAcciones(false);
      onCambio?.();
      return true;
    } catch (err: any) {
      setErrorAccion(err.message);
      return false;
    } finally {
      setProcesando(false);
    }
  }

  async function pausarAlumno() {
    setProcesando(true);
    setErrorAccion(null);

    const nuevoEstado = !alumno?.activo;

    const { error } = await supabase
      .from("alumnos")
      .update({ activo: nuevoEstado })
      .eq("id", alumnoId);

    setProcesando(false);

    if (error) {
      setErrorAccion(error.message);
      return false;
    }

    mostrarToast(
      nuevoEstado ? t("alumnos.alumnoReanudado") : t("alumnos.alumnoPausado"),
      "exito"
    );
    setMostrarAcciones(false);
    onCambio?.();
    return true;
  }

  async function borrarAlumno() {
    setProcesando(true);
    setErrorAccion(null);

    try {
      const res = await fetch("/api/borrar-alumno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alumnoId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al borrar el alumno.");
      }

      window.location.href = "/alumnos";
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al borrar el alumno.";
      setErrorAccion(msg);
      setProcesando(false);
      return false;
    }
  }

  const acciones: AccionAlumno[] = [
    {
      id: "transferir",
      icono: "🔄",
      titulo: t("alumnos.transferir"),
      descripcion: t("alumnos.transferirDesc"),
      color: "blue" as const,
      onClick: () => { setMostrarTransferir(true); setErrorAccion(null); },
    },
    {
      id: "pausar",
      icono: alumno?.activo === false ? "▶️" : "⏸️",
      titulo: alumno?.activo === false ? t("alumnos.reanudar") : t("alumnos.pausar"),
      descripcion: alumno?.activo === false
        ? t("alumnos.reanudarDesc")
        : t("alumnos.pausarDesc"),
      color: "yellow" as const,
      onClick: pausarAlumno,
      disabled: procesando,
    },
    {
      id: "borrar",
      icono: "🗑️",
      titulo: t("alumnos.borrarAlumno"),
      descripcion: t("alumnos.borrarAlumnoDesc"),
      color: "red" as const,
      onClick: () => { setMostrarConfirmarBorrar(true); setErrorAccion(null); },
    },
  ];

  return {
    mostrarAcciones,
    setMostrarAcciones,
    mostrarTransferir,
    setMostrarTransferir,
    mostrarConfirmarBorrar,
    setMostrarConfirmarBorrar,
    profesoresDisponibles,
    profeSeleccionado,
    setProfeSeleccionado,
    procesando,
    errorAccion,
    setErrorAccion,
    abrirModalAcciones,
    transferirAlumno,
    pausarAlumno,
    borrarAlumno,
    acciones,
  };
}
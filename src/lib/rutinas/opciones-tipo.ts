export type OpcionTipo = {
  label: string;
  objetivo: string | null;
  estructura: string | null;
  esPersonalizado?: boolean;
};

export const OPCIONES_TIPO: OpcionTipo[] = [
  { label: "Fuerza - Superior", objetivo: "Fuerza", estructura: "Miembros superiores" },
  { label: "Fuerza - Inferior", objetivo: "Fuerza", estructura: "Miembros inferiores" },
  { label: "Fuerza - Full body", objetivo: "Fuerza", estructura: "Full body" },
  { label: "Hipertrofia - Superior", objetivo: "Hipertrofia", estructura: "Miembros superiores" },
  { label: "Hipertrofia - Inferior", objetivo: "Hipertrofia", estructura: "Miembros inferiores" },
  { label: "Hipertrofia - Full body", objetivo: "Hipertrofia", estructura: "Full body" },
  { label: "HIIT", objetivo: "HIIT", estructura: null },
  { label: "Push", objetivo: null, estructura: "Push" },
  { label: "Pull", objetivo: null, estructura: "Pull" },
  { label: "Piernas", objetivo: null, estructura: "Piernas" },
  { label: "Core", objetivo: null, estructura: "Core" },
  { label: "Cardio / HIIT", objetivo: null, estructura: "Cardio / HIIT" },
  { label: "Otro", objetivo: null, estructura: null, esPersonalizado: true },
];
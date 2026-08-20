import { supabase } from "@/lib/supabase";

type EjercicioVideo = {
  id: string;
  youtube_url: string | null;
};

type EjercicioBasico = {
  id: string;
  nombre: string;
  nombre_es?: string | null;
  nombre_en?: string | null;
  grupo_muscular?: string;
};

let cacheVideos: EjercicioVideo[] | null = null;
let cacheBasicos: EjercicioBasico[] | null = null;

export async function getEjerciciosVideosCached(): Promise<EjercicioVideo[]> {
  if (cacheVideos) return cacheVideos;

  const { data, error } = await supabase
    .from("ejercicios")
    .select("id,youtube_url");

  if (error || !data || data.length === 0) {
    return [];
  }

  cacheVideos = data;
  return cacheVideos;
}

export async function getEjerciciosVideosPorIdsCached(
  ids: string[]
): Promise<EjercicioVideo[]> {
  if (ids.length === 0) return [];

  const videos = await getEjerciciosVideosCached();

  return videos.filter((v) => ids.includes(v.id));
}

export async function getEjerciciosBasicosCached(): Promise<EjercicioBasico[]> {
  if (cacheBasicos) return cacheBasicos;

  const { data, error } = await supabase
    .from("ejercicios")
    .select("id,nombre,nombre_es,nombre_en,grupo_muscular")
    .order("nombre");

  if (error || !data) {
    return [];
  }

  cacheBasicos = data.map((ejercicio) => ({
    id: ejercicio.id,
    nombre: ejercicio.nombre,
    nombre_es: ejercicio.nombre_es,
    nombre_en: ejercicio.nombre_en,
    grupo_muscular: ejercicio.grupo_muscular ?? undefined,
  }));
  return cacheBasicos;
}

export function invalidarEjerciciosCache() {
  cacheVideos = null;
  cacheBasicos = null;
}

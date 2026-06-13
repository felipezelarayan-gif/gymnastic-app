import { supabase } from "@/lib/supabase";

type EjercicioVideo = {
  id: string;
  youtube_url: string | null;
};

let cacheVideos: EjercicioVideo[] | null = null;

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

export function invalidarEjerciciosCache() {
  cacheVideos = null;
}

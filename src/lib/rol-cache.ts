import { supabase } from "@/lib/supabase";

type RolCache = {
  rol: string | null;
  userId: string | null;
};

let cache: RolCache | null = null;

export async function getRolCached(userId: string): Promise<string | null> {
  if (cache && cache.userId === userId) {
    return cache.rol;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", userId)
    .single();

  if (error || !data) {
    cache = { rol: null, userId };
    return null;
  }

  cache = { rol: data.rol, userId };
  return data.rol;
}

export function invalidarRolCache() {
  cache = null;
}
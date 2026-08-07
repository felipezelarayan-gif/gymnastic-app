import { supabase } from "@/lib/supabase";

export type AlumnoCacheado = {
  id: string;
  user_id: string | null;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  foto_url: string | null;
  activo: boolean | null;
};

type AlumnoCache = {
  alumno: AlumnoCacheado | null;
  userId: string | null;
};

// TTL de 10 minutos: los datos básicos del alumno rara vez cambian en ese lapso
const TTL_MS = 10 * 60 * 1000;
const LS_KEY = "alumno_cache_v1";

let cache: AlumnoCache | null = null;

function leerLocalStorage(userId: string): AlumnoCacheado | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.userId !== userId) return null;
    if (!parsed.alumno) return null;
    // TTL
    const guardadoEn = parsed.guardadoEn as number;
    if (Date.now() - guardadoEn > TTL_MS) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return parsed.alumno as AlumnoCacheado;
  } catch {
    return null;
  }
}

function guardarLocalStorage(userId: string, alumno: AlumnoCacheado) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ userId, alumno, guardadoEn: Date.now() })
    );
  } catch {
    // ignorar errores de localStorage (privacidad, cuota, etc.)
  }
}

export async function getAlumnoCached(userId: string): Promise<AlumnoCacheado | null> {
  // 1. Cache en memoria (misma sesión de navegación)
  if (cache && cache.userId === userId && cache.alumno) {
    return cache.alumno;
  }

  // 2. Cache en localStorage (entre visitas, con TTL)
  const fromLS = leerLocalStorage(userId);
  if (fromLS) {
    cache = { alumno: fromLS, userId };
    return fromLS;
  }

  // 3. Consulta a la DB
  const { data, error } = await supabase
    .from("alumnos")
    .select("id, user_id, nombre, apellido, email, foto_url, activo")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    cache = { alumno: null, userId };
    return null;
  }

  const alumno: AlumnoCacheado = {
    id: data.id,
    user_id: data.user_id,
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    foto_url: data.foto_url,
    activo: data.activo,
  };

  cache = { alumno, userId };
  guardarLocalStorage(userId, alumno);
  return alumno;
}

export function invalidarAlumnoCache() {
  cache = null;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignorar
  }
}
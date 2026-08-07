"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import { useIdioma } from "@/lib/i18n-context";

type Profile = {
  nombre: string;
  rol: string;
  foto_url?: string | null;
  es_admin?: boolean | null;
};

type HomePageCache = {
  profile: Profile;
  savedAt: string;
};

const HOME_CACHE_KEY = "home_page_cache_v1";

function cargarHomeDesdeCache(): Profile | null {
  try {
    const raw = localStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;

    const cache = JSON.parse(raw) as HomePageCache;
    if (!cache.profile?.nombre || !cache.profile?.rol) return null;

    return cache.profile;
  } catch {
    return null;
  }
}

function guardarHomeEnCache(profile: Profile) {
  try {
    const cache: HomePageCache = { profile, savedAt: new Date().toISOString() };
    localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignorar errores de localStorage
  }
}

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { mostrarToast } = useToast();
  const { t } = useIdioma();

  // Leer caché de localStorage después de la hidratación (solo cliente)
  useEffect(() => {
    const cached = cargarHomeDesdeCache();
    if (cached) {
      setProfile(cached);
      setLoading(false);
    }
  }, []);

  // Cargar perfil desde Supabase (solo si no se cargó desde caché)
  useEffect(() => {
    async function cargarPerfil() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        try { localStorage.removeItem(HOME_CACHE_KEY); } catch { /* ignore */ }
        router.push("/login");
        return;
      }

      const user = sessionData.session.user;

      const { data, error } = await supabase
        .from("profiles")
        .select("nombre, rol, foto_url, es_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        mostrarToast(error.message, "error");
        setLoading(false);
        return;
      }

      if (!data) {
        mostrarToast(t("errors.perfilNoEncontrado"), "error");
        setLoading(false);
        return;
      }

      if (data.rol === "alumno") {
        try { localStorage.removeItem(HOME_CACHE_KEY); } catch { /* ignore */ }
        router.push("/alumno");
        return;
      }

      if (data.rol === "admin") {
        try { localStorage.removeItem(HOME_CACHE_KEY); } catch { /* ignore */ }
        router.push("/soporte");
        return;
      }

      guardarHomeEnCache(data);
      setProfile(data);
      setLoading(false);
    }

    cargarPerfil();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-5xl mx-auto animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-full bg-zinc-800 shrink-0" />
            <div className="space-y-3">
              <div className="h-8 w-48 rounded bg-zinc-800" />
              <div className="h-4 w-32 rounded bg-zinc-800" />
            </div>
          </div>

          {/* Grid de cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
            <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
            <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
            <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
            <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
            <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
            <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800 md:col-span-3" />
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Gymnastic App</h1>

          <p className="mt-3 text-zinc-400">{t("home.noLogueado")}</p>

          <a href="/login" className="mt-4 inline-block underline">
            {t("home.irAlLogin")}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <img
            src={
              profile.foto_url ||
              "https://placehold.co/120x120/png?text=👤"
            }
            alt="Foto de perfil"
            className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"
          />

          <div>
            <h1 className="text-3xl font-bold">
              {profile.rol === "admin" ? t("home.tituloAdmin") : t("home.tituloProfe")}
            </h1>

            <p className="text-zinc-400 mt-1">
              {t("home.saludo", { nombre: profile.nombre })}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/alumnos"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
          >
            <h2 className="text-xl font-semibold">
              👥 {t("home.alumnos")}
            </h2>

            <p className="text-zinc-400 mt-2">
              {t("home.alumnosDesc")}
            </p>
          </a>

          <a
            href="/rutinas"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
          >
            <h2 className="text-xl font-semibold">
              📋 {t("home.rutinas")}
            </h2>

            <p className="text-zinc-400 mt-2">
              {t("home.rutinasDesc")}
            </p>
          </a>

          <a
            href="/profesor/registrar-entrenamientos"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
          >
            <h2 className="text-xl font-semibold">
              🏋️ {t("home.registrarEntrenamientos")}
            </h2>

            <p className="text-zinc-400 mt-2">
              {t("home.registrarEntrenamientosDesc")}
            </p>
          </a>

          <a
            href="/ejercicios"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
          >
            <h2 className="text-xl font-semibold">
              💪 {t("home.ejercicios")}
            </h2>

            <p className="text-zinc-400 mt-2">
              {t("home.ejerciciosDesc")}
            </p>
          </a>

          <a
            href="/historial"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
          >
            <h2 className="text-xl font-semibold">
              📈 {t("home.historial")}
            </h2>

            <p className="text-zinc-400 mt-2">
              {t("home.historialDesc")}
            </p>
          </a>

          <a
            href="/evaluaciones"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
          >
            <h2 className="text-xl font-semibold">
              📏 {t("home.evaluaciones")}
            </h2>

            <p className="text-zinc-400 mt-2">
              {t("home.evaluacionesDesc")}
            </p>
          </a>

          <a
            href="/mensajes"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition"
          >
            <h2 className="text-xl font-semibold">
              💬 {t("home.mensajes")}
            </h2>

            <p className="text-zinc-400 mt-2">
              {t("home.mensajesDesc")}
            </p>
          </a>

          <a
            href="/configuracion"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 hover:bg-zinc-800 transition md:col-span-3"
          >
            <h2 className="text-xl font-semibold">
              ⚙️ {t("home.configuracion")}
            </h2>

            <p className="text-zinc-400 mt-2">
              {t("home.configuracionDesc")}
            </p>
          </a>
        </section>
      </div>
    </main>
  );
}
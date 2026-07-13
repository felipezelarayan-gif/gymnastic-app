"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  nombre: string;
  rol: string;
  foto_url?: string | null;
};

type UseProfileCheckOptions = {
  redirectIfNoSession?: boolean;
  redirectIfAlumno?: boolean;
  onError?: (message: string) => void;
};

export function useProfileCheck(options: UseProfileCheckOptions = {}) {
  const {
    redirectIfNoSession = true,
    redirectIfAlumno = true,
    onError,
  } = options;

  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) {
        if (redirectIfNoSession) {
          router.push("/login");
        }
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("nombre, rol, foto_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        if (onError) {
          onError(error.message);
        }
        setLoading(false);
        return;
      }

      if (data?.rol === "alumno" && redirectIfAlumno) {
        router.push("/alumno");
        return;
      }

      if (data) setProfile(data);
      setLoading(false);
    }

    check();
  }, [router, redirectIfNoSession, redirectIfAlumno, onError]);

  return { profile, loading };
}
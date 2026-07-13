import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  console.log("auth/confirm params:", { token_hash, type, next });

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    console.log("verifyOtp error:", error);

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  // Error: redirigir a /login con mensaje
  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "Sesión inválida o expirada. Solicitá un nuevo link de recuperación.");
  return NextResponse.redirect(redirectTo);
}
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas de recovery/invitación que no deben tocar auth
  // porque el code/hash debe ser procesado exclusivamente por el cliente
  if (pathname.startsWith("/reset-password") || pathname.startsWith("/bienvenida") || pathname.startsWith("/auth")) {
    return NextResponse.next({ request });
  }

  // Rutas públicas que no requieren sesión
  const publicRoutes = ["/login"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Archivos estáticos, API routes y favicon — salir inmediatamente sin tocar auth
  const isSkippableRoute =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  if (isSkippableRoute) {
    return NextResponse.next({ request });
  }

  // Solo desde acá en adelante creamos el cliente Supabase
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Usamos getSession() en lugar de getUser() — solo lee la cookie localmente,
  // no verifica el token contra Supabase, mucho más rápido para el middleware
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Si no hay sesión y la ruta no es pública → redirect a /login
  if (!session && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Si hay sesión y está en /login → redirect a /
  if (session && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Excluir explícitamente rutas que no necesitan middleware:
    // - _next/static, _next/image
    // - favicon.ico
    // - API routes
    // - auth/confirm, reset-password, bienvenida (ya tienen early return)
    "/((?!_next/static|_next/image|favicon.ico|api/|auth/|reset-password|bienvenida|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
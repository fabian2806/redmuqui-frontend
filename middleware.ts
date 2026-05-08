// =====================================================================
// Middleware de Next.js — route guard.
//
// Protege todas las rutas excepto /login, recursos estáticos y rutas
// públicas. Verifica la cookie `auth-presence` que setea lib/auth.ts
// al hacer login (la cookie no contiene el token, solo una bandera).
//
// En modo NEXT_PUBLIC_AUTH_MODE=mock, el middleware se desactiva para
// que los squads puedan navegar libremente sin login real.
// =====================================================================

import { NextResponse, type NextRequest } from "next/server"

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "mock"

const PUBLIC_ROUTES = ["/login"]

export function middleware(request: NextRequest) {
  // En modo mock, no protegemos nada (los squads navegan libre).
  if (AUTH_MODE === "mock") {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // Rutas públicas
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Verificar bandera de sesión
  const presence = request.cookies.get("auth-presence")
  if (!presence || presence.value !== "1") {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Aplica a todas las rutas excepto _next, archivos estáticos y la API.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)"],
}

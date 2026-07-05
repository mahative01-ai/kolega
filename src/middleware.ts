import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("kolega_session");
  const { pathname } = request.nextUrl;

  const protectedPrefixes = [
    "/member",
    "/admin",
    "/super-admin",
    "/roles",
    "/schedules",
    "/laporan-presensi",
  ];

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isProtected) {
    if (!sessionCookie?.value) {
      return redirectToLogin(request);
    }

    try {
      const parts = sessionCookie.value.split(".");
      if (parts.length < 3) {
        return redirectToLogin(request);
      }

      const expiresAt = Number(parts[1]);
      if (isNaN(expiresAt) || expiresAt < Date.now()) {
        return redirectToLogin(request);
      }
    } catch {
      return redirectToLogin(request);
    }
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);
  
  // Bersihkan cookie yang tidak valid/kadaluwarsa
  response.cookies.delete("kolega_session");
  return response;
}

export const config = {
  matcher: [
    "/member/:path*",
    "/admin/:path*",
    "/super-admin/:path*",
    "/roles/:path*",
    "/schedules/:path*",
    "/laporan-presensi/:path*",
  ],
};

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/logowanie";
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin")) {
    const role = user.app_metadata?.user_role;
    if (role !== "admin") {
      const forbiddenUrl = request.nextUrl.clone();
      forbiddenUrl.pathname = "/brak-uprawnien";
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/profil/:path*",
    "/schematy/:path*",
    "/raporty/:path*",
    "/admin/:path*",
  ],
};

import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/logowanie";
    return NextResponse.redirect(loginUrl);
  }

  // Konto dezaktywowane przez administratora — blokuj natychmiast,
  // nie czekając na wygaśnięcie sesji. Fail-open: brak profilu lub błąd
  // zapytania nie blokuje dostępu (chroni dostępność aplikacji).
  const { data: profile } = await supabase
    .schema("timesheet")
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && profile.is_active === false) {
    const blockedUrl = request.nextUrl.clone();
    blockedUrl.pathname = "/brak-uprawnien";
    return NextResponse.redirect(blockedUrl);
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

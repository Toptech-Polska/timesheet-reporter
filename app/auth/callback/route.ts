import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/auth/logowanie?error=no_code", origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(
      new URL(`/auth/logowanie?error=exchange_failed&detail=${encodeURIComponent(error?.message ?? "no_session")}`, origin)
    );
  }

  const userEmail = data.session.user.email ?? "";
  const userId = data.session.user.id;
  const fullName = data.session.user.user_metadata?.full_name as
    | string
    | undefined;

  // RPC w schemacie public (service role) — w jednym wywołaniu sprawdza
  // whitelistę allowed_emails i zakłada profil/rolę przy pierwszym logowaniu.
  const adminClient = createAdminClient();

  const { data: allowedData, error: allowedError } = await adminClient.rpc(
    "check_timesheet_access",
    { p_email: userEmail, p_user_id: userId, p_name: fullName ?? null }
  );

  if (allowedError || !allowedData) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(`/auth/logowanie?error=not_allowed&detail=${encodeURIComponent(allowedError?.message ?? "no_access")}`, origin)
    );
  }

  return NextResponse.redirect(new URL("/raporty", origin));
}

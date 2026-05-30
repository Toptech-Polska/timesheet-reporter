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

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(
      new URL(`/auth/logowanie?error=admin_client_failed&detail=${encodeURIComponent(msg)}`, origin)
    );
  }

  const { data: allowed, error: allowedError } = await adminClient
    .schema("timesheet")
    .from("allowed_emails")
    .select("email")
    .eq("email", userEmail)
    .single();

  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(`/auth/logowanie?error=not_allowed&detail=${encodeURIComponent(allowedError?.message ?? "no_row")}`, origin)
    );
  }

  const { data: profile } = await adminClient
    .schema("timesheet")
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (!profile) {
    const { error: insertProfileError } = await adminClient
      .schema("timesheet")
      .from("profiles")
      .insert({ id: userId, contractor_name: fullName ?? null });
    if (insertProfileError) {
      return NextResponse.redirect(
        new URL(`/auth/logowanie?error=profile_insert_failed&detail=${encodeURIComponent(insertProfileError.message)}`, origin)
      );
    }
  }

  const { data: roleRow } = await adminClient
    .schema("timesheet")
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .single();

  if (!roleRow) {
    const { error: insertRoleError } = await adminClient
      .schema("timesheet")
      .from("user_roles")
      .insert({ user_id: userId, role: "user" });
    if (insertRoleError) {
      return NextResponse.redirect(
        new URL(`/auth/logowanie?error=role_insert_failed&detail=${encodeURIComponent(insertRoleError.message)}`, origin)
      );
    }
  }

  return NextResponse.redirect(new URL("/raporty", origin));
}

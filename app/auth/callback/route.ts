import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/auth/logowanie", origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(
      new URL("/auth/logowanie?error=unauthorized", origin)
    );
  }

  const userEmail = data.session.user.email ?? "";

  const { data: allowed } = await supabase
    .schema("timesheet")
    .from("allowed_emails")
    .select("email")
    .eq("email", userEmail)
    .single();

  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/auth/logowanie?error=unauthorized", origin)
    );
  }

  const userId = data.session.user.id;
  const fullName = data.session.user.user_metadata?.full_name as
    | string
    | undefined;

  const { data: profile } = await supabase
    .schema("timesheet")
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (!profile) {
    await supabase
      .schema("timesheet")
      .from("profiles")
      .insert({ id: userId, contractor_name: fullName ?? null });
  }

  const { data: roleRow } = await supabase
    .schema("timesheet")
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .single();

  if (!roleRow) {
    await supabase
      .schema("timesheet")
      .from("user_roles")
      .insert({ user_id: userId, role: "user" });
  }

  return NextResponse.redirect(new URL("/raporty", origin));
}

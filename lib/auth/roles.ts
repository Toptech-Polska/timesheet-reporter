import type { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "user" | "admin";

export async function getUserRole(
  supabase: SupabaseClient
): Promise<UserRole | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const role = session.user.app_metadata?.user_role as UserRole | undefined;
  return role ?? "user";
}

export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const role = await getUserRole(supabase);
  return role === "admin";
}

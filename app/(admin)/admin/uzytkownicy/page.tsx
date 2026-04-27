import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable, type UserRow } from "./_users-table";
import { AllowedEmailsSection, type AllowedEmailRow } from "./_allowed-emails";

export default async function UzytkownicyPage() {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  let users: UserRow[] = [];
  let allowedEmails: AllowedEmailRow[] = [];
  let fetchError: string | null = null;

  try {
    const adminClient = createAdminClient();

    const [authResult, profilesResult, rolesResult, allowedResult] =
      await Promise.all([
        adminClient.auth.admin.listUsers({ perPage: 1000 }),
        supabase.schema("timesheet").from("profiles").select("*"),
        supabase.schema("timesheet").from("user_roles").select("*"),
        adminClient
          .schema("timesheet")
          .from("allowed_emails")
          .select("email, note, added_at")
          .order("added_at", { ascending: true }),
      ]);

    if (authResult.error) throw authResult.error;

    const profilesMap = new Map(
      (profilesResult.data ?? []).map((p) => [p.id, p])
    );
    const rolesMap = new Map(
      (rolesResult.data ?? []).map((r: { user_id: string; role: string }) => [
        r.user_id,
        r.role as "user" | "admin",
      ])
    );

    users = authResult.data.users.map((authUser) => {
      const profile = profilesMap.get(authUser.id);
      return {
        id: authUser.id,
        email: authUser.email ?? "",
        contractor_name: profile?.contractor_name ?? null,
        contractor_nip: profile?.contractor_nip ?? null,
        is_active: profile?.is_active ?? true,
        role: rolesMap.get(authUser.id) ?? "user",
        created_at: authUser.created_at,
      };
    });

    allowedEmails = (allowedResult.data ?? []) as AllowedEmailRow[];
  } catch (e) {
    console.error("UzytkownicyPage fetch error:", e);
    fetchError =
      e instanceof Error && e.message.includes("SUPABASE_SERVICE_ROLE_KEY")
        ? "Skonfiguruj SUPABASE_SERVICE_ROLE_KEY w pliku .env.local"
        : "Nie udało się pobrać listy użytkowników";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Użytkownicy</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Zarządzanie kontami i uprawnieniami
        </p>
      </div>

      <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        <AllowedEmailsSection
          allowedEmails={allowedEmails}
          currentUserEmail={currentUser?.email ?? ""}
        />
      </div>

      <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
        {fetchError ? (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {fetchError}
          </div>
        ) : (
          <UsersTable users={users} currentUserId={currentUser?.id ?? ""} />
        )}
      </div>
    </div>
  );
}

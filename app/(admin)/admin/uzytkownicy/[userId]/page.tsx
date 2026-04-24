import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DriveFolderForm } from "./_drive-form";
import { ArrowLeft, FolderOpen } from "lucide-react";

export default async function UserDetailPage({
  params,
}: {
  params: { userId: string };
}) {
  const { userId } = params;
  const adminClient = createAdminClient();
  const supabase = await createClient();

  const [authResult, profileResult, roleResult] = await Promise.all([
    adminClient.auth.admin.getUserById(userId),
    supabase
      .schema("timesheet")
      .from("profiles")
      .select("contractor_name, google_drive_folder_id, google_drive_folder_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .schema("timesheet")
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (authResult.error || !authResult.data.user) {
    notFound();
  }

  const authUser = authResult.data.user;
  const profile = profileResult.data;
  const role = (roleResult.data?.role as "user" | "admin") ?? "user";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/uzytkownicy"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Użytkownicy
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {profile?.contractor_name ?? authUser.email}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{authUser.email}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
            Informacje
          </p>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">E-mail</span>
            <span className="text-slate-800">{authUser.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Imię i nazwisko</span>
            <span className="text-slate-800">
              {profile?.contractor_name ?? (
                <span className="text-slate-400 italic">Brak danych</span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Rola</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                role === "admin"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {role === "admin" ? "Admin" : "Użytkownik"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <FolderOpen className="size-4 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900">
            Google Drive — folder raportów
          </h2>
        </div>
        <div className="px-6 py-5">
          <DriveFolderForm
            userId={userId}
            initialFolderId={profile?.google_drive_folder_id ?? null}
            initialFolderName={profile?.google_drive_folder_name ?? null}
          />
        </div>
      </div>
    </div>
  );
}

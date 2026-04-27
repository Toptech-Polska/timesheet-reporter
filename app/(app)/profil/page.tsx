import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./_profile-form";
import { PasswordForm } from "./_password-form";
import { Globe, Mail, MapPin, Building2, Hash, FolderOpen } from "lucide-react";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileResult, settingsResult] = await Promise.all([
    supabase
      .schema("timesheet")
      .from("profiles")
      .select("*, google_drive_folder_id, google_drive_folder_name")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .schema("timesheet")
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const profile = profileResult.data;
  const settings = settingsResult.data;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mój profil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Dane wyświetlane na generowanych raportach
        </p>
      </div>

      {/* Sekcja A — Moje dane */}
      <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Moje dane</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dane zleceniobiorcy widoczne w raportach
          </p>
        </div>
        <div className="px-6 py-5">
          <ProfileForm profile={profile} />
        </div>
      </div>

      {/* Sekcja B — Google Drive */}
      <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <FolderOpen className="size-4 text-slate-400 dark:text-slate-500" />
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Google Drive
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Folder na raporty przypisany przez administratora
            </p>
          </div>
        </div>
        <div className="px-6 py-5">
          {profile?.google_drive_folder_name ? (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Twój folder raportów na Google Drive:{" "}
              <span className="font-medium">{profile.google_drive_folder_name}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">
              Folder Google Drive nie został jeszcze przypisany przez administratora.
            </p>
          )}
        </div>
      </div>

      {/* Sekcja C — Zmiana hasła */}
      <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Zmiana hasła</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ustaw nowe hasło do swojego konta
          </p>
        </div>
        <div className="px-6 py-5">
          <PasswordForm />
        </div>
      </div>

      {/* Sekcja D — Dane zleceniodawcy */}
      <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Dane zleceniodawcy
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Zarządzane przez administratora
            </p>
          </div>
          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full font-medium">
            Tylko odczyt
          </span>
        </div>

        <div className="px-6 py-5">
          {settings ? (
            <dl className="space-y-4">
              <InfoRow
                icon={<Building2 className="size-4 text-slate-400" />}
                label="Nazwa firmy"
                value={settings.client_name}
              />
              <InfoRow
                icon={<Hash className="size-4 text-slate-400" />}
                label="NIP"
                value={settings.client_nip}
              />
              <InfoRow
                icon={<MapPin className="size-4 text-slate-400" />}
                label="Adres"
                value={settings.client_address}
                multiline
              />
              <InfoRow
                icon={<Mail className="size-4 text-slate-400" />}
                label="E-mail"
                value={settings.client_email}
              />
              <InfoRow
                icon={<Globe className="size-4 text-slate-400" />}
                label="Strona www"
                value={settings.client_website}
              />
            </dl>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">
              Dane zleceniodawcy nie zostały jeszcze skonfigurowane.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  multiline,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </dt>
        <dd
          className={`text-sm text-slate-800 dark:text-slate-200 mt-0.5 ${multiline ? "whitespace-pre-line" : ""}`}
        >
          {value || <span className="text-slate-400 dark:text-slate-500">—</span>}
        </dd>
      </div>
    </div>
  );
}

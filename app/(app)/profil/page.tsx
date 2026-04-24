import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./_profile-form";
import { Globe, Mail, MapPin, Building2, Hash } from "lucide-react";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileResult, settingsResult] = await Promise.all([
    supabase
      .schema("timesheet")
      .from("profiles")
      .select("*")
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
        <h1 className="text-2xl font-bold text-slate-900">Mój profil</h1>
        <p className="text-sm text-slate-500 mt-1">
          Dane wyświetlane na generowanych raportach
        </p>
      </div>

      {/* Sekcja A — Moje dane */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Moje dane</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dane zleceniobiorcy widoczne w raportach
          </p>
        </div>
        <div className="px-6 py-5">
          <ProfileForm profile={profile} />
        </div>
      </div>

      {/* Sekcja B — Dane zleceniodawcy */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Dane zleceniodawcy
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Zarządzane przez administratora
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
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
            <p className="text-sm text-slate-400 italic">
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
        <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </dt>
        <dd
          className={`text-sm text-slate-800 mt-0.5 ${multiline ? "whitespace-pre-line" : ""}`}
        >
          {value || <span className="text-slate-400">—</span>}
        </dd>
      </div>
    </div>
  );
}

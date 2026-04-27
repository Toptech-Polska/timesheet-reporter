import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./_settings-form";
import { formatDateTimePL } from "@/lib/utils/dates";

export default async function UstawieniaPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .schema("timesheet")
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Ustawienia aplikacji</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Dane zleceniodawcy drukowane na raportach
        </p>
      </div>

      <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Dane zleceniodawcy
          </h2>
          {settings?.updated_at && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Ostatnia zmiana: {formatDateTimePL(settings.updated_at)}
            </span>
          )}
        </div>
        <div className="px-6 py-5">
          <SettingsForm settings={settings} />
        </div>
      </div>
    </div>
  );
}

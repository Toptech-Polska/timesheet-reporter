import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReportWizard } from "./_wizard";
import type { SchemaOption } from "@/components/generator/types";

export default async function NowyRaportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: schemas },
    { count },
    { data: profile },
    { data: settings },
  ] = await Promise.all([
    supabase
      .schema("timesheet")
      .from("schemas")
      .select("id, name, max_hours_per_day, working_days_of_week")
      .eq("user_id", user!.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false }),
    supabase
      .schema("timesheet")
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id),
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

  return (
    <div className="max-w-5xl space-y-4">
      {(count ?? 0) > 0 && (
        <Link
          href="/raporty"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="size-4" />
          Wróć do historii raportów
        </Link>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Nowy raport Time Sheet
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Wypełnij konfigurację, sprawdź proporcje i zatwierdź raport
        </p>
      </div>

      <ReportWizard
        schemas={(schemas as SchemaOption[]) ?? []}
        profile={profile ?? null}
        settings={settings ?? null}
      />
    </div>
  );
}

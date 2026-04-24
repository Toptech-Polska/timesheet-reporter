import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EditableEntry } from "@/components/generator/types";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ReportEditView } from "./_components/ReportEditView";
import { ReportReadView } from "./_components/ReportReadView";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();
  const { data: report } = await supabase
    .schema("timesheet")
    .from("reports")
    .select("period_month, period_year")
    .eq("id", params.id)
    .maybeSingle();

  if (!report) return { title: "Raport | TimeSheet Reporter" };

  const month = MONTHS_PL[report.period_month - 1];
  return { title: `${month} ${report.period_year} | TimeSheet Reporter` };
}

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: report } = await supabase
    .schema("timesheet")
    .from("reports")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!report) notFound();

  const { data: entriesData } = await supabase
    .schema("timesheet")
    .from("report_entries")
    .select("*")
    .eq("report_id", params.id)
    .order("sort_order");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: EditableEntry[] = (entriesData ?? []).map((e: any) => ({
    work_date: e.work_date as string,
    day_of_week: e.day_of_week as string,
    week_number: e.week_number as number,
    work_item_id: (e.work_item_id as string) ?? "",
    description: e.work_description as string,
    category: e.category as string,
    hours: e.hours as number,
    hourly_rate: e.hourly_rate as number,
    line_total: e.line_total as number,
    sort_order: e.sort_order as number,
    is_manually_edited: e.is_manually_edited as boolean,
  }));

  const monthName = MONTHS_PL[report.period_month - 1] ?? "";
  const period = `${monthName} ${report.period_year}`;

  const breadcrumbs = (
    <Breadcrumbs
      crumbs={[
        { label: "Raporty", href: "/raporty" },
        { label: period },
      ]}
    />
  );

  if (report.status === "draft") {
    return (
      <div className="space-y-4">
        {breadcrumbs}
        <ReportEditView
          report={{
            id: report.id,
            period_month: report.period_month,
            period_year: report.period_year,
            target_amount: report.target_amount,
            calculated_amount: report.calculated_amount,
            amount_difference: report.amount_difference,
            invoice_number: report.invoice_number ?? null,
            contractor_snapshot: report.contractor_snapshot ?? {},
            client_snapshot: report.client_snapshot ?? {},
          }}
          initialEntries={entries}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {breadcrumbs}
      <ReportReadView
        report={{
          id: report.id,
          period_month: report.period_month,
          period_year: report.period_year,
          target_amount: report.target_amount,
          calculated_amount: report.calculated_amount,
          amount_difference: report.amount_difference,
          status: report.status as "approved" | "exported",
          invoice_number: report.invoice_number ?? null,
          contractor_snapshot: report.contractor_snapshot ?? {},
          client_snapshot: report.client_snapshot ?? {},
        }}
        entries={entries}
        savedBanner={searchParams.saved}
      />
    </div>
  );
}

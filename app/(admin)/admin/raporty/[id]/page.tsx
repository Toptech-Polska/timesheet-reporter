import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ReportTable } from "@/components/report/ReportTable";
import { ExportButtons } from "@/components/report/ExportButtons";
import { ReportStatusBadge } from "@/components/report/ReportStatusBadge";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { formatPLN } from "@/lib/utils/currency";
import type { EditableEntry } from "@/components/generator/types";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const adminClient = createAdminClient();
  const { data: report } = await adminClient
    .schema("timesheet")
    .from("reports")
    .select("period_month, period_year")
    .eq("id", params.id)
    .maybeSingle();

  if (!report) return { title: "Raport | Admin — TimeSheet Reporter" };

  const month = MONTHS_PL[report.period_month - 1];
  return { title: `${month} ${report.period_year} | Admin — TimeSheet Reporter` };
}

export default async function AdminReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const adminClient = createAdminClient();

  const { data: report } = await adminClient
    .schema("timesheet")
    .from("reports")
    .select("*, profiles(contractor_name, contractor_email)")
    .eq("id", params.id)
    .maybeSingle();

  if (!report) notFound();

  const { data: entriesData } = await adminClient
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileRaw = (report as any).profiles;
  const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
  const contractorName: string = profile?.contractor_name ?? "";
  const contractorEmail: string = profile?.contractor_email ?? "";

  const monthName = MONTHS_PL[report.period_month - 1] ?? "";
  const period = `${monthName} ${report.period_year}`;
  const canExport = report.status === "approved" || report.status === "exported";

  return (
    <div className="space-y-4">
      <Breadcrumbs
        crumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Raporty", href: "/admin/raporty" },
          { label: period },
        ]}
      />

      {/* Pasek górny */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/admin/raporty">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4 mr-1.5" />
            Wróć do listy
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <ReportStatusBadge status={report.status as "draft" | "approved" | "exported"} />
          {canExport && <ExportButtons reportId={report.id} />}
        </div>
      </div>

      {/* Dane użytkownika */}
      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3">
        <User className="size-4 text-slate-400 shrink-0" />
        <p className="text-sm text-slate-600">
          Raport użytkownika:{" "}
          <span className="font-semibold text-slate-800">
            {contractorName || <em>brak danych</em>}
          </span>
          {contractorEmail && (
            <span className="text-slate-400 ml-1">({contractorEmail})</span>
          )}
        </p>
      </div>

      <ReportHeader
        month={report.period_month}
        year={report.period_year}
        invoiceNumber={report.invoice_number ?? ""}
        profile={report.contractor_snapshot ?? {}}
        settings={report.client_snapshot ?? {}}
      />

      {/* Kwoty */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3 flex flex-wrap gap-4 text-sm">
        <span className="text-slate-600">
          Cel: <strong className="text-slate-900">{formatPLN(report.target_amount)}</strong>
        </span>
        <span className="text-slate-600">
          Wyliczona: <strong className="text-slate-900">{formatPLN(report.calculated_amount)}</strong>
        </span>
        {Math.abs(report.amount_difference ?? 0) > 1 && (
          <span className="font-semibold text-amber-600">
            Δ {formatPLN(Math.abs(report.amount_difference ?? 0))}
          </span>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <ReportTable
          entries={entries}
          month={report.period_month}
          year={report.period_year}
          readOnly
        />
      </div>
    </div>
  );
}

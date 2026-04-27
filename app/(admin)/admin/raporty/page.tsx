import { Suspense } from "react";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentYear } from "@/lib/utils/dates";
import { TableSkeleton } from "@/components/ui/data-table";
import { AdminReportsFilters } from "./_components/AdminReportsFilters";
import { AdminReportsClient, type AdminReportRow } from "./_components/AdminReportsClient";

export const metadata: Metadata = {
  title: "Raporty użytkowników | Admin — TimeSheet Reporter",
};

export default async function AdminRaportyPage({
  searchParams,
}: {
  searchParams: { rok?: string; miesiac?: string; status?: string };
}) {
  const year = parseInt(searchParams.rok ?? String(currentYear()));
  const month = parseInt(searchParams.miesiac ?? "0");
  const status = searchParams.status ?? "all";

  const adminClient = createAdminClient();

  let query = adminClient
    .schema("timesheet")
    .from("reports")
    .select("id, period_month, period_year, target_amount, calculated_amount, amount_difference, status, invoice_number, approved_at, created_at, user_id, profiles(contractor_name, contractor_email)")
    .eq("period_year", year);

  if (month > 0) query = query.eq("period_month", month);
  if (status !== "all") query = query.eq("status", status);

  const { data: rawReports } = await query
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .order("created_at", { ascending: false });

  const reports: AdminReportRow[] = (rawReports ?? []).map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = Array.isArray((r as any).profiles)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (r as any).profiles[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (r as any).profiles;
    return {
      id: r.id,
      period_month: r.period_month,
      period_year: r.period_year,
      target_amount: r.target_amount ?? 0,
      calculated_amount: r.calculated_amount ?? 0,
      amount_difference: r.amount_difference ?? 0,
      status: r.status as AdminReportRow["status"],
      invoice_number: r.invoice_number ?? null,
      approved_at: r.approved_at ?? null,
      created_at: r.created_at,
      contractor_name: profile?.contractor_name ?? "",
      contractor_email: profile?.contractor_email ?? "",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Raporty użytkowników</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Podgląd wszystkich raportów w systemie
        </p>
      </div>

      <Suspense>
        <AdminReportsFilters
          selectedYear={year}
          selectedMonth={month}
          selectedStatus={status}
        />
      </Suspense>

      <Suspense fallback={<TableSkeleton rows={8} cols={10} />}>
        <AdminReportsClient
          reports={reports}
          year={year}
          month={month}
          status={status}
        />
      </Suspense>
    </div>
  );
}

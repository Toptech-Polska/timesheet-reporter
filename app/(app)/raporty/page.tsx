import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Raporty | TimeSheet Reporter",
};
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ReportFilters } from "./_components/ReportFilters";
import { ReportCard, type ReportItem } from "./_components/ReportCard";
import { currentYear } from "@/lib/utils/dates";

const PAGE_SIZE = 10;

export default async function RaportyPage({
  searchParams,
}: {
  searchParams: { rok?: string; miesiac?: string; status?: string; strona?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const year = parseInt(searchParams.rok ?? String(currentYear()));
  const month = parseInt(searchParams.miesiac ?? "0");
  const status = searchParams.status ?? "all";
  const page = Math.max(1, parseInt(searchParams.strona ?? "1"));

  let query = supabase
    .schema("timesheet")
    .from("reports")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .eq("period_year", year);

  if (month > 0) {
    query = query.eq("period_month", month);
  }
  if (status !== "all") {
    query = query.eq("status", status);
  }

  query = query
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data: reports, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Raporty</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Historia Twoich raportów Time Sheet</p>
        </div>
        <Link href="/raporty/nowy">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
            <Plus className="size-4 mr-2" />
            Nowy raport
          </Button>
        </Link>
      </div>

      {/* Filtry */}
      <Suspense>
        <ReportFilters
          selectedYear={year}
          selectedMonth={month}
          selectedStatus={status}
        />
      </Suspense>

      {/* Lista */}
      {!reports || reports.length === 0 ? (
        <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm py-16 text-center">
          <FileText className="size-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">Brak raportów</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
            {status !== "all" || month > 0
              ? "Brak raportów dla wybranych filtrów."
              : "Utwórz swój pierwszy raport Time Sheet."}
          </p>
          <Link href="/raporty/nowy">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
              <Plus className="size-4 mr-2" />
              Nowy raport
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(reports as ReportItem[]).map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

      {/* Paginacja */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          {page > 1 && (
            <Link href={`/raporty?rok=${year}&miesiac=${month}&status=${status}&strona=${page - 1}`}>
              <Button variant="outline" size="sm">← Poprzednia</Button>
            </Link>
          )}
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Strona {page} z {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/raporty?rok=${year}&miesiac=${month}&status=${status}&strona=${page + 1}`}>
              <Button variant="outline" size="sm">Następna →</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

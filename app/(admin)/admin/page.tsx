import { createClient } from "@/lib/supabase/server";
import { currentMonth, currentYear, formatDatePL, formatMonthYear } from "@/lib/utils/dates";
import { formatPLN } from "@/lib/utils/currency";
import { Users, FileText, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  draft: "Szkic",
  submitted: "Złożony",
  approved: "Zatwierdzony",
  rejected: "Odrzucony",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
  submitted: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
  approved: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400",
  rejected: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const month = currentMonth();
  const year = currentYear();

  const [usersResult, reportsCountResult, approvedResult, recentResult] =
    await Promise.all([
      supabase
        .schema("timesheet")
        .from("profiles")
        .select("*", { count: "exact", head: true }),
      supabase
        .schema("timesheet")
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("period_month", month)
        .eq("period_year", year),
      supabase
        .schema("timesheet")
        .from("reports")
        .select("calculated_amount")
        .eq("status", "approved")
        .eq("period_month", month)
        .eq("period_year", year),
      supabase
        .schema("timesheet")
        .from("reports")
        .select(
          "id, period_month, period_year, calculated_amount, status, created_at, profiles(contractor_name)"
        )
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const usersCount = usersResult.count ?? 0;
  const reportsCount = reportsCountResult.count ?? 0;
  const totalApproved =
    approvedResult.data?.reduce(
      (sum, r) => sum + (r.calculated_amount ?? 0),
      0
    ) ?? 0;
  const recentReports = recentResult.data ?? [];
  const monthLabel = formatMonthYear(month, year);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Przegląd stanu aplikacji — {monthLabel}
        </p>
      </div>

      {/* Karty statystyk */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="size-5 text-blue-600" />}
          label="Użytkownicy"
          value={String(usersCount)}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<FileText className="size-5 text-violet-600" />}
          label={`Raporty (${monthLabel})`}
          value={String(reportsCount)}
          bg="bg-violet-50"
        />
        <StatCard
          icon={<TrendingUp className="size-5 text-green-600" />}
          label={`Zatwierdzone (${monthLabel})`}
          value={formatPLN(totalApproved)}
          bg="bg-green-50"
        />
      </div>

      {/* Ostatnie raporty */}
      <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Ostatnie raporty
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                {["Użytkownik", "Okres", "Kwota docelowa", "Status", "Data utworzenia"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {recentReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-sm"
                  >
                    Brak raportów
                  </td>
                </tr>
              ) : (
                recentReports.map((r) => {
                  const profile = Array.isArray(r.profiles)
                    ? r.profiles[0]
                    : r.profiles;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {profile?.contractor_name ?? (
                          <span className="text-slate-400 dark:text-slate-500 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatMonthYear(r.period_month, r.period_year)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatPLN(r.calculated_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            STATUS_STYLES[r.status] ?? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          )}
                        >
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDatePL(r.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex items-center gap-4">
      <div className={cn("rounded-lg p-2.5 shrink-0", bg)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportStatusBadge } from "@/components/report/ReportStatusBadge";
import { formatPLN } from "@/lib/utils/currency";
import { formatDatePL } from "@/lib/utils/dates";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

const PAGE_SIZE = 25;

export interface AdminReportRow {
  id: string;
  period_month: number;
  period_year: number;
  target_amount: number;
  calculated_amount: number;
  amount_difference: number;
  status: "draft" | "approved" | "exported";
  invoice_number: string | null;
  approved_at: string | null;
  created_at: string;
  contractor_name: string;
  contractor_email: string;
}

interface Props {
  reports: AdminReportRow[];
  year: number;
  month: number;
  status: string;
}

export function AdminReportsClient({ reports, year, month, status }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) =>
        r.contractor_name.toLowerCase().includes(q) ||
        r.contractor_email.toLowerCase().includes(q)
    );
  }, [reports, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalApproved = filtered
    .filter((r) => r.status === "approved" || r.status === "exported")
    .reduce((s, r) => s + r.calculated_amount, 0);
  const totalTarget = filtered.reduce((s, r) => s + r.target_amount, 0);

  const exportParams = new URLSearchParams({
    year: String(year),
    ...(month > 0 && { month: String(month) }),
    ...(status !== "all" && { status }),
  });

  return (
    <div className="space-y-4">
      {/* Pasek narzędzi */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Szukaj po nazwie lub e-mailu..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 w-64"
        />
        <a href={`/api/admin/reports/export?${exportParams.toString()}`} download>
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-1.5" />
            Eksport zbiorczy XLSX
          </Button>
        </a>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-12 text-center text-slate-400 text-sm">
          Brak raportów spełniających kryteria
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Użytkownik", "E-mail", "Okres", "Nr faktury", "Cel (PLN)", "Wyliczona (PLN)", "Δ", "Status", "Zatwierdzone", "Akcje"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((r) => {
                const absDiff = Math.abs(r.amount_difference ?? 0);
                const hasDiff = absDiff > 1;
                const period = `${MONTHS_PL[r.period_month - 1]} ${r.period_year}`;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {r.contractor_name || <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.contractor_email || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{period}</td>
                    <td className="px-4 py-3 text-slate-500">{r.invoice_number || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 whitespace-nowrap">
                      {formatPLN(r.target_amount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 whitespace-nowrap">
                      {formatPLN(r.calculated_amount)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {hasDiff ? (
                        <span className={`text-xs font-semibold ${(r.amount_difference ?? 0) < 0 ? "text-red-600" : "text-amber-500"}`}>
                          {formatPLN(absDiff)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ReportStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {r.approved_at ? formatDatePL(r.approved_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/raporty/${r.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="size-3.5 mr-1" />
                          Podgląd
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Podsumowanie */}
      <div className="flex flex-wrap gap-6 text-sm text-slate-600 bg-white rounded-xl border border-slate-200 px-5 py-3">
        <span>Łącznie raportów: <strong className="text-slate-900">{filtered.length}</strong></span>
        <span>Suma kwot zatwierdzonych: <strong className="text-slate-900">{formatPLN(totalApproved)}</strong></span>
        <span>Suma kwot docelowych: <strong className="text-slate-900">{formatPLN(totalTarget)}</strong></span>
      </div>

      {/* Paginacja */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
            ← Poprzednia
          </Button>
          <span className="text-sm text-slate-500">Strona {currentPage} z {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            Następna →
          </Button>
        </div>
      )}
    </div>
  );
}

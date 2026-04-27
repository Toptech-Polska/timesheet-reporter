"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ReportTable } from "@/components/report/ReportTable";
import { ExportButtons } from "@/components/report/ExportButtons";
import { InvoiceNumberForm } from "@/components/report/InvoiceNumberForm";
import { ReportStatusBadge } from "@/components/report/ReportStatusBadge";
import { formatPLN } from "@/lib/utils/currency";
import type { EditableEntry } from "@/components/generator/types";

interface Report {
  id: string;
  period_month: number;
  period_year: number;
  target_amount: number;
  calculated_amount: number;
  amount_difference: number;
  status: "approved" | "exported";
  invoice_number: string | null;
  contractor_snapshot: Record<string, unknown>;
  client_snapshot: Record<string, unknown>;
}

interface Props {
  report: Report;
  entries: EditableEntry[];
  savedBanner?: string;
}

export function ReportReadView({ report, entries, savedBanner }: Props) {
  const absDiff = Math.abs(report.amount_difference ?? 0);
  const hasDiff = absDiff > 1;

  return (
    <div className="space-y-4">
      {/* Baner po zatwierdzeniu */}
      {savedBanner === "approved" && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-5 py-4">
          <FileText className="size-5 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-300">Raport zatwierdzony</p>
            <p className="text-sm mt-0.5 text-green-600 dark:text-green-400">
              Raport został zatwierdzony i zapisany w systemie.
            </p>
          </div>
        </div>
      )}

      {/* Pasek górny */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/raporty">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4 mr-1.5" />
            Wróć
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <ReportStatusBadge status={report.status} />
          <ExportButtons reportId={report.id} />
        </div>
      </div>

      <ReportHeader
        month={report.period_month}
        year={report.period_year}
        invoiceNumber={report.invoice_number ?? ""}
        profile={report.contractor_snapshot}
        settings={report.client_snapshot}
      />

      {/* Podsumowanie kwot */}
      <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-3 flex flex-wrap gap-4 text-sm">
        <span className="text-slate-600 dark:text-slate-400">
          Cel: <strong className="text-slate-900 dark:text-slate-100">{formatPLN(report.target_amount)}</strong>
        </span>
        <span className="text-slate-600 dark:text-slate-400">
          Wyliczona: <strong className="text-slate-900 dark:text-slate-100">{formatPLN(report.calculated_amount)}</strong>
        </span>
        {hasDiff && (
          <span className={`font-semibold ${(report.amount_difference ?? 0) < 0 ? "text-red-600" : "text-amber-600"}`}>
            Różnica: {formatPLN(absDiff)}
          </span>
        )}
      </div>

      {/* Formularz nr faktury (tylko jeśli brak) */}
      {!report.invoice_number && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Brak numeru faktury</p>
          <InvoiceNumberForm reportId={report.id} current={null} />
        </div>
      )}

      {/* Tabela raportu (tryb podglądu) */}
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

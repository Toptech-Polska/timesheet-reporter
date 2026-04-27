"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit2, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ExportButtons } from "@/components/report/ExportButtons";
import { ReportStatusBadge } from "@/components/report/ReportStatusBadge";
import { useToast } from "@/components/ui/toast";
import { deleteReport, approveReport } from "@/app/actions/reports";
import { formatPLN } from "@/lib/utils/currency";
import { formatDatePL } from "@/lib/utils/dates";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export interface ReportItem {
  id: string;
  period_month: number;
  period_year: number;
  target_amount: number;
  calculated_amount: number;
  amount_difference: number;
  status: "draft" | "approved" | "exported";
  invoice_number: string | null;
  created_at: string;
  approved_at: string | null;
}

export function ReportCard({ report }: { report: ReportItem }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [isApproving, startApprove] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  const monthName = MONTHS_PL[report.period_month - 1];
  const absDiff = Math.abs(report.amount_difference ?? 0);
  const hasDiff = absDiff > 1;
  const isNonDraft = report.status === "approved" || report.status === "exported";

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteReport(report.id);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast("Raport usunięty", "success");
      }
      setShowDeleteDialog(false);
    });
  }

  function handleApprove() {
    startApprove(async () => {
      const result = await approveReport(report.id);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        router.push(`/raporty/${report.id}?saved=approved`);
      }
      setShowApproveDialog(false);
    });
  }

  return (
    <>
      <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Lewa kolumna — metadane */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Time Sheet — {monthName} {report.period_year}
            </h2>
            <ReportStatusBadge status={report.status} />
          </div>

          {report.invoice_number && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Faktura: <span className="font-medium text-slate-700 dark:text-slate-300">{report.invoice_number}</span>
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap text-sm text-slate-600 dark:text-slate-400">
            <span>
              Cel: <span className="font-medium">{formatPLN(report.target_amount)}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>
              Wyliczona: <span className="font-medium">{formatPLN(report.calculated_amount)}</span>
            </span>
            {hasDiff && (
              <span className={`font-semibold ${(report.amount_difference ?? 0) < 0 ? "text-red-600" : "text-amber-600"}`}>
                Δ {formatPLN(absDiff)}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Utworzony: {formatDatePL(report.created_at)}
            {report.approved_at && (
              <> · Zatwierdzony: {formatDatePL(report.approved_at)}</>
            )}
          </p>
        </div>

        {/* Prawa kolumna — przyciski */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href={`/raporty/${report.id}`}>
            <Button variant="outline" size="sm">
              <Edit2 className="size-3.5 mr-1" />
              Edytuj
            </Button>
          </Link>

          {report.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => setShowApproveDialog(true)}
            >
              <CheckCircle className="size-3.5 mr-1" />
              Zatwierdź
            </Button>
          )}

          {isNonDraft && <ExportButtons reportId={report.id} />}

          <Button
            variant="outline"
            size="sm"
            className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="size-3.5 mr-1" />
            Usuń
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Usuń raport"
        description={
          isNonDraft
            ? `Raport „Time Sheet — ${monthName} ${report.period_year}" jest ${report.status === "approved" ? "zatwierdzony" : "wyeksportowany"}. Czy na pewno chcesz go usunąć? Tej operacji nie można cofnąć.`
            : `Czy na pewno chcesz usunąć raport „Time Sheet — ${monthName} ${report.period_year}"? Tej operacji nie można cofnąć.`
        }
        confirmLabel="Usuń"
        cancelLabel="Anuluj"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        loading={isDeleting}
      />

      <ConfirmDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        title="Zatwierdź raport"
        description="Czy na pewno chcesz zatwierdzić raport? Zawsze możesz go edytować lub cofnąć do wersji roboczej."
        confirmLabel="Zatwierdź"
        cancelLabel="Anuluj"
        onConfirm={handleApprove}
        loading={isApproving}
      />
    </>
  );
}

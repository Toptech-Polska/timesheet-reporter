"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ReportTable } from "@/components/report/ReportTable";
import { ExportButtons } from "@/components/report/ExportButtons";
import { useToast } from "@/components/ui/toast";
import { approveReport, updateReportEntries } from "@/app/actions/reports";
import type { EditableEntry } from "@/components/generator/types";

interface Report {
  id: string;
  period_month: number;
  period_year: number;
  target_amount: number;
  calculated_amount: number;
  amount_difference: number;
  status: "draft" | "approved" | "exported";
  invoice_number: string | null;
  contractor_snapshot: Record<string, unknown>;
  client_snapshot: Record<string, unknown>;
}

interface Props {
  report: Report;
  initialEntries: EditableEntry[];
  savedBanner?: string;
}

export function ReportEditView({ report, initialEntries, savedBanner }: Props) {
  const [entries, setEntries] = useState<EditableEntry[]>(initialEntries);
  const [currentStatus, setCurrentStatus] = useState(report.status);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isApproving, startApproving] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

  const isApprovedOrExported = currentStatus === "approved" || currentStatus === "exported";

  function handleUpdateEntry(
    index: number,
    field: keyof EditableEntry,
    value: string | number
  ) {
    setEntries((prev) => {
      const updated = [...prev];
      const entry = { ...updated[index], [field]: value, is_manually_edited: true };
      if (field === "hours" || field === "hourly_rate") {
        entry.line_total = Number(entry.hours) * Number(entry.hourly_rate);
      }
      updated[index] = entry;
      return updated;
    });
  }

  function handleSave() {
    if (isApprovedOrExported) {
      setShowSaveDialog(true);
    } else {
      doSave();
    }
  }

  function doSave() {
    const wasApprovedOrExported = currentStatus !== "draft";
    startSaving(async () => {
      const result = await updateReportEntries(report.id, entries);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        if (wasApprovedOrExported) {
          setCurrentStatus("draft");
          showToast("Zmiany zapisane. Raport wymaga ponownego zatwierdzenia.", "success");
        } else {
          showToast("Zmiany zapisane", "success");
        }
      }
      setShowSaveDialog(false);
    });
  }

  function handleApprove() {
    startApproving(async () => {
      const saveResult = await updateReportEntries(report.id, entries);
      if (saveResult.error) {
        showToast(saveResult.error, "error");
        setShowApproveDialog(false);
        return;
      }
      const approveResult = await approveReport(report.id);
      if (approveResult.error) {
        showToast(approveResult.error, "error");
      } else {
        router.push(`/raporty/${report.id}?saved=approved`);
      }
      setShowApproveDialog(false);
    });
  }

  return (
    <div className="space-y-4">
      {/* Baner po zatwierdzeniu */}
      {savedBanner === "approved" && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <FileText className="size-5 shrink-0 mt-0.5 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Raport zatwierdzony</p>
            <p className="text-sm mt-0.5 text-green-600">
              Raport został zatwierdzony i zapisany w systemie.
            </p>
          </div>
        </div>
      )}

      {/* Baner ostrzeżenie (edycja zatwierdzonego) */}
      {isApprovedOrExported && savedBanner !== "approved" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-800">Edytujesz zatwierdzony raport</p>
            <p className="text-sm mt-0.5 text-amber-700">
              Zapisanie zmian cofnie status raportu do wersji roboczej i będzie wymagało ponownego zatwierdzenia.
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
        <div className="flex gap-2 flex-wrap items-center">
          {isApprovedOrExported && <ExportButtons reportId={report.id} />}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="size-4 mr-1.5" />
            {isSaving ? "Zapisuję..." : "Zapisz zmiany"}
          </Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white border-0"
            onClick={() => setShowApproveDialog(true)}
            disabled={isApproving}
          >
            <CheckCircle className="size-4 mr-1.5" />
            Zatwierdź raport
          </Button>
        </div>
      </div>

      <ReportHeader
        month={report.period_month}
        year={report.period_year}
        invoiceNumber={report.invoice_number ?? ""}
        profile={report.contractor_snapshot}
        settings={report.client_snapshot}
      />

      <div className="overflow-x-auto">
        <ReportTable
          entries={entries}
          month={report.period_month}
          year={report.period_year}
          onUpdateEntry={handleUpdateEntry}
        />
      </div>

      <ConfirmDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        title="Zapisz zmiany"
        description="Raport jest zatwierdzony. Zapisanie zmian cofnie go do wersji roboczej i będzie wymagało ponownego zatwierdzenia. Czy chcesz kontynuować?"
        confirmLabel="Zapisz"
        cancelLabel="Anuluj"
        onConfirm={doSave}
        loading={isSaving}
      />

      <ConfirmDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        title="Zatwierdź raport"
        description={
          isApprovedOrExported
            ? "Raport zostanie ponownie zatwierdzony z bieżącymi wpisami. Czy chcesz kontynuować?"
            : "Czy na pewno chcesz zatwierdzić raport? Zawsze możesz go edytować lub cofnąć do wersji roboczej."
        }
        confirmLabel="Zatwierdź"
        cancelLabel="Anuluj"
        onConfirm={handleApprove}
        loading={isApproving}
      />
    </div>
  );
}

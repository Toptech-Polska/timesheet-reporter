"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ReportTable } from "@/components/report/ReportTable";
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
  invoice_number: string | null;
  contractor_snapshot: Record<string, unknown>;
  client_snapshot: Record<string, unknown>;
}

interface Props {
  report: Report;
  initialEntries: EditableEntry[];
}

export function ReportEditView({ report, initialEntries }: Props) {
  const [entries, setEntries] = useState<EditableEntry[]>(initialEntries);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isApproving, startApproving] = useTransition();
  const { showToast } = useToast();
  const router = useRouter();

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
    startSaving(async () => {
      const result = await updateReportEntries(report.id, entries);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast("Zmiany zapisane", "success");
      }
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
      {/* Pasek górny */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/raporty">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4 mr-1.5" />
            Wróć
          </Button>
        </Link>
        <div className="flex gap-2">
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
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        title="Zatwierdź raport"
        description="Po zatwierdzeniu raport przejdzie w tryb tylko-odczyt i nie będzie można go edytować. Czy na pewno chcesz zatwierdzić?"
        confirmLabel="Zatwierdź"
        cancelLabel="Anuluj"
        onConfirm={handleApprove}
        loading={isApproving}
      />
    </div>
  );
}

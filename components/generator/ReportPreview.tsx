"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/dialog";
import type { WizardState, EditableEntry } from "./types";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ReportTable } from "@/components/report/ReportTable";
import { saveReport } from "@/app/actions/reports";
import { formatPLN } from "@/lib/utils/currency";

interface ReportPreviewProps {
  wizardState: WizardState;
  profile: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  onBack: () => void;
  onUpdateState: (partial: Partial<WizardState>) => void;
}

export function ReportPreview({
  wizardState,
  profile,
  settings,
  onBack,
}: ReportPreviewProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [invoiceNumber, setInvoiceNumber] = useState(wizardState.invoice_number);
  const [entries, setEntries] = useState<EditableEntry[]>(wizardState.entries);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingApproved, setSavingApproved] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const isSaving = savingDraft || savingApproved;

  const calculatedAmount =
    Math.round(entries.reduce((s, e) => s + e.line_total, 0) * 100) / 100;
  const difference =
    Math.round((wizardState.target_amount - calculatedAmount) * 100) / 100;

  function handleUpdateEntry(
    index: number,
    field: keyof EditableEntry,
    value: string | number
  ) {
    setEntries((prev) => {
      const updated = [...prev];
      const entry = { ...updated[index], is_manually_edited: true };

      if (field === "hours") {
        const hours = typeof value === "number" ? value : parseFloat(String(value));
        entry.hours = isNaN(hours) ? 0 : Math.round(hours * 2) / 2;
        entry.line_total =
          Math.round(entry.hours * entry.hourly_rate * 100) / 100;
      } else if (field === "hourly_rate") {
        const rate = typeof value === "number" ? value : parseFloat(String(value));
        entry.hourly_rate = isNaN(rate) ? 0 : rate;
        entry.line_total =
          Math.round(entry.hours * entry.hourly_rate * 100) / 100;
      } else if (field === "description") {
        entry.description = String(value);
      } else if (field === "category") {
        entry.category = String(value);
      }

      updated[index] = entry;
      return updated;
    });
  }

  async function handleSave(status: "draft" | "approved") {
    const setLoading = status === "draft" ? setSavingDraft : setSavingApproved;
    setLoading(true);

    const result = await saveReport({
      schema_id: wizardState.schema_id,
      period_month: wizardState.period_month,
      period_year: wizardState.period_year,
      target_amount: wizardState.target_amount,
      calculated_amount: calculatedAmount,
      amount_difference: difference,
      status,
      invoice_number: invoiceNumber.trim() || null,
      entries,
      notes: null,
    });

    setLoading(false);

    if ("error" in result) {
      showToast(result.error, "error");
      return;
    }

    showToast(
      status === "draft" ? "Wersja robocza zapisana" : "Raport zatwierdzony",
      "success"
    );
    router.push(`/raporty/${result.id}?saved=${status}`);
  }

  return (
    <div className="space-y-6">
      {/* Invoice number */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5">
        <div className="max-w-sm space-y-1.5">
          <Label htmlFor="invoice_number">Nr faktury / dokumentu</Label>
          <Input
            id="invoice_number"
            placeholder="np. FV 2026/03/001"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
        </div>
      </div>

      {/* Report header */}
      <ReportHeader
        month={wizardState.period_month}
        year={wizardState.period_year}
        invoiceNumber={invoiceNumber}
        profile={profile}
        settings={settings}
      />

      {/* Table */}
      <div className="overflow-x-auto shadow-sm rounded-xl">
        <ReportTable
          entries={entries}
          month={wizardState.period_month}
          year={wizardState.period_year}
          onUpdateEntry={handleUpdateEntry}
        />
      </div>

      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Suma łączna
            </p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatPLN(calculatedAmount)}
            </p>
          </div>
          {Math.abs(difference) >= 1 && (
            <div
              className={`text-sm px-4 py-2 rounded-lg border ${
                difference > 0
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              Różnica od kwoty docelowej:{" "}
              <span className="font-semibold tabular-nums">
                {difference > 0 ? "+" : ""}
                {formatPLN(difference)}
              </span>
            </div>
          )}
          {Math.abs(difference) < 1 && (
            <p className="text-sm text-green-600">
              ✓ Kwota zgodna z celem
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSaving}
        >
          ← Wróć do proporcji
        </Button>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={isSaving}
          >
            {savingDraft ? "Zapisywanie…" : "Zapisz wersję roboczą"}
          </Button>
          <Button
            type="button"
            onClick={() => setShowApproveDialog(true)}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            {savingApproved ? "Zatwierdzanie…" : "Zatwierdź raport"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        title="Zatwierdź raport"
        description="Zatwierdzonego raportu nie można usunąć. Czy na pewno chcesz zatwierdzić raport za ten okres?"
        confirmLabel="Zatwierdź"
        onConfirm={() => {
          setShowApproveDialog(false);
          handleSave("approved");
        }}
      />
    </div>
  );
}

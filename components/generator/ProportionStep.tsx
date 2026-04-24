"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WizardState, EditableEntry } from "./types";
import { ProportionTable } from "./ProportionTable";
import {
  generateProposals,
  distributeHours,
  calculateResult,
} from "@/lib/algorithm/generator";
import { suggestCorrection } from "@/lib/algorithm/corrector";
import type {
  AlgorithmInput,
  AlgorithmResult,
  ProportionProposal,
} from "@/lib/algorithm/types";
import { formatPLN } from "@/lib/utils/currency";

interface ProportionStepProps {
  wizardState: WizardState;
  onNext: (partial: Partial<WizardState>) => void;
  onBack: () => void;
  onUpdateState: (partial: Partial<WizardState>) => void;
}

export function ProportionStep({
  wizardState,
  onNext,
  onBack,
}: ProportionStepProps) {
  const [proposals, setProposals] = useState<ProportionProposal[]>(
    wizardState.proposals
  );
  const [workItems, setWorkItems] = useState(wizardState.work_items);
  const [algorithmResult, setAlgorithmResult] = useState<AlgorithmResult | null>(
    wizardState.algorithm_result
  );
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const correction = algorithmResult ? suggestCorrection(algorithmResult) : null;

  function recalculate(updatedWorkItems = workItems) {
    try {
      const input: AlgorithmInput = {
        target_amount: wizardState.target_amount,
        work_items: updatedWorkItems,
        working_days: wizardState.working_days,
        max_hours_per_day: wizardState.max_hours_per_day,
      };
      const newProposals = generateProposals(input);
      setProposals(newProposals);
      setError(null);
      return newProposals;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Błąd obliczenia proporcji."
      );
      return null;
    }
  }

  function handleProportionChange(itemId: string, newProportion: number) {
    const updatedItems = workItems.map((item) =>
      item.id === itemId ? { ...item, proportion: newProportion } : item
    );
    setWorkItems(updatedItems);
    recalculate(updatedItems);
  }

  function handleNext() {
    if (!confirmed) return;

    const entries = distributeHours(
      proposals,
      wizardState.working_days,
      wizardState.max_hours_per_day
    );
    const result = calculateResult(
      proposals,
      entries,
      wizardState.target_amount
    );
    setAlgorithmResult(result);
    const editableEntries: EditableEntry[] = entries.map((e) => ({
      ...e,
      is_manually_edited: false,
    }));

    onNext({
      work_items: workItems,
      proposals,
      algorithm_result: result,
      entries: editableEntries,
    });
  }

  const diff = algorithmResult?.amount_difference ?? 0;
  const absDiff = Math.abs(diff);

  return (
    <div className="space-y-6">
      {/* Proposals table */}
      <Section title="Propozycja podziału godzin">
        <ProportionTable
          proposals={proposals}
          onProportionChange={handleProportionChange}
        />
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            className="text-sm"
            onClick={() => recalculate()}
          >
            Przelicz
          </Button>
          <p className="text-sm text-slate-600">
            Proponowana suma:{" "}
            <span className="font-semibold text-slate-900">
              {formatPLN(proposals.reduce((s, p) => s + p.amount_total, 0))}
            </span>
          </p>
        </div>
      </Section>

      {/* Difference alert */}
      {algorithmResult && (
        <DifferenceAlert
          difference={diff}
          absDifference={absDiff}
          correction={correction}
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Confirmation */}
      <Section title="Zatwierdzenie">
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 size-4 rounded border-slate-300 accent-blue-600"
            />
            <span className="text-sm text-slate-700">
              Potwierdzam proponowany podział godzin i chcę wygenerować raport
            </span>
          </label>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onBack}>
              ← Wstecz
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!confirmed}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 min-w-44"
            >
              Generuj raport →
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}

function DifferenceAlert({
  difference,
  absDifference,
  correction,
}: {
  difference: number;
  absDifference: number;
  correction: ReturnType<typeof suggestCorrection>;
}) {
  if (absDifference < 1) return null;

  const isAcceptable = !correction;

  if (isAcceptable) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle className="size-4 text-green-600 shrink-0 mt-0.5" />
        <p className="text-sm text-green-700">
          Różnica {formatPLN(Math.abs(difference))} — akceptowalna (mniejsza niż
          minimalny krok korekty)
        </p>
      </div>
    );
  }

  const isPositive = difference > 0;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        isPositive
          ? "border-amber-200 bg-amber-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <AlertTriangle
        className={`size-4 shrink-0 mt-0.5 ${
          isPositive ? "text-amber-600" : "text-red-600"
        }`}
      />
      <div className="text-sm space-y-1">
        <p className={isPositive ? "text-amber-700" : "text-red-700"}>
          Różnica{" "}
          {isPositive ? "+" : ""}
          {formatPLN(difference)} —{" "}
          {isPositive
            ? "kwota jest za niska"
            : "kwota jest za wysoka"}
          .
        </p>
        {correction && (
          <p className={`text-xs ${isPositive ? "text-amber-600" : "text-red-600"}`}>
            <Info className="inline size-3 mr-1" />
            Sugestia: {isPositive ? "dodaj" : "odejmij"} 0,5 h dla &bdquo;
            {correction.description}&rdquo; w{" "}
            {isPositive ? "ostatnim" : "pierwszym"} dniu roboczym (
            {isPositive ? "+" : ""}
            {formatPLN(correction.amount_delta)})
          </p>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

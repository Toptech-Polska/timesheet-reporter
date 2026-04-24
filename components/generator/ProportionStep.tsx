"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Info, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
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
  WorkItem,
} from "@/lib/algorithm/types";
import { formatPLN } from "@/lib/utils/currency";
import { roundToHundred } from "@/lib/utils/rounding";
import { addWorkItemToSchema } from "@/app/actions/schemas";

const DEFAULT_CATEGORIES = [
  "Rozwój",
  "Finanse",
  "Sprzedaż i marketing",
  "Analiza/Rozwój",
  "Rozwój/Finanse",
];

interface AddForm {
  description: string;
  category: string;
  hourly_rate: number | "";
  proportion: number | "";
  saveToSchema: boolean;
}

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
  const { showToast } = useToast();

  const [proposals, setProposals] = useState<ProportionProposal[]>(
    wizardState.proposals
  );
  const [workItems, setWorkItems] = useState(wizardState.work_items);
  const [algorithmResult, setAlgorithmResult] = useState<AlgorithmResult | null>(
    wizardState.algorithm_result
  );
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>({
    description: "",
    category: "",
    hourly_rate: 100,
    proportion: 1.0,
    saveToSchema: false,
  });
  const [addErrors, setAddErrors] = useState<Partial<Record<keyof AddForm, string>>>({});
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const newlyAddedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const correction = algorithmResult ? suggestCorrection(algorithmResult) : null;

  const usedCategories = proposals.map((p) => p.category);
  const allCategories = Array.from(
    new Set(DEFAULT_CATEGORIES.concat(usedCategories))
  );

  function recalculate(updatedWorkItems = workItems) {
    try {
      const input: AlgorithmInput = {
        target_amount: wizardState.target_amount,
        work_items: updatedWorkItems,
        working_days: wizardState.working_days,
        max_hours_per_day: wizardState.max_hours_per_day,
      };
      const newProposals = generateProposals(input);
      const newEntries = distributeHours(
        newProposals,
        wizardState.working_days,
        wizardState.max_hours_per_day
      );
      const newResult = calculateResult(
        newProposals,
        newEntries,
        wizardState.target_amount
      );
      setProposals(newProposals);
      setAlgorithmResult(newResult);
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

  function handleDelete(itemId: string) {
    const filtered = workItems.filter((item) => item.id !== itemId);
    setWorkItems(filtered);
    recalculate(filtered);
  }

  function validateAddForm(): boolean {
    const errors: Partial<Record<keyof AddForm, string>> = {};
    if (!addForm.description.trim()) {
      errors.description = "Opis jest wymagany";
    }
    if (!addForm.category.trim()) {
      errors.category = "Kategoria jest wymagana";
    }
    if (addForm.hourly_rate === "" || Number(addForm.hourly_rate) < 100) {
      errors.hourly_rate = "Stawka musi wynosić co najmniej 100 PLN";
    }
    if (addForm.proportion === "" || Number(addForm.proportion) < 0.5) {
      errors.proportion = "Proporcja musi wynosić co najmniej 0,5";
    }
    setAddErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleAddCustom() {
    if (!validateAddForm()) return;

    setAddSubmitting(true);
    try {
      const newId = `custom_${Date.now()}`;
      const newItem: WorkItem = {
        id: newId,
        description: addForm.description.trim(),
        category: addForm.category.trim(),
        hourly_rate: Number(addForm.hourly_rate),
        proportion: Number(addForm.proportion),
        active_from: null,
        active_until: null,
      };

      const updatedItems = [...workItems, newItem];
      setWorkItems(updatedItems);
      recalculate(updatedItems);

      if (newlyAddedTimer.current) clearTimeout(newlyAddedTimer.current);
      setNewlyAddedId(newId);
      newlyAddedTimer.current = setTimeout(() => setNewlyAddedId(null), 2000);

      if (addForm.saveToSchema && wizardState.schema_id) {
        const result = await addWorkItemToSchema(wizardState.schema_id, {
          description: newItem.description,
          category: newItem.category,
          hourly_rate: newItem.hourly_rate,
          proportion: newItem.proportion,
        });
        if ("success" in result) {
          showToast(
            `Pozycja została dodana do schematu ${wizardState.schema_name}`,
            "success"
          );
        } else {
          showToast(result.error, "error");
        }
      }

      setShowAddForm(false);
      setAddForm({
        description: "",
        category: "",
        hourly_rate: 100,
        proportion: 1.0,
        saveToSchema: false,
      });
      setAddErrors({});
    } finally {
      setAddSubmitting(false);
    }
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

  const calculatedAmount = proposals.reduce((sum, p) => sum + p.amount_total, 0);
  const difference = wizardState.target_amount - calculatedAmount;
  const absDiff = Math.abs(difference);

  const inputCls =
    "w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50";

  return (
    <div className="space-y-6">
      {/* Proposals table */}
      <Section title="Propozycja podziału godzin">
        <ProportionTable
          proposals={proposals}
          onProportionChange={handleProportionChange}
          onDelete={handleDelete}
          newlyAddedId={newlyAddedId}
        />

        {/* Inline add form */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            showAddForm ? "max-h-[520px] opacity-100 mt-5" : "max-h-0 opacity-0"
          }`}
        >
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-4">
            <p className="text-sm font-semibold text-blue-800">
              Nowa pozycja spoza schematu
            </p>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Opis wykonywanej pracy <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Np. Tworzenie dokumentacji, analiza wymagań…"
                value={addForm.description}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, description: e.target.value }))
                }
                className={`${inputCls} resize-none ${
                  addErrors.description ? "border-red-400" : "border-slate-300"
                }`}
              />
              {addErrors.description && (
                <p className="text-xs text-red-600">{addErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Kategoria <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="add-cat-list"
                  placeholder="Wybierz lub wpisz…"
                  value={addForm.category}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className={`${inputCls} ${
                    addErrors.category ? "border-red-400" : "border-slate-300"
                  }`}
                />
                <datalist id="add-cat-list">
                  {allCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {addErrors.category && (
                  <p className="text-xs text-red-600">{addErrors.category}</p>
                )}
              </div>

              {/* Hourly rate */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Stawka/h (PLN) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  placeholder="np. 200"
                  value={addForm.hourly_rate}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      hourly_rate: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (isFinite(val) && val > 0) {
                      setAddForm((f) => ({ ...f, hourly_rate: roundToHundred(val) }));
                    }
                  }}
                  className={`${inputCls} ${
                    addErrors.hourly_rate ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {addErrors.hourly_rate && (
                  <p className="text-xs text-red-600">{addErrors.hourly_rate}</p>
                )}
              </div>

              {/* Proportion */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Proporcja <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="1.0"
                  value={addForm.proportion}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      proportion: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  className={`${inputCls} ${
                    addErrors.proportion ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {addErrors.proportion && (
                  <p className="text-xs text-red-600">{addErrors.proportion}</p>
                )}
              </div>
            </div>

            {/* Save to schema checkbox (only when schema is selected) */}
            {wizardState.schema_id && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.saveToSchema}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, saveToSchema: e.target.checked }))
                  }
                  className="size-4 rounded border-slate-300 accent-blue-600"
                />
                <span className="text-sm text-slate-700">
                  Zapisz tę pozycję do schematu{" "}
                  <span className="font-medium">{wizardState.schema_name}</span>
                </span>
              </label>
            )}

            {/* Form buttons */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                onClick={handleAddCustom}
                disabled={addSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-sm"
              >
                {addSubmitting ? "Dodawanie…" : "Dodaj do raportu"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-sm"
                onClick={() => {
                  setShowAddForm(false);
                  setAddErrors({});
                }}
              >
                <X className="size-3.5 mr-1" />
                Anuluj
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
          {/* Add button */}
          {!showAddForm && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Plus className="size-4" />
              Dodaj pozycję spoza schematu
            </button>
          )}

          {/* Recalculate + sum */}
          <div className="flex items-center justify-between">
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
        </div>
      </Section>

      {/* Difference alert */}
      {proposals.length > 0 && (
        <DifferenceAlert
          difference={difference}
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
  if (absDifference === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle className="size-4 text-green-600 shrink-0 mt-0.5" />
        <p className="text-sm text-green-700">Suma zgodna z kwotą docelową</p>
      </div>
    );
  }

  if (absDifference <= 50) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle className="size-4 text-green-600 shrink-0 mt-0.5" />
        <p className="text-sm text-green-700">
          Różnica {formatPLN(absDifference)} — akceptowalna
        </p>
      </div>
    );
  }

  const isPositive = difference > 0;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        isPositive ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"
      }`}
    >
      <AlertTriangle
        className={`size-4 shrink-0 mt-0.5 ${
          isPositive ? "text-amber-600" : "text-red-600"
        }`}
      />
      <div className="text-sm space-y-1">
        <p className={isPositive ? "text-amber-700" : "text-red-700"}>
          Różnica {isPositive ? "+" : ""}
          {formatPLN(difference)} —{" "}
          {isPositive ? "za mało godzin" : "za dużo godzin"}.
        </p>
        {correction && (
          <p
            className={`text-xs ${
              isPositive ? "text-amber-600" : "text-red-600"
            }`}
          >
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

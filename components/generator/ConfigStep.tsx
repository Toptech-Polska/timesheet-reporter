"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WizardState, SchemaOption } from "./types";
import type { WorkItem } from "@/lib/algorithm/types";
import {
  getWorkingDaysInMonth,
  filterActiveWorkItems,
  getISOWeekNumber,
} from "@/lib/algorithm/helpers";
import { runAlgorithm } from "@/lib/algorithm/generator";
import { formatPLN } from "@/lib/utils/currency";

const MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const YEARS = [2024, 2025, 2026, 2027];

const DAY_ABBR: Record<number, string> = {
  1: "Pon", 2: "Wt", 3: "Śr", 4: "Czw", 5: "Pt", 6: "Sob", 7: "Nie",
};

interface ConfigStepProps {
  schemas: SchemaOption[];
  wizardState: WizardState;
  onNext: (partial: Partial<WizardState>) => void;
}

export function ConfigStep({
  schemas,
  wizardState,
  onNext,
}: ConfigStepProps) {
  const [schemaId, setSchemaId] = useState<string>(
    wizardState.schema_id ?? ""
  );
  const [month, setMonth] = useState(wizardState.period_month);
  const [year, setYear] = useState(wizardState.period_year);
  const [targetRaw, setTargetRaw] = useState(
    wizardState.target_amount > 0 ? String(wizardState.target_amount) : ""
  );
  const [targetAmount, setTargetAmount] = useState(wizardState.target_amount);
  const [workItems, setWorkItems] = useState<WorkItem[]>(wizardState.work_items);
  const [maxHours, setMaxHours] = useState(wizardState.max_hours_per_day);
  const [allDays, setAllDays] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(
    new Set(wizardState.working_days)
  );
  const [loadingItems, setLoadingItems] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const selectedSchema = schemas.find((s) => s.id === schemaId);

  // Fetch work items when schema changes
  useEffect(() => {
    if (!schemaId) {
      setWorkItems([]);
      setSchemaError(null);
      return;
    }
    setLoadingItems(true);
    setSchemaError(null);
    const supabase = createClient();
    supabase
      .schema("timesheet")
      .from("schema_work_items")
      .select("*")
      .eq("schema_id", schemaId)
      .order("sort_order")
      .then(({ data, error: err }) => {
        setLoadingItems(false);
        if (err || !data) {
          setSchemaError("Nie udało się załadować pozycji schematu.");
          return;
        }
        setWorkItems(
          data.map((item) => ({
            id: item.id as string,
            description: (item.description as string) ?? "",
            category: (item.category as string) ?? "",
            hourly_rate: Number(item.hourly_rate) || 0,
            proportion: Number(item.proportion) || 1,
            active_from: (item.active_from as string | null) ?? null,
            active_until: (item.active_until as string | null) ?? null,
          }))
        );
      });
  }, [schemaId]);

  // Regenerate working days when schema/month/year changes
  useEffect(() => {
    if (!selectedSchema) {
      setAllDays([]);
      setSelectedDays(new Set());
      return;
    }
    const days = getWorkingDaysInMonth(
      year,
      month,
      selectedSchema.working_days_of_week
    );
    setAllDays(days);
    setSelectedDays(new Set(days));
    setMaxHours(selectedSchema.max_hours_per_day);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaId, month, year]);

  function toggleDay(date: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function handleTargetChange(raw: string) {
    setTargetRaw(raw);
    const num = parseFloat(raw.replace(",", ".").replace(/\s/g, ""));
    setTargetAmount(isNaN(num) ? 0 : num);
  }

  function handleNext() {
    setError(null);

    if (!schemaId || workItems.length === 0) {
      setError("Wybierz schemat z co najmniej jedną pozycją pracy.");
      return;
    }

    const chosenDays = Array.from(selectedDays).sort();
    if (chosenDays.length === 0) {
      setError("Wybierz co najmniej jeden dzień roboczy.");
      return;
    }

    if (!targetAmount || targetAmount <= 0) {
      setError("Podaj kwotę docelową większą od 0.");
      return;
    }

    const activeItems = filterActiveWorkItems(workItems, year, month);
    if (activeItems.length === 0) {
      setError("Brak aktywnych pozycji pracy w wybranym miesiącu. Sprawdź daty aktywności pozycji w schemacie.");
      return;
    }

    const minRate = Math.min(...activeItems.map((i) => i.hourly_rate));
    const maxCapacity = chosenDays.length * maxHours * minRate;
    if (targetAmount > maxCapacity) {
      setError(
        `Kwota ${formatPLN(targetAmount)} jest niemożliwa do osiągnięcia przy wybranych dniach ` +
          `(max pojemność: ${formatPLN(maxCapacity)}). ` +
          `Zmniejsz kwotę, zwiększ liczbę dni lub podwyższ stawki.`
      );
      return;
    }

    setLoading(true);
    try {
      const result = runAlgorithm({
        target_amount: targetAmount,
        work_items: activeItems,
        working_days: chosenDays,
        max_hours_per_day: maxHours,
      });

      onNext({
        schema_id: schemaId,
        schema_name: selectedSchema!.name,
        work_items: activeItems,
        period_month: month,
        period_year: year,
        target_amount: targetAmount,
        working_days: chosenDays,
        max_hours_per_day: maxHours,
        proposals: result.proposals,
        algorithm_result: result,
        entries: result.entries.map((e) => ({
          ...e,
          is_manually_edited: false,
        })),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Błąd podczas obliczania proporcji."
      );
    } finally {
      setLoading(false);
    }
  }

  // Build week groups for calendar
  const weekGroups = buildWeekGroups(allDays);
  const sortedWeeks = Array.from(weekGroups.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Schema */}
      <Section title="Schemat pracy">
        <div className="space-y-1.5">
          <Label htmlFor="schema">
            Wybierz schemat <span className="text-red-500">*</span>
          </Label>
          {schemas.length === 0 ? (
            <p className="text-sm text-amber-600">
              Brak aktywnych schematów.{" "}
              <a href="/schematy/nowy" className="underline">
                Utwórz schemat
              </a>{" "}
              przed wygenerowaniem raportu.
            </p>
          ) : (
            <select
              id="schema"
              value={schemaId}
              onChange={(e) => setSchemaId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">-- Wybierz schemat --</option>
              {schemas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} • max {s.max_hours_per_day} h/dzień
                </option>
              ))}
            </select>
          )}
          {schemaError && (
            <p className="text-sm text-red-600">{schemaError}</p>
          )}
          {loadingItems && (
            <p className="text-sm text-slate-400">
              Ładowanie pozycji schematu…
            </p>
          )}
          {!loadingItems && workItems.length > 0 && (
            <p className="text-sm text-slate-500">
              Załadowano{" "}
              <span className="font-medium">{workItems.length}</span> pozycji
              pracy
            </p>
          )}
        </div>
      </Section>

      {/* Period */}
      <Section title="Okres rozliczeniowy">
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="month">Miesiąc</Label>
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="year">Rok</Label>
            <select
              id="year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* Target amount */}
      <Section title="Kwota docelowa netto">
        <div className="max-w-sm space-y-1.5">
          <Label htmlFor="target">
            Kwota netto (PLN) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="target"
            type="text"
            inputMode="numeric"
            placeholder="np. 10 000"
            value={targetRaw}
            onChange={(e) => handleTargetChange(e.target.value)}
          />
          {targetAmount > 0 && (
            <p className="text-xs text-slate-400">{formatPLN(targetAmount)}</p>
          )}
        </div>
      </Section>

      {/* Working days calendar */}
      {selectedSchema && allDays.length > 0 && (
        <Section title="Dni robocze">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Wybranych:{" "}
              <span className="font-semibold">{selectedDays.size}</span> dni
              roboczych
            </p>
            <div className="overflow-x-auto">
              <table className="text-sm select-none">
                <thead>
                  <tr>
                    <th className="pr-3 pb-2 text-left text-xs font-medium text-slate-400">
                      Tyg.
                    </th>
                    {selectedSchema.working_days_of_week.map((d) => (
                      <th
                        key={d}
                        className="w-11 pb-2 text-center text-xs font-medium text-slate-400"
                      >
                        {DAY_ABBR[d]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedWeeks.map((weekNum) => {
                    const weekDates = weekGroups.get(weekNum)!;
                    return (
                      <tr key={weekNum}>
                        <td className="pr-3 py-0.5 text-xs text-slate-400">
                          {weekNum}
                        </td>
                        {selectedSchema.working_days_of_week.map((dayOfWeek) => {
                          const date = weekDates.find((d) => {
                            const [yr, mo, dy] = d.split("-").map(Number);
                            const js = new Date(yr, mo - 1, dy).getDay();
                            return (js === 0 ? 7 : js) === dayOfWeek;
                          });
                          if (!date) {
                            return <td key={dayOfWeek} className="w-11" />;
                          }
                          const dayNum = parseInt(date.split("-")[2]);
                          const isSelected = selectedDays.has(date);
                          return (
                            <td key={dayOfWeek} className="py-0.5 px-0.5">
                              <button
                                type="button"
                                onClick={() => toggleDay(date)}
                                className={`flex size-9 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                                  isSelected
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                }`}
                              >
                                {dayNum}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleNext}
          disabled={loading || !schemaId || schemas.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white border-0 min-w-36"
        >
          {loading ? "Obliczam…" : "Dalej →"}
        </Button>
      </div>
    </div>
  );
}

function buildWeekGroups(dates: string[]): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  for (const date of dates) {
    const wn = getISOWeekNumber(date);
    const existing = groups.get(wn) ?? [];
    groups.set(wn, [...existing, date]);
  }
  return groups;
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

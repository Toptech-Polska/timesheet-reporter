"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WizardState, SchemaOption, WizardSchemaPick } from "./types";
import type { MultiSchemaMode, WorkItem } from "@/lib/algorithm/types";
import { getWorkingDaysInMonth, getISOWeekNumber } from "@/lib/algorithm/helpers";
import {
  runMultiSchemaAlgorithm,
  buildSchemaSelections,
} from "@/lib/algorithm/multi";
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

/** Wewnętrzny stan jednego wybranego schematu. */
interface Pick {
  schemaId: string;
  weight: number | ""; // % w trybie wag
}

export function ConfigStep({ schemas, wizardState, onNext }: ConfigStepProps) {
  const [picks, setPicks] = useState<Pick[]>(() =>
    wizardState.schema_picks.length > 0
      ? wizardState.schema_picks.map((p) => ({
          schemaId: p.schema_id,
          weight: p.weight ?? "",
        }))
      : [{ schemaId: "", weight: "" }]
  );
  const [mode, setMode] = useState<MultiSchemaMode>(wizardState.mode);
  const [month, setMonth] = useState(wizardState.period_month);
  const [year, setYear] = useState(wizardState.period_year);
  const [targetRaw, setTargetRaw] = useState(
    wizardState.target_amount > 0 ? String(wizardState.target_amount) : ""
  );
  const [targetAmount, setTargetAmount] = useState(wizardState.target_amount);
  const [maxHours, setMaxHours] = useState(wizardState.max_hours_per_day);
  const [itemsBySchema, setItemsBySchema] = useState<Record<string, WorkItem[]>>(
    () =>
      Object.fromEntries(
        wizardState.schema_picks.map((p) => [p.schema_id, p.work_items])
      )
  );
  const [loadingSchemaIds, setLoadingSchemaIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedDays, setSelectedDays] = useState<Set<string>>(
    new Set(wizardState.working_days)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Chroni ręcznie wybrane dni (np. odznaczony urlop) przed nadpisaniem
  // przy powrocie z kroku 2/3 do kroku 1 (remount komponentu).
  const hydratedFromWizard = useRef(false);

  const pickedIds = picks.map((p) => p.schemaId).filter(Boolean);
  const pickedSchemas = pickedIds
    .map((id) => schemas.find((s) => s.id === id))
    .filter(Boolean) as SchemaOption[];
  const firstSchema = pickedSchemas[0];
  const isMulti = pickedIds.length > 1;

  // Ładowanie pozycji pracy dla nowo wybranych schematów
  useEffect(() => {
    const missing = pickedIds.filter(
      (id) => !(id in itemsBySchema) && !loadingSchemaIds.has(id)
    );
    if (missing.length === 0) return;

    setLoadingSchemaIds((prev) => new Set(Array.from(prev).concat(missing)));
    setSchemaError(null);
    const supabase = createClient();

    missing.forEach((schemaId) => {
      supabase
        .schema("timesheet")
        .from("schema_work_items")
        .select("*")
        .eq("schema_id", schemaId)
        .order("sort_order")
        .then(({ data, error: err }) => {
          setLoadingSchemaIds((prev) => {
            const next = new Set(prev);
            next.delete(schemaId);
            return next;
          });
          if (err || !data) {
            setSchemaError("Nie udało się załadować pozycji schematu.");
            return;
          }
          setItemsBySchema((prev) => ({
            ...prev,
            [schemaId]: data.map((item) => ({
              id: item.id as string,
              description: (item.description as string) ?? "",
              category: (item.category as string) ?? "",
              hourly_rate: Number(item.hourly_rate) || 0,
              proportion: Number(item.proportion) || 1,
              active_from: (item.active_from as string | null) ?? null,
              active_until: (item.active_until as string | null) ?? null,
            })),
          }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedIds.join("|")]);

  // Unia dni roboczych wszystkich wybranych schematów
  const unionPatterns = Array.from(
    new Set(pickedSchemas.flatMap((s) => s.working_days_of_week))
  ).sort((a, b) => a - b);
  const allDays = pickedSchemas.length
    ? getWorkingDaysInMonth(year, month, unionPatterns)
    : [];

  // Regeneracja zaznaczonych dni przy zmianie schematów/miesiąca/roku
  useEffect(() => {
    if (pickedSchemas.length === 0) {
      setSelectedDays(new Set());
      return;
    }
    const days = getWorkingDaysInMonth(year, month, unionPatterns);

    // Pierwsze zamontowanie po powrocie do kroku 1: przywróć dni wybrane
    // wcześniej w kreatorze zamiast resetować do pełnego zestawu.
    if (
      !hydratedFromWizard.current &&
      wizardState.working_days.length > 0 &&
      wizardState.schema_picks.map((p) => p.schema_id).join("|") ===
        pickedIds.join("|") &&
      wizardState.period_month === month &&
      wizardState.period_year === year
    ) {
      hydratedFromWizard.current = true;
      setSelectedDays(new Set(wizardState.working_days));
      return;
    }
    hydratedFromWizard.current = true;

    setSelectedDays(new Set(days));
    if (firstSchema) setMaxHours(firstSchema.max_hours_per_day);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedIds.join("|"), month, year]);

  function updatePick(index: number, partial: Partial<Pick>) {
    setPicks((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...partial } : p))
    );
  }

  function addPick() {
    if (picks.length >= schemas.length) return;
    setPicks((prev) => [...prev, { schemaId: "", weight: "" }]);
  }

  function removePick(index: number) {
    setPicks((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ schemaId: "", weight: "" }];
    });
  }

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

  const weightsSum = picks.reduce(
    (s, p) => s + (p.weight === "" ? 0 : Number(p.weight)),
    0
  );
  const weightsValid = !isMulti || mode === "cascade" || weightsSum === 100;

  function buildPicks(): WizardSchemaPick[] {
    return picks
      .filter((p) => p.schemaId)
      .map((p) => {
        const s = schemas.find((x) => x.id === p.schemaId)!;
        return {
          schema_id: s.id,
          schema_name: s.name,
          max_hours_per_day: s.max_hours_per_day,
          working_days_of_week: s.working_days_of_week,
          work_items: itemsBySchema[s.id] ?? [],
          weight:
            isMulti && mode === "weights" && p.weight !== ""
              ? Number(p.weight)
              : null,
        };
      });
  }

  function handleNext() {
    setError(null);

    const validPicks = picks.filter((p) => p.schemaId);
    if (validPicks.length === 0) {
      setError("Wybierz co najmniej schemat priorytetowy.");
      return;
    }
    const uniqueIds = new Set(validPicks.map((p) => p.schemaId));
    if (uniqueIds.size !== validPicks.length) {
      setError("Każdy schemat może być wybrany tylko raz.");
      return;
    }
    for (const p of validPicks) {
      if (!itemsBySchema[p.schemaId] || itemsBySchema[p.schemaId].length === 0) {
        const s = schemas.find((x) => x.id === p.schemaId);
        setError(
          `Schemat „${s?.name ?? ""}" nie ma pozycji pracy — uzupełnij go lub usuń z listy.`
        );
        return;
      }
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

    const effectiveMode: MultiSchemaMode =
      validPicks.length > 1 ? mode : "cascade";

    if (validPicks.length > 1 && effectiveMode === "weights" && !weightsValid) {
      setError(
        `Suma wag procentowych musi wynosić 100% (obecnie: ${weightsSum}%).`
      );
      return;
    }

    setLoading(true);
    try {
      const wizardPicks = buildPicks();
      const selections = buildSchemaSelections(
        wizardPicks,
        year,
        month,
        chosenDays
      );

      const emptySchema = selections.find((s) => s.work_items.length === 0);
      if (emptySchema) {
        setError(
          `Brak aktywnych pozycji pracy w wybranym miesiącu (schemat „${emptySchema.schema_name}"). Sprawdź daty aktywności pozycji.`
        );
        return;
      }
      const noDays = selections.find((s) => s.working_days.length === 0);
      if (noDays) {
        setError(
          `Schemat „${noDays.schema_name}" nie ma żadnego zaznaczonego dnia roboczego w tym miesiącu.`
        );
        return;
      }

      const result = runMultiSchemaAlgorithm({
        target_amount: targetAmount,
        mode: effectiveMode,
        schemas: selections,
        max_hours_per_day: maxHours,
      });

      if (result.warnings.length > 0) {
        setError(result.warnings.join(" "));
        return;
      }

      onNext({
        schema_picks: wizardPicks,
        mode: effectiveMode,
        schema_id: wizardPicks[0].schema_id,
        schema_name: wizardPicks[0].schema_name,
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
        err instanceof Error ? err.message : "Błąd podczas obliczania proporcji."
      );
    } finally {
      setLoading(false);
    }
  }

  // Kalendarz: grupowanie tygodniami
  const weekGroups = buildWeekGroups(allDays);
  const sortedWeeks = Array.from(weekGroups.keys()).sort((a, b) => a - b);

  const selectCls =
    "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="space-y-6">
      {/* Schematy */}
      <Section title="Schematy pracy">
        {schemas.length === 0 ? (
          <p className="text-sm text-amber-600">
            Brak aktywnych schematów.{" "}
            <a href="/schematy/nowy" className="underline">
              Utwórz schemat
            </a>{" "}
            przed wygenerowaniem raportu.
          </p>
        ) : (
          <div className="space-y-4">
            {picks.map((pick, index) => {
              const available = schemas.filter(
                (s) =>
                  s.id === pick.schemaId ||
                  !picks.some((p, i) => i !== index && p.schemaId === s.id)
              );
              const itemsCount = pick.schemaId
                ? itemsBySchema[pick.schemaId]?.length
                : undefined;
              const isLoading =
                pick.schemaId !== "" && loadingSchemaIds.has(pick.schemaId);

              return (
                <div key={index} className="space-y-1.5">
                  <Label htmlFor={`schema-${index}`}>
                    {index === 0 ? (
                      <>
                        Schemat 1 — priorytet{" "}
                        <span className="text-red-500">*</span>
                      </>
                    ) : (
                      <>Schemat {index + 1}</>
                    )}
                  </Label>
                  <div className="flex items-center gap-2">
                    <select
                      id={`schema-${index}`}
                      value={pick.schemaId}
                      onChange={(e) =>
                        updatePick(index, { schemaId: e.target.value })
                      }
                      className={selectCls}
                    >
                      <option value="">-- Wybierz schemat --</option>
                      {available.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} • max {s.max_hours_per_day} h/dzień
                        </option>
                      ))}
                    </select>

                    {isMulti && mode === "weights" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          step={1}
                          placeholder="%"
                          value={pick.weight}
                          onChange={(e) =>
                            updatePick(index, {
                              weight:
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value),
                            })
                          }
                          className="w-20 text-right"
                          aria-label={`Waga schematu ${index + 1} w procentach`}
                        />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                    )}

                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removePick(index)}
                        className="shrink-0 p-2 text-slate-400 hover:text-red-600 transition-colors"
                        aria-label={`Usuń schemat ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  {isLoading && (
                    <p className="text-sm text-slate-400">
                      Ładowanie pozycji schematu…
                    </p>
                  )}
                  {!isLoading && itemsCount !== undefined && (
                    <p className="text-sm text-slate-500">
                      Załadowano <span className="font-medium">{itemsCount}</span>{" "}
                      pozycji pracy
                    </p>
                  )}
                </div>
              );
            })}

            {picks.length < schemas.length && (
              <button
                type="button"
                onClick={addPick}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Plus className="size-4" />
                Dodaj kolejny schemat
              </button>
            )}

            {schemaError && (
              <p className="text-sm text-red-600">{schemaError}</p>
            )}

            {/* Tryb łączenia schematów */}
            {isMulti && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                <Label>Sposób łączenia schematów</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <ModeButton
                    active={mode === "cascade"}
                    onClick={() => setMode("cascade")}
                    title="Kaskada priorytetów"
                    description="Schemat 1 wypełnia raport; kolejne wchodzą dopiero, gdy zabraknie jego pojemności"
                  />
                  <ModeButton
                    active={mode === "weights"}
                    onClick={() => setMode("weights")}
                    title="Wagi procentowe"
                    description="Godziny raportu dzielone między schematy wg podanych procentów (suma 100%)"
                  />
                </div>
                {mode === "weights" && (
                  <p
                    className={`text-sm ${
                      weightsSum === 100 ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    Suma wag: <span className="font-semibold">{weightsSum}%</span>
                    {weightsSum !== 100 && " — musi wynosić 100%"}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Okres */}
      <Section title="Okres rozliczeniowy">
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="month">Miesiąc</Label>
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={selectCls}
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
              className={selectCls}
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

      {/* Kwota docelowa */}
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

      {/* Kalendarz dni roboczych (unia dni wszystkich schematów) */}
      {pickedSchemas.length > 0 && allDays.length > 0 && (
        <Section title="Dni robocze">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Wybranych:{" "}
              <span className="font-semibold">{selectedDays.size}</span> dni
              roboczych
              {isMulti && (
                <span className="text-slate-400">
                  {" "}
                  (suma dni wszystkich wybranych schematów)
                </span>
              )}
            </p>
            <div className="overflow-x-auto">
              <table className="text-sm select-none">
                <thead>
                  <tr>
                    <th className="pr-3 pb-2 text-left text-xs font-medium text-slate-400">
                      Tyg.
                    </th>
                    {unionPatterns.map((d) => (
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
                        {unionPatterns.map((dayOfWeek) => {
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

            {/* Globalny limit godzin dziennie */}
            <div className="max-w-sm space-y-1.5 pt-2">
              <Label htmlFor="max-hours">
                Maks. godzin dziennie (wspólny limit dla wszystkich schematów)
              </Label>
              <Input
                id="max-hours"
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={maxHours}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setMaxHours(Math.round(v * 2) / 2);
                }}
              />
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
          disabled={
            loading ||
            pickedIds.length === 0 ||
            schemas.length === 0 ||
            (isMulti && mode === "weights" && !weightsValid)
          }
          className="bg-blue-600 hover:bg-blue-700 text-white border-0 min-w-36"
        >
          {loading ? "Obliczam…" : "Dalej →"}
        </Button>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${
        active
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          active
            ? "text-blue-700 dark:text-blue-300"
            : "text-slate-700 dark:text-slate-300"
        }`}
      >
        {title}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </button>
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
    <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

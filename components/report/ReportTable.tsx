"use client";

import { useMemo, Fragment } from "react";
import type { EditableEntry } from "@/components/generator/types";
import { ReportCell } from "./ReportCell";
import { DaySummaryRow } from "./DaySummaryRow";
import { WeekSummaryRow } from "./WeekSummaryRow";
import { MonthSummaryRow } from "./MonthSummaryRow";
import { getISOWeekNumber } from "@/lib/algorithm/helpers";
import { formatPLN } from "@/lib/utils/currency";
import { formatHours } from "@/lib/utils/rounding";

interface ReportTableProps {
  entries: EditableEntry[];
  month: number;
  year: number;
  onUpdateEntry?: (
    index: number,
    field: keyof EditableEntry,
    value: string | number
  ) => void;
  readOnly?: boolean;
}

interface DayGroup {
  date: string;
  dateShort: string;
  entries: EditableEntry[];
  indices: number[];
}

interface WeekGroup {
  weekNum: number;
  days: DayGroup[];
}

function buildWeekGroups(entries: EditableEntry[]): WeekGroup[] {
  const byDate = new Map<string, DayGroup>();
  entries.forEach((entry, i) => {
    let g = byDate.get(entry.work_date);
    if (!g) {
      const [yr, mo, dy] = entry.work_date.split("-");
      g = {
        date: entry.work_date,
        dateShort: `${dy}.${mo}.${yr}`,
        entries: [],
        indices: [],
      };
      byDate.set(entry.work_date, g);
    }
    g.entries.push(entry);
    g.indices.push(i);
  });

  const byWeek = new Map<number, DayGroup[]>();
  byDate.forEach((dayGroup) => {
    const wn = getISOWeekNumber(dayGroup.date);
    const existing = byWeek.get(wn) ?? [];
    byWeek.set(wn, [...existing, dayGroup]);
  });

  const weeks: WeekGroup[] = [];
  const sortedWeekNums = Array.from(byWeek.keys()).sort((a, b) => a - b);
  for (const weekNum of sortedWeekNums) {
    weeks.push({
      weekNum,
      days: byWeek.get(weekNum)!.sort((a, b) =>
        a.date < b.date ? -1 : 1
      ),
    });
  }
  return weeks;
}

export function ReportTable({
  entries,
  month,
  year,
  onUpdateEntry = () => {},
  readOnly = false,
}: ReportTableProps) {
  const weekGroups = useMemo(() => buildWeekGroups(entries), [entries]);

  const monthHours = entries.reduce((s, e) => s + e.hours, 0);
  const monthAmount = entries.reduce((s, e) => s + e.line_total, 0);

  return (
    <table className="w-full text-sm border-collapse min-w-[750px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      <thead>
        <tr className="bg-slate-700 text-white">
          <th className="px-3 py-3 text-left font-semibold w-[90px]">Data</th>
          <th className="px-3 py-3 text-left font-semibold w-[110px]">Dzień</th>
          <th className="px-3 py-3 text-left font-semibold">Wykonywana praca</th>
          <th className="px-3 py-3 text-left font-semibold w-[120px]">Kategoria</th>
          <th className="px-3 py-3 text-right font-semibold w-[70px]">h</th>
          <th className="px-3 py-3 text-right font-semibold w-[100px]">
            Stawka/h
          </th>
          <th className="px-3 py-3 text-right font-semibold w-[100px]">
            Kwota PLN
          </th>
        </tr>
      </thead>
      <tbody>
        {weekGroups.map((week) => {
          const weekHours = week.days.reduce(
            (s, d) => s + d.entries.reduce((ss, e) => ss + e.hours, 0),
            0
          );
          const weekAmount = week.days.reduce(
            (s, d) => s + d.entries.reduce((ss, e) => ss + e.line_total, 0),
            0
          );

          return (
            <Fragment key={`week-${week.weekNum}`}>
              {week.days.map((dayGroup) => {
                const dayHours = dayGroup.entries.reduce(
                  (s, e) => s + e.hours,
                  0
                );
                const dayAmount = dayGroup.entries.reduce(
                  (s, e) => s + e.line_total,
                  0
                );

                return (
                  <Fragment key={`day-${dayGroup.date}`}>
                    {dayGroup.entries.map((entry, i) => {
                      const entryIdx = dayGroup.indices[i];
                      const isFirst = i === 0;
                      return (
                        <tr
                          key={`entry-${entryIdx}`}
                          className={`border-b border-slate-100 dark:border-slate-700 ${
                            entry.is_manually_edited
                              ? "bg-amber-50 dark:bg-amber-950/30"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          {isFirst && (
                            <>
                              <td
                                rowSpan={dayGroup.entries.length}
                                className="px-3 py-2 align-top font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700"
                              >
                                {dayGroup.dateShort}
                              </td>
                              <td
                                rowSpan={dayGroup.entries.length}
                                className="px-3 py-2 align-top text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-700"
                              >
                                {entry.day_of_week}
                              </td>
                            </>
                          )}
                          <td className="px-3 py-2">
                            <ReportCell
                              value={entry.description}
                              type="textarea"
                              readOnly={readOnly}
                              onSave={(v) =>
                                onUpdateEntry(entryIdx, "description", v)
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <ReportCell
                              value={entry.category}
                              readOnly={readOnly}
                              onSave={(v) =>
                                onUpdateEntry(entryIdx, "category", v)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <ReportCell
                              value={entry.hours}
                              displayValue={formatHours(entry.hours)}
                              type="number"
                              step={0.5}
                              min={0.5}
                              className="text-right tabular-nums"
                              readOnly={readOnly}
                              onSave={(v) =>
                                onUpdateEntry(entryIdx, "hours", v)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <ReportCell
                              value={entry.hourly_rate}
                              displayValue={formatPLN(entry.hourly_rate)}
                              type="number"
                              step={100}
                              min={100}
                              className="text-right tabular-nums"
                              readOnly={readOnly}
                              onSave={(v) =>
                                onUpdateEntry(entryIdx, "hourly_rate", v)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {formatPLN(entry.line_total)}
                          </td>
                        </tr>
                      );
                    })}
                    <DaySummaryRow hours={dayHours} amount={dayAmount} />
                  </Fragment>
                );
              })}
              <WeekSummaryRow
                weekNum={week.weekNum}
                startDate={week.days[0].date}
                endDate={week.days[week.days.length - 1].date}
                hours={weekHours}
                amount={weekAmount}
              />
            </Fragment>
          );
        })}
        <MonthSummaryRow
          month={month}
          year={year}
          hours={monthHours}
          amount={monthAmount}
        />
      </tbody>
    </table>
  );
}

import type {
  AlgorithmInput,
  AlgorithmResult,
  DayEntry,
  ProportionProposal,
} from "./types";
import {
  filterActiveWorkItems,
  getDayName,
  getISOWeekNumber,
  roundToHalf,
} from "./helpers";

/**
 * Computes proportional hour allocations for each active work item
 * based on the target amount and weighted-average hourly rate.
 */
export function generateProposals(input: AlgorithmInput): ProportionProposal[] {
  const [year, month] = input.working_days[0].split("-").map(Number);
  const activeItems = filterActiveWorkItems(input.work_items, year, month);

  if (activeItems.length === 0) {
    throw new Error("Brak aktywnych pozycji pracy dla wybranego miesiąca");
  }

  const totalProportion = activeItems.reduce((s, item) => s + item.proportion, 0);
  const avgRate =
    activeItems.reduce((s, item) => s + item.proportion * item.hourly_rate, 0) /
    totalProportion;
  const totalHours = input.target_amount / avgRate;

  return activeItems.map((item) => {
    const hoursTotal = roundToHalf(totalHours * (item.proportion / totalProportion));
    return {
      work_item_id: item.id,
      description: item.description,
      category: item.category,
      hourly_rate: item.hourly_rate,
      proportion: item.proportion,
      hours_total: hoursTotal,
      amount_total: Math.round(hoursTotal * item.hourly_rate * 100) / 100,
    };
  });
}

/**
 * Distributes each proposal's hours across working days.
 *
 * Hours are spread using an adaptive approach (remaining / days_left),
 * rounded to the nearest 0.5 h each day. If a day's total would exceed
 * max_hours_per_day, the excess is pushed forward to the next available day.
 * Hours that cannot be placed (capacity exhausted) are dropped.
 */
export function distributeHours(
  proposals: ProportionProposal[],
  working_days: string[],
  max_hours_per_day: number
): DayEntry[] {
  const n = working_days.length;

  // matrix[dayIndex][proposalIndex] = assigned hours
  const matrix: number[][] = Array.from({ length: n }, () =>
    new Array(proposals.length).fill(0)
  );

  // Step 1–2: Adaptive even distribution per proposal
  for (let i = 0; i < proposals.length; i++) {
    let remaining = proposals[i].hours_total;
    for (let d = 0; d < n; d++) {
      if (d === n - 1) {
        matrix[d][i] = roundToHalf(remaining);
      } else {
        const base = roundToHalf(remaining / (n - d));
        matrix[d][i] = base;
        remaining = Math.round((remaining - base) * 100) / 100;
      }
    }
  }

  // Step 3: Redistribute overflow to subsequent days, 0.5 h at a time
  for (let d = 0; d < n; d++) {
    let dayTotal = matrix[d].reduce((s, h) => s + h, 0);

    while (Math.round(dayTotal * 2) > Math.round(max_hours_per_day * 2)) {
      // Pick item with most hours on this day to reduce first
      let maxI = -1;
      for (let i = 0; i < proposals.length; i++) {
        if (
          matrix[d][i] >= 0.5 &&
          (maxI === -1 || matrix[d][i] > matrix[d][maxI])
        ) {
          maxI = i;
        }
      }
      if (maxI === -1) break;

      matrix[d][maxI] -= 0.5;
      dayTotal -= 0.5;

      // Find the nearest subsequent day with remaining capacity
      let placed = false;
      for (let nextD = d + 1; nextD < n; nextD++) {
        const nextTotal = matrix[nextD].reduce((s, h) => s + h, 0);
        if (Math.round((nextTotal + 0.5) * 2) <= Math.round(max_hours_per_day * 2)) {
          matrix[nextD][maxI] += 0.5;
          placed = true;
          break;
        }
      }

      // If no subsequent day has capacity, the 0.5 h is simply dropped
      if (!placed) break;
    }
  }

  // Step 4–5: Build and sort DayEntry[]
  const entries: DayEntry[] = [];
  for (let d = 0; d < n; d++) {
    for (let i = 0; i < proposals.length; i++) {
      const hours = Math.round(matrix[d][i] * 2) / 2;
      if (hours > 0) {
        entries.push({
          work_date: working_days[d],
          day_of_week: getDayName(working_days[d]),
          week_number: getISOWeekNumber(working_days[d]),
          work_item_id: proposals[i].work_item_id,
          description: proposals[i].description,
          category: proposals[i].category,
          hours,
          hourly_rate: proposals[i].hourly_rate,
          line_total: Math.round(hours * proposals[i].hourly_rate * 100) / 100,
          sort_order: i,
        });
      }
    }
  }

  entries.sort((a, b) => {
    if (a.work_date < b.work_date) return -1;
    if (a.work_date > b.work_date) return 1;
    return a.sort_order - b.sort_order;
  });

  return entries;
}

/**
 * Aggregates entry totals into the final AlgorithmResult.
 */
export function calculateResult(
  proposals: ProportionProposal[],
  entries: DayEntry[],
  target_amount: number
): AlgorithmResult {
  const calculated_amount =
    Math.round(entries.reduce((s, e) => s + e.line_total, 0) * 100) / 100;
  const total_hours =
    Math.round(entries.reduce((s, e) => s + e.hours, 0) * 2) / 2;

  return {
    proposals,
    entries,
    calculated_amount,
    target_amount,
    amount_difference:
      Math.round((target_amount - calculated_amount) * 100) / 100,
    total_hours,
  };
}

/**
 * Full pipeline: filters active items → proposals → distribution → result.
 */
export function runAlgorithm(input: AlgorithmInput): AlgorithmResult {
  if (input.target_amount <= 0) {
    throw new Error("Kwota docelowa musi być większa od 0");
  }
  if (input.working_days.length === 0) {
    throw new Error("Lista dni roboczych jest pusta");
  }

  const proposals = generateProposals(input);
  const entries = distributeHours(
    proposals,
    input.working_days,
    input.max_hours_per_day
  );
  return calculateResult(proposals, entries, input.target_amount);
}

import type { AlgorithmResult, DayEntry } from "./types";

export interface CorrectionSuggestion {
  /** Index in AlgorithmResult.entries[] */
  entry_index: number;
  work_item_id: string;
  description: string;
  current_hours: number;
  suggested_hours: number;
  /** +0.5 or -0.5 */
  hours_delta: number;
  amount_delta: number;
  new_calculated_amount: number;
}

/**
 * Suggests a single +0.5 / -0.5 h correction to bring calculated_amount
 * closer to target_amount.
 *
 * - difference > 0 (too little): add 0.5 h to the highest-rate item on the last working day.
 * - difference < 0 (too much): remove 0.5 h from the lowest-rate item on the first working day.
 * - |difference| < 0.5 × min_rate: difference is acceptable → returns null.
 */
export function suggestCorrection(
  result: AlgorithmResult
): CorrectionSuggestion | null {
  const { entries, calculated_amount, target_amount } = result;
  if (entries.length === 0) return null;

  const difference = target_amount - calculated_amount;

  const minRate = Math.min(...entries.map((e) => e.hourly_rate));
  const minStep = 0.5 * minRate;

  if (Math.abs(difference) < minStep) return null;

  // Collect unique sorted dates
  const dates = Array.from(new Set(entries.map((e) => e.work_date))).sort();

  if (difference > 0) {
    // Add 0.5 h to the highest-rate entry on the last working day
    const lastDate = dates[dates.length - 1];
    const candidates = entries
      .map((e, i) => ({ ...e, index: i }))
      .filter((e) => e.work_date === lastDate);

    const target = candidates.reduce((best, e) =>
      e.hourly_rate > best.hourly_rate ? e : best
    );

    const amountDelta = 0.5 * target.hourly_rate;
    return {
      entry_index: target.index,
      work_item_id: target.work_item_id,
      description: target.description,
      current_hours: target.hours,
      suggested_hours: target.hours + 0.5,
      hours_delta: 0.5,
      amount_delta: amountDelta,
      new_calculated_amount:
        Math.round((calculated_amount + amountDelta) * 100) / 100,
    };
  } else {
    // Remove 0.5 h from the lowest-rate entry on the first working day
    const firstDate = dates[0];
    const candidates = entries
      .map((e, i) => ({ ...e, index: i }))
      .filter((e) => e.work_date === firstDate && e.hours >= 0.5);

    if (candidates.length === 0) return null;

    const target = candidates.reduce((best, e) =>
      e.hourly_rate < best.hourly_rate ? e : best
    );

    const amountDelta = -(0.5 * target.hourly_rate);
    return {
      entry_index: target.index,
      work_item_id: target.work_item_id,
      description: target.description,
      current_hours: target.hours,
      suggested_hours: target.hours - 0.5,
      hours_delta: -0.5,
      amount_delta: amountDelta,
      new_calculated_amount:
        Math.round((calculated_amount + amountDelta) * 100) / 100,
    };
  }
}

/**
 * Returns a new entries array with the correction applied to the specified entry.
 * The original array is not mutated.
 */
export function applyCorrection(
  entries: DayEntry[],
  correction: CorrectionSuggestion
): DayEntry[] {
  return entries.map((entry, i) => {
    if (i !== correction.entry_index) return entry;
    const hours = correction.suggested_hours;
    return {
      ...entry,
      hours,
      line_total: Math.round(hours * entry.hourly_rate * 100) / 100,
    };
  });
}

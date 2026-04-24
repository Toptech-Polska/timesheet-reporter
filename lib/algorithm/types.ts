export interface WorkItem {
  id: string;
  description: string;
  category: string;
  /** PLN, rounded to nearest 100 */
  hourly_rate: number;
  /** e.g. 1.0, 2.0, 0.5 */
  proportion: number;
  /** ISO date 'YYYY-MM-DD' or null */
  active_from: string | null;
  /** ISO date 'YYYY-MM-DD' or null */
  active_until: string | null;
}

export interface AlgorithmInput {
  /** Target net amount in PLN */
  target_amount: number;
  work_items: WorkItem[];
  /** List of ISO dates: ['2026-03-02', '2026-03-03', ...] */
  working_days: string[];
  /** e.g. 8.0 */
  max_hours_per_day: number;
}

export interface DayEntry {
  /** ISO date */
  work_date: string;
  /** Polish weekday name */
  day_of_week: string;
  /** ISO 8601 week number */
  week_number: number;
  work_item_id: string;
  description: string;
  category: string;
  /** Rounded to nearest 0.5 */
  hours: number;
  hourly_rate: number;
  /** hours × hourly_rate */
  line_total: number;
  sort_order: number;
}

export interface ProportionProposal {
  work_item_id: string;
  description: string;
  category: string;
  hourly_rate: number;
  proportion: number;
  /** Total hours allocated for this item */
  hours_total: number;
  /** Total amount for this item */
  amount_total: number;
}

export interface AlgorithmResult {
  proposals: ProportionProposal[];
  entries: DayEntry[];
  /** SUM(entry.hours × entry.hourly_rate) */
  calculated_amount: number;
  target_amount: number;
  /** target_amount - calculated_amount (non-zero due to rounding) */
  amount_difference: number;
  /** SUM(entry.hours) */
  total_hours: number;
}

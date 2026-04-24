import type {
  WorkItem,
  ProportionProposal,
  AlgorithmResult,
  DayEntry,
} from "@/lib/algorithm/types";

export type EditableEntry = DayEntry & { is_manually_edited: boolean };

export interface WizardState {
  step: 1 | 2 | 3;
  // Step 1
  schema_id: string | null;
  schema_name: string;
  work_items: WorkItem[];
  period_month: number;
  period_year: number;
  target_amount: number;
  working_days: string[];
  max_hours_per_day: number;
  // Step 2
  proposals: ProportionProposal[];
  algorithm_result: AlgorithmResult | null;
  // Step 3
  entries: EditableEntry[];
  invoice_number: string;
}

export interface SchemaOption {
  id: string;
  name: string;
  max_hours_per_day: number;
  working_days_of_week: number[];
}

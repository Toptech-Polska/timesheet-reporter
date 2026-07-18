import type {
  WorkItem,
  ProportionProposal,
  DayEntry,
  MultiSchemaMode,
  MultiAlgorithmResult,
} from "@/lib/algorithm/types";

export type EditableEntry = DayEntry & { is_manually_edited: boolean };

/** Schemat wybrany w kreatorze (kolejność na liście = priorytet). */
export interface WizardSchemaPick {
  schema_id: string;
  schema_name: string;
  max_hours_per_day: number;
  working_days_of_week: number[];
  /** Pozycje pracy schematu (ładowane po wyborze, edytowalne w kroku 2) */
  work_items: WorkItem[];
  /** Waga w %, tylko tryb "weights" (null = nieustawiona) */
  weight: number | null;
}

export interface WizardState {
  step: 1 | 2 | 3;
  // Step 1
  /** Wybrane schematy w kolejności priorytetu (min. 1) */
  schema_picks: WizardSchemaPick[];
  /** Tryb łączenia schematów (istotny przy ≥2 schematach) */
  mode: MultiSchemaMode;
  /** Schemat priorytetowy (= schema_picks[0]) — dla zapisu i kompatybilności */
  schema_id: string | null;
  schema_name: string;
  period_month: number;
  period_year: number;
  target_amount: number;
  /** Unia zaznaczonych dni roboczych wszystkich schematów */
  working_days: string[];
  /** Globalny limit godzin/dzień, wspólny dla wszystkich schematów */
  max_hours_per_day: number;
  // Step 2
  proposals: ProportionProposal[];
  algorithm_result: MultiAlgorithmResult | null;
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

"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { WizardState, SchemaOption } from "@/components/generator/types";
import { ConfigStep } from "@/components/generator/ConfigStep";
import { ProportionStep } from "@/components/generator/ProportionStep";
import { ReportPreview } from "@/components/generator/ReportPreview";

export { type WizardState } from "@/components/generator/types";

const now = new Date();

const INITIAL_STATE: WizardState = {
  step: 1,
  schema_id: null,
  schema_name: "",
  work_items: [],
  period_month: now.getMonth() + 1,
  period_year: now.getFullYear(),
  target_amount: 0,
  working_days: [],
  max_hours_per_day: 8,
  proposals: [],
  algorithm_result: null,
  entries: [],
  invoice_number: "",
};

const STEP_LABELS = ["Konfiguracja", "Proporcje", "Podgląd raportu"];

interface ReportWizardProps {
  schemas: SchemaOption[];
  profile: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
}

export function ReportWizard({
  schemas,
  profile,
  settings,
}: ReportWizardProps) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  function updateState(partial: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="space-y-6">
      <Stepper currentStep={state.step} />

      <div>
        {state.step === 1 && (
          <ConfigStep
            schemas={schemas}
            wizardState={state}
            onNext={(partial) => updateState({ ...partial, step: 2 })}
          />
        )}
        {state.step === 2 && (
          <ProportionStep
            wizardState={state}
            onNext={(partial) => updateState({ ...partial, step: 3 })}
            onBack={() => updateState({ step: 1 })}
            onUpdateState={updateState}
          />
        )}
        {state.step === 3 && (
          <ReportPreview
            wizardState={state}
            profile={profile}
            settings={settings}
            onBack={() => updateState({ step: 2 })}
            onUpdateState={updateState}
          />
        )}
      </div>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const num = (i + 1) as 1 | 2 | 3;
        const isDone = currentStep > num;
        const isActive = currentStep === num;

        return (
          <div key={num} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : isDone
                  ? "text-green-700 bg-green-50"
                  : "text-slate-400 bg-slate-50"
              }`}
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : isDone
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-200 text-slate-400"
                }`}
              >
                {isDone ? <Check className="size-3" /> : num}
              </span>
              {label}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`w-8 h-px ${
                  currentStep > num ? "bg-green-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

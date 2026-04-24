"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { WorkItemsTable } from "./WorkItemsTable";
import type { SchemaData } from "@/app/actions/schemas";
import { createSchema, updateSchema } from "@/app/actions/schemas";

// ── Types ──────────────────────────────────────────────────────────────────

export interface WorkItemFormValue {
  db_id?: string;
  description: string;
  category: string;
  hourly_rate: number;
  proportion: number;
  active_from?: string;
  active_until?: string;
}

export interface SchemaFormValues {
  name: string;
  description: string;
  working_days_of_week: number[];
  max_hours_per_day: number;
  work_items: WorkItemFormValue[];
}

// ── Zod schema ─────────────────────────────────────────────────────────────

const workItemZ = z
  .object({
    db_id: z.string().optional(),
    description: z.string().min(1, "Opis jest wymagany"),
    category: z.string().min(1, "Kategoria jest wymagana"),
    hourly_rate: z
      .number({ message: "Podaj stawkę godzinową" })
      .min(100, "Minimalna stawka: 100 zł/h"),
    proportion: z
      .number({ message: "Podaj proporcję" })
      .min(0.5, "Min. 0,5")
      .max(10, "Maks. 10"),
    active_from: z.string().default(""),
    active_until: z.string().default(""),
  })
  .refine(
    (d) => {
      if (d.active_from && d.active_until) return d.active_from <= d.active_until;
      return true;
    },
    { message: "Data 'do' musi być późniejsza niż 'od'", path: ["active_until"] }
  );

const schemaZ = z.object({
  name: z
    .string()
    .min(1, "Nazwa schematu jest wymagana")
    .max(100, "Maks. 100 znaków"),
  description: z.string().max(500, "Maks. 500 znaków"),
  working_days_of_week: z
    .array(z.number())
    .refine((d) => d.length >= 1, { message: "Wybierz co najmniej jeden dzień" }),
  max_hours_per_day: z
    .number({ message: "Podaj liczbę godzin" })
    .min(0.5, "Min. 0,5 h")
    .max(24, "Maks. 24 h"),
  work_items: z
    .array(workItemZ)
    .refine((items) => items.length >= 1, {
      message: "Dodaj co najmniej jedną pozycję pracy",
    }),
});

// ── Default empty item ─────────────────────────────────────────────────────

const EMPTY_ITEM: WorkItemFormValue = {
  description: "",
  category: "",
  hourly_rate: 200,
  proportion: 1,
  active_from: "",
  active_until: "",
};

const DAY_LABELS: Record<number, string> = {
  1: "Pon",
  2: "Wt",
  3: "Śr",
  4: "Czw",
  5: "Pt",
};

// ── Props ──────────────────────────────────────────────────────────────────

interface SchemaFormProps {
  mode: "create" | "edit";
  schemaId?: string;
  initialData?: SchemaFormValues;
  categories: string[];
}

// ── Component ──────────────────────────────────────────────────────────────

export function SchemaForm({
  mode,
  schemaId,
  initialData,
  categories,
}: SchemaFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);

  const defaultValues: SchemaFormValues = initialData ?? {
    name: "",
    description: "",
    working_days_of_week: [1, 2, 3, 4, 5],
    max_hours_per_day: 8,
    work_items: [{ ...EMPTY_ITEM }],
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SchemaFormValues>({
    resolver: zodResolver(schemaZ),
    defaultValues,
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "work_items",
  });

  // Warn on browser navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const watchedDays = watch("working_days_of_week");

  function toggleDay(day: number) {
    const current = getValues("working_days_of_week");
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setValue("working_days_of_week", next, { shouldValidate: true, shouldDirty: true });
  }

  function handleAppend() {
    append({ ...EMPTY_ITEM });
    setLastAddedIndex(fields.length);
    // Reset after first render
    setTimeout(() => setLastAddedIndex(null), 500);
  }

  async function onSubmit(values: SchemaFormValues) {
    const payload: SchemaData = {
      name: values.name,
      description: values.description || null,
      working_days_of_week: values.working_days_of_week,
      max_hours_per_day: values.max_hours_per_day,
      work_items: values.work_items.map((item, i) => ({
        id: item.db_id,
        description: item.description,
        category: item.category,
        hourly_rate: item.hourly_rate,
        proportion: item.proportion,
        active_from: item.active_from || null,
        active_until: item.active_until || null,
        sort_order: i,
      })),
    };

    if (mode === "create") {
      const result = await createSchema(payload);
      if (result.error) {
        showToast(result.error, "error");
        return;
      }
      showToast("Schemat został utworzony", "success");
      router.push("/schematy");
    } else {
      const result = await updateSchema(schemaId!, payload);
      if (!result.success) {
        showToast(result.error ?? "Wystąpił błąd", "error");
        return;
      }
      showToast("Schemat został zaktualizowany", "success");
      router.push("/schematy");
    }
  }

  function handleCancel() {
    if (
      isDirty &&
      !confirm("Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?")
    ) {
      return;
    }
    router.push("/schematy");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* Section 1 — Basic info */}
      <Section title="Podstawowe informacje">
        <div className="grid grid-cols-1 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Nazwa schematu <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="np. Standardowy kontrakt B2B"
              maxLength={100}
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Opis</Label>
            <textarea
              id="description"
              rows={3}
              maxLength={500}
              placeholder="Opcjonalny opis schematu…"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>
        </div>
      </Section>

      {/* Section 2 — Work time config */}
      <Section title="Konfiguracja czasu pracy">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>
              Dni robocze <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((day) => {
                const active = watchedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                );
              })}
            </div>
            {errors.working_days_of_week && (
              <p className="text-sm text-red-600">
                {(errors.working_days_of_week as { message?: string }).message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="max_hours_per_day">
              Maks. godzin dziennie <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="max_hours_per_day"
              control={control}
              render={({ field }) => (
                <Input
                  id="max_hours_per_day"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  placeholder="8"
                  aria-invalid={!!errors.max_hours_per_day}
                  value={isNaN(field.value) ? "" : field.value}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? NaN : parseFloat(e.target.value)
                    )
                  }
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.max_hours_per_day && (
              <p className="text-sm text-red-600">
                {errors.max_hours_per_day.message}
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* Section 3 — Work items */}
      <Section title="Pozycje pracy">
        <WorkItemsTable
          fields={fields}
          register={register}
          setValue={setValue}
          errors={errors}
          move={move}
          onAppend={handleAppend}
          onRemove={(i) => {
            if (fields.length === 1) {
              showToast("Schemat musi mieć co najmniej jedną pozycję", "error");
              return;
            }
            remove(i);
          }}
          categories={categories}
          lastAddedIndex={lastAddedIndex}
        />
      </Section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Anuluj
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white border-0 min-w-32"
        >
          {isSubmitting ? "Zapisywanie…" : "Zapisz schemat"}
        </Button>
      </div>
    </form>
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

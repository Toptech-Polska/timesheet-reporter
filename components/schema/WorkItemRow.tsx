"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  UseFormRegister,
  UseFormSetValue,
  FieldErrors,
} from "react-hook-form";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { roundToHundred } from "@/lib/utils/rounding";
import type { SchemaFormValues } from "./SchemaForm";

interface WorkItemRowProps {
  index: number;
  fieldId: string;
  register: UseFormRegister<SchemaFormValues>;
  setValue: UseFormSetValue<SchemaFormValues>;
  errors: FieldErrors<SchemaFormValues>;
  onRemove: () => void;
  categories: string[];
  autoFocus?: boolean;
}

const inputCls =
  "w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50";

export function WorkItemRow({
  index,
  fieldId,
  register,
  setValue,
  errors,
  onRemove,
  categories,
  autoFocus,
}: WorkItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fieldId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const descRef = useRef<HTMLTextAreaElement | null>(null);
  const [rateFlash, setRateFlash] = useState(false);

  useEffect(() => {
    if (autoFocus && descRef.current) {
      descRef.current.focus();
    }
  }, [autoFocus]);

  const { ref: rhfDescRef, ...descRegister } = register(
    `work_items.${index}.description`
  );

  function handleRateBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    if (isFinite(val) && val > 0) {
      const rounded = roundToHundred(val);
      if (rounded !== val) {
        setValue(`work_items.${index}.hourly_rate`, rounded, {
          shouldValidate: true,
        });
        setRateFlash(true);
        setTimeout(() => setRateFlash(false), 700);
      }
    }
  }

  const itemErrors = errors.work_items?.[index];
  const datalistId = `cat-list-${fieldId}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-white p-3 transition-shadow",
        isDragging ? "shadow-lg border-blue-300" : "border-slate-200 hover:border-slate-300"
      )}
    >
      {/* Drag handle + delete */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none"
          aria-label="Przeciągnij aby zmienić kolejność"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-300 hover:text-red-500 transition-colors"
          aria-label="Usuń pozycję"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Description */}
        <div className="sm:col-span-2 xl:col-span-2 space-y-1">
          <label className="text-xs font-medium text-slate-500">
            Opis wykonywanej pracy <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={2}
            placeholder="Np. Tworzenie dokumentacji, analiza wymagań…"
            className={cn(inputCls, "resize-none", itemErrors?.description && "border-red-400")}
            ref={(el) => {
              rhfDescRef(el);
              descRef.current = el;
            }}
            {...descRegister}
          />
          {itemErrors?.description && (
            <p className="text-xs text-red-600">{itemErrors.description.message}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">
            Kategoria <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            list={datalistId}
            placeholder="Wybierz lub wpisz…"
            className={cn(inputCls, itemErrors?.category && "border-red-400")}
            {...register(`work_items.${index}.category`)}
          />
          <datalist id={datalistId}>
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {itemErrors?.category && (
            <p className="text-xs text-red-600">{itemErrors.category.message}</p>
          )}
        </div>

        {/* Hourly rate */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">
            Stawka/h (PLN) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="100"
            min="100"
            placeholder="np. 200"
            className={cn(
              inputCls,
              rateFlash && "ring-2 ring-blue-300 border-blue-300",
              itemErrors?.hourly_rate && "border-red-400"
            )}
            {...register(`work_items.${index}.hourly_rate`, {
              valueAsNumber: true,
              onBlur: handleRateBlur,
            })}
          />
          {itemErrors?.hourly_rate && (
            <p className="text-xs text-red-600">{itemErrors.hourly_rate.message}</p>
          )}
        </div>

        {/* Proportion */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Proporcja</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="10"
            className={cn(inputCls, itemErrors?.proportion && "border-red-400")}
            {...register(`work_items.${index}.proportion`, { valueAsNumber: true })}
          />
          {itemErrors?.proportion && (
            <p className="text-xs text-red-600">{itemErrors.proportion.message}</p>
          )}
        </div>

        {/* Active from */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Aktywna od</label>
          <input
            type="date"
            className={inputCls}
            {...register(`work_items.${index}.active_from`)}
          />
        </div>

        {/* Active until */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Aktywna do</label>
          <input
            type="date"
            className={cn(inputCls, itemErrors?.active_until && "border-red-400")}
            {...register(`work_items.${index}.active_until`)}
          />
          {itemErrors?.active_until && (
            <p className="text-xs text-red-600">{itemErrors.active_until.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

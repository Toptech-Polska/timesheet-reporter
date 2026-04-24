"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type {
  UseFieldArrayMove,
  UseFormRegister,
  UseFormSetValue,
  FieldErrors,
  FieldArrayWithId,
} from "react-hook-form";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkItemRow } from "./WorkItemRow";
import type { SchemaFormValues } from "./SchemaForm";

interface WorkItemsTableProps {
  fields: FieldArrayWithId<SchemaFormValues, "work_items", "id">[];
  register: UseFormRegister<SchemaFormValues>;
  setValue: UseFormSetValue<SchemaFormValues>;
  errors: FieldErrors<SchemaFormValues>;
  move: UseFieldArrayMove;
  onAppend: () => void;
  onRemove: (index: number) => void;
  categories: string[];
  lastAddedIndex: number | null;
}

export function WorkItemsTable({
  fields,
  register,
  setValue,
  errors,
  move,
  onAppend,
  onRemove,
  categories,
  lastAddedIndex,
}: WorkItemsTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = fields.findIndex((f) => f.id === active.id);
      const newIdx = fields.findIndex((f) => f.id === over.id);
      if (oldIdx !== -1 && newIdx !== -1) {
        move(oldIdx, newIdx);
      }
    }
  }

  const workItemsError =
    errors.work_items && !Array.isArray(errors.work_items)
      ? (errors.work_items as { message?: string }).message
      : null;

  return (
    <div className="space-y-3">
      {/* Column labels — visible on larger screens only */}
      {fields.length > 0 && (
        <div className="hidden xl:grid xl:grid-cols-4 gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <div className="xl:col-span-2 pl-10">Opis wykonywanej pracy</div>
          <div>Kategoria</div>
          <div>Stawka/h (PLN)</div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {fields.map((field, index) => (
              <WorkItemRow
                key={field.id}
                index={index}
                fieldId={field.id}
                register={register}
                setValue={setValue}
                errors={errors}
                onRemove={() => onRemove(index)}
                categories={categories}
                autoFocus={lastAddedIndex === index}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {fields.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-slate-200 py-8 text-center">
          <p className="text-sm text-slate-400">Brak pozycji pracy.</p>
          <p className="text-sm text-slate-400">Dodaj co najmniej jedną pozycję.</p>
        </div>
      )}

      {workItemsError && (
        <p className="text-sm text-red-600">{workItemsError}</p>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={onAppend}
        className="w-full border-dashed text-slate-600 hover:text-slate-900"
      >
        <Plus className="size-4 mr-2" />
        Dodaj pozycję pracy
      </Button>
    </div>
  );
}

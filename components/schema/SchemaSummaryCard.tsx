"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Edit2, Copy, Archive, ArchiveRestore, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { archiveSchema, duplicateSchema } from "@/app/actions/schemas";
import { formatDatePL } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

const DAY_LABELS: Record<number, string> = { 1: "Pn", 2: "Wt", 3: "Śr", 4: "Czw", 5: "Pt" };

export interface SchemaSummaryData {
  id: string;
  name: string;
  description: string | null;
  working_days_of_week: number[] | null;
  max_hours_per_day: number | null;
  is_archived: boolean;
  updated_at: string | null;
  itemCount: number;
}

export function SchemaSummaryCard({ schema }: { schema: SchemaSummaryData }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  async function handleArchive() {
    setArchiveLoading(true);
    const result = await archiveSchema(schema.id);
    setArchiveLoading(false);
    setArchiveOpen(false);
    if (result.success) {
      showToast(
        schema.is_archived ? "Schemat przywrócony" : "Schemat zarchiwizowany",
        "success"
      );
    } else {
      showToast(result.error ?? "Błąd", "error");
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const result = await duplicateSchema(schema.id);
    setDuplicating(false);
    if (result.newId) {
      showToast("Schemat został zduplikowany", "success");
      router.push(`/schematy/${result.newId}`);
    } else {
      showToast(result.error ?? "Błąd duplikacji", "error");
    }
  }

  const days = schema.working_days_of_week ?? [1, 2, 3, 4, 5];

  return (
    <div
      className={cn(
        "bg-white rounded-xl border shadow-sm flex flex-col transition-shadow hover:shadow-md",
        schema.is_archived ? "border-slate-200 opacity-75" : "border-slate-200"
      )}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
            {schema.name}
          </h3>
          <span
            className={cn(
              "shrink-0 text-xs font-medium px-2 py-0.5 rounded-full",
              schema.is_archived
                ? "bg-slate-100 text-slate-500"
                : "bg-green-100 text-green-700"
            )}
          >
            {schema.is_archived ? "Zarchiwizowany" : "Aktywny"}
          </span>
        </div>

        {schema.description ? (
          <p className="text-sm text-slate-500 line-clamp-2 mt-1">{schema.description}</p>
        ) : (
          <p className="text-sm text-slate-400 italic mt-1">Brak opisu</p>
        )}

        {/* Meta */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="font-medium text-slate-700">{schema.itemCount}</span>
            {schema.itemCount === 1 ? " pozycja" : schema.itemCount < 5 ? " pozycje" : " pozycji"}
          </span>
          {schema.max_hours_per_day != null && (
            <span>
              <span className="font-medium text-slate-700">
                {schema.max_hours_per_day.toString().replace(".", ",")}
              </span>{" "}
              h/dzień
            </span>
          )}
        </div>

        {/* Days */}
        <div className="flex gap-1 mt-3">
          {[1, 2, 3, 4, 5].map((d) => (
            <span
              key={d}
              className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                days.includes(d)
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-400"
              )}
            >
              {DAY_LABELS[d]}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Calendar className="size-3" />
          {formatDatePL(schema.updated_at)}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDuplicate}
            disabled={duplicating}
            title="Duplikuj schemat"
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setArchiveOpen(true)}
            title={schema.is_archived ? "Przywróć schemat" : "Archiwizuj schemat"}
            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
          >
            {schema.is_archived ? (
              <ArchiveRestore className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
          </Button>
          <Link href={`/schematy/${schema.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs"
            >
              <Edit2 className="size-3.5 mr-1" />
              Edytuj
            </Button>
          </Link>
        </div>
      </div>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={schema.is_archived ? "Przywróć schemat" : "Archiwizuj schemat"}
        description={
          schema.is_archived
            ? `Schemat "${schema.name}" zostanie przywrócony i będzie widoczny na liście aktywnych.`
            : `Schemat "${schema.name}" zostanie ukryty na liście aktywnych. Możesz go przywrócić w każdej chwili.`
        }
        confirmLabel={schema.is_archived ? "Przywróć" : "Archiwizuj"}
        onConfirm={handleArchive}
        loading={archiveLoading}
      />
    </div>
  );
}

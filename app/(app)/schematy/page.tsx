"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, LayoutGrid, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SchemaSummaryCard, type SchemaSummaryData } from "@/components/schema/SchemaSummaryCard";
import { createClient } from "@/lib/supabase/client";

type FilterMode = "active" | "archived" | "all";

export default function SchematyPage() {
  const [schemas, setSchemas] = useState<SchemaSummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("active");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: schemasData } = await supabase
        .schema("timesheet")
        .from("schemas")
        .select("*, schema_work_items(id)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (schemasData) {
        const mapped: SchemaSummaryData[] = schemasData.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          working_days_of_week: s.working_days_of_week,
          max_hours_per_day: s.max_hours_per_day,
          is_archived: s.is_archived ?? false,
          updated_at: s.updated_at,
          itemCount: Array.isArray(s.schema_work_items)
            ? s.schema_work_items.length
            : 0,
        }));
        setSchemas(mapped);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = schemas.filter((s) => {
    if (filter === "active") return !s.is_archived;
    if (filter === "archived") return s.is_archived;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schematy pracy</h1>
          <p className="text-sm text-slate-500 mt-1">
            Konfiguracje podziału czasu i stawek dla raportów
          </p>
        </div>
        <Link href="/schematy/nowy">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 gap-2">
            <Plus className="size-4" />
            Nowy schemat
          </Button>
        </Link>
      </div>

      {/* Filter toggle */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
        {(["active", "archived", "all"] as FilterMode[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {f === "active" ? "Aktywne" : f === "archived" ? "Zarchiwizowane" : "Wszystkie"}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <SchemaSummaryCard key={s.id} schema={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterMode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-slate-100 p-5 mb-4">
        {filter === "archived" ? (
          <Layers className="size-8 text-slate-400" />
        ) : (
          <LayoutGrid className="size-8 text-slate-400" />
        )}
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">
        {filter === "archived"
          ? "Brak zarchiwizowanych schematów"
          : "Nie masz jeszcze żadnych schematów"}
      </h3>
      <p className="text-sm text-slate-400 mb-6 max-w-xs">
        {filter === "archived"
          ? "Zarchiwizowane schematy pojawią się tutaj."
          : "Schematy definiują strukturę pozycji pracy i stawek godzinowych używanych w raportach."}
      </p>
      {filter !== "archived" && (
        <Link href="/schematy/nowy">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 gap-2">
            <Plus className="size-4" />
            Utwórz pierwszy schemat
          </Button>
        </Link>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
          <div className="flex gap-1 pt-1">
            {[1, 2, 3, 4, 5].map((d) => (
              <div key={d} className="h-5 w-8 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

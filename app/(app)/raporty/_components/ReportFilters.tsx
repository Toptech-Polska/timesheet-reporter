"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { currentYear } from "@/lib/utils/dates";

const MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

interface Props {
  selectedYear: number;
  selectedMonth: number;
  selectedStatus: string;
}

export function ReportFilters({ selectedYear, selectedMonth, selectedStatus }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      params.delete("strona");
      router.push(`/raporty?${params.toString()}`);
    },
    [router, searchParams]
  );

  const resetFilters = () => {
    router.push(`/raporty?rok=${currentYear()}`);
  };

  const thisYear = currentYear();
  const years: number[] = [];
  for (let y = 2024; y <= thisYear + 1; y++) years.push(y);

  const isDefault =
    selectedYear === thisYear && selectedMonth === 0 && selectedStatus === "all";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Rok */}
      <select
        value={selectedYear}
        onChange={(e) => updateParam("rok", e.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {/* Miesiąc */}
      <select
        value={selectedMonth}
        onChange={(e) => updateParam("miesiac", e.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        <option value={0}>Wszystkie miesiące</option>
        {MONTHS.map((m, i) => (
          <option key={i + 1} value={i + 1}>
            {m}
          </option>
        ))}
      </select>

      {/* Status */}
      <select
        value={selectedStatus}
        onChange={(e) => updateParam("status", e.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        <option value="all">Wszystkie statusy</option>
        <option value="draft">Wersja robocza</option>
        <option value="approved">Zatwierdzony</option>
        <option value="exported">Wyeksportowany</option>
      </select>

      {!isDefault && (
        <Button variant="outline" size="sm" onClick={resetFilters}>
          Resetuj filtry
        </Button>
      )}
    </div>
  );
}

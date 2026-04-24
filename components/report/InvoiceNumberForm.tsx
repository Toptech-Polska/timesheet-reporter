"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateInvoiceNumber } from "@/app/actions/reports";
import { useToast } from "@/components/ui/toast";

interface Props {
  reportId: string;
  current?: string | null;
}

export function InvoiceNumberForm({ reportId, current }: Props) {
  const [value, setValue] = useState(current ?? "");
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateInvoiceNumber(reportId, value);
      if (result.error) {
        showToast(result.error, "error");
      } else {
        showToast("Nr faktury zapisany", "success");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="np. FV/001/2026"
        className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border-0" disabled={isPending}>
        {isPending ? "Zapisuję..." : "Zapisz"}
      </Button>
    </form>
  );
}

"use client";

import { Trash2 } from "lucide-react";
import type { ProportionProposal } from "@/lib/algorithm/types";
import { formatPLN } from "@/lib/utils/currency";
import { formatHours } from "@/lib/utils/rounding";

interface ProportionTableProps {
  proposals: ProportionProposal[];
  onProportionChange: (itemId: string, proportion: number) => void;
  onDelete: (itemId: string) => void;
  newlyAddedId?: string | null;
}

export function ProportionTable({
  proposals,
  onProportionChange,
  onDelete,
  newlyAddedId,
}: ProportionTableProps) {
  const totalHours = proposals.reduce((s, p) => s + p.hours_total, 0);
  const totalAmount = proposals.reduce((s, p) => s + p.amount_total, 0);
  const canDelete = proposals.length > 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="pb-2 text-left font-semibold text-slate-600 pr-4">
              Pozycja pracy
            </th>
            <th className="pb-2 text-left font-semibold text-slate-600 pr-4">
              Kategoria
            </th>
            <th className="pb-2 text-right font-semibold text-slate-600 pr-4">
              Stawka/h
            </th>
            <th className="pb-2 text-center font-semibold text-slate-600 w-24">
              Proporcja
            </th>
            <th className="pb-2 text-right font-semibold text-slate-600 pr-4">
              H łącznie
            </th>
            <th className="pb-2 text-right font-semibold text-slate-600 pr-4">
              Kwota
            </th>
            <th className="pb-2 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {proposals.map((p) => {
            const isNew = p.work_item_id === newlyAddedId;
            return (
              <tr
                key={p.work_item_id}
                className={`transition-colors duration-1000 ${
                  isNew ? "bg-green-50" : "hover:bg-slate-50"
                }`}
              >
                <td className="py-3 pr-4">{p.description}</td>
                <td className="py-3 pr-4 text-slate-500">{p.category}</td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {formatPLN(p.hourly_rate)}
                </td>
                <td className="py-3 px-2 text-center">
                  <input
                    type="number"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={p.proportion}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0.5) {
                        onProportionChange(p.work_item_id, val);
                      }
                    }}
                    className="w-16 text-center rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-slate-700">
                  {formatHours(p.hours_total)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums font-medium">
                  {formatPLN(p.amount_total)}
                </td>
                <td className="py-3 text-center">
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => onDelete(p.work_item_id)}
                    title={
                      canDelete
                        ? "Usuń pozycję"
                        : "Musi pozostać co najmniej jedna pozycja"
                    }
                    aria-label={
                      canDelete
                        ? "Usuń pozycję"
                        : "Musi pozostać co najmniej jedna pozycja"
                    }
                    className={`transition-colors duration-150 ${
                      canDelete
                        ? "text-slate-300 hover:text-red-500 cursor-pointer"
                        : "text-slate-200 cursor-not-allowed"
                    }`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200">
            <td colSpan={4} className="pt-3 text-sm font-semibold text-slate-600">
              Łącznie
            </td>
            <td className="pt-3 pr-4 text-right tabular-nums font-semibold text-slate-800">
              {formatHours(totalHours)}
            </td>
            <td colSpan={2} className="pt-3 text-right tabular-nums font-bold text-slate-900">
              {formatPLN(totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

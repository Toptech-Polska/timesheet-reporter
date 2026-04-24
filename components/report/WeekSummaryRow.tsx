import { formatPLN } from "@/lib/utils/currency";
import { formatHours } from "@/lib/utils/rounding";

function isoToShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

interface WeekSummaryRowProps {
  weekNum: number;
  startDate: string;
  endDate: string;
  hours: number;
  amount: number;
}

export function WeekSummaryRow({
  weekNum,
  startDate,
  endDate,
  hours,
  amount,
}: WeekSummaryRowProps) {
  return (
    <tr className="bg-slate-100 border-b border-slate-200">
      <td
        colSpan={4}
        className="px-3 py-2 text-xs font-bold text-slate-600"
      >
        Suma tygodnia {weekNum} ({isoToShort(startDate)}–{isoToShort(endDate)}):
      </td>
      <td className="px-3 py-2 text-xs font-bold text-slate-700 text-right tabular-nums">
        {formatHours(hours)}
      </td>
      <td />
      <td className="px-3 py-2 text-xs font-bold text-slate-700 text-right tabular-nums">
        {formatPLN(amount)}
      </td>
    </tr>
  );
}

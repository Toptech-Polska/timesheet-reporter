import { formatPLN } from "@/lib/utils/currency";
import { formatHours } from "@/lib/utils/rounding";

interface DaySummaryRowProps {
  hours: number;
  amount: number;
}

export function DaySummaryRow({ hours, amount }: DaySummaryRowProps) {
  return (
    <tr className="bg-slate-50 border-b border-slate-200">
      <td
        colSpan={4}
        className="px-3 py-1.5 text-xs font-semibold text-slate-500 text-right"
      >
        Suma dzienna:
      </td>
      <td className="px-3 py-1.5 text-xs font-bold text-slate-700 text-right tabular-nums">
        {formatHours(hours)}
      </td>
      <td />
      <td className="px-3 py-1.5 text-xs font-bold text-slate-700 text-right tabular-nums">
        {formatPLN(amount)}
      </td>
    </tr>
  );
}

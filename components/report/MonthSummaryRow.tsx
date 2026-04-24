import { formatPLN } from "@/lib/utils/currency";
import { formatHours } from "@/lib/utils/rounding";

const MONTHS_PL_UPPER = [
  "STYCZEŃ", "LUTY", "MARZEC", "KWIECIEŃ", "MAJ", "CZERWIEC",
  "LIPIEC", "SIERPIEŃ", "WRZESIEŃ", "PAŹDZIERNIK", "LISTOPAD", "GRUDZIEŃ",
];

interface MonthSummaryRowProps {
  month: number;
  year: number;
  hours: number;
  amount: number;
}

export function MonthSummaryRow({
  month,
  year,
  hours,
  amount,
}: MonthSummaryRowProps) {
  return (
    <tr className="bg-slate-800 text-white">
      <td colSpan={4} className="px-3 py-3 text-sm font-bold">
        SUMA MIESIĄCA {MONTHS_PL_UPPER[month - 1]} {year}:
      </td>
      <td className="px-3 py-3 text-sm font-bold text-right tabular-nums">
        {formatHours(hours)}
      </td>
      <td />
      <td className="px-3 py-3 text-sm font-bold text-right tabular-nums">
        {formatPLN(amount)}
      </td>
    </tr>
  );
}

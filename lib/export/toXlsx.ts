import * as XLSX from "xlsx";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export interface ReportForXlsx {
  period_month: number;
  period_year: number;
  invoice_number: string | null;
  contractor_snapshot: Record<string, unknown>;
  client_snapshot: Record<string, unknown>;
}

export interface EntryForXlsx {
  work_date: string;
  day_of_week: string;
  week_number: number;
  description: string;
  category: string;
  hours: number;
  hourly_rate: number;
  line_total: number;
}

export interface ReportForBulkXlsx {
  id: string;
  period_month: number;
  period_year: number;
  invoice_number: string | null;
  target_amount: number;
  calculated_amount: number;
  status: string;
  contractor_name: string;
  contractor_email: string;
  contractor_snapshot: Record<string, unknown>;
  client_snapshot: Record<string, unknown>;
  entries: EntryForXlsx[];
}

interface DayGroup {
  dateShort: string;
  dayOfWeek: string;
  weekNum: number;
  entries: EntryForXlsx[];
  date: string;
}

interface WeekGroup {
  weekNum: number;
  startDate: string;
  endDate: string;
  days: DayGroup[];
}

function buildGroups(entries: EntryForXlsx[]): WeekGroup[] {
  const byDate = new Map<string, DayGroup>();
  entries.forEach((e) => {
    let g = byDate.get(e.work_date);
    if (!g) {
      const [yr, mo, dy] = e.work_date.split("-");
      g = { date: e.work_date, dateShort: `${dy}.${mo}.${yr}`, dayOfWeek: e.day_of_week, weekNum: e.week_number, entries: [] };
      byDate.set(e.work_date, g);
    }
    g.entries.push(e);
  });

  const byWeek = new Map<number, DayGroup[]>();
  byDate.forEach((d) => {
    byWeek.set(d.weekNum, [...(byWeek.get(d.weekNum) ?? []), d]);
  });

  return Array.from(byWeek.keys())
    .sort((a, b) => a - b)
    .map((wn) => {
      const days = byWeek.get(wn)!.sort((a, b) => (a.date < b.date ? -1 : 1));
      return { weekNum: wn, startDate: days[0].date, endDate: days[days.length - 1].date, days };
    });
}

function sv(v: unknown): string {
  return v ? String(v) : "";
}

function fmtShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

function setStr(ws: XLSX.WorkSheet, c: number, r: number, v: string) {
  ws[XLSX.utils.encode_cell({ r, c })] = { t: "s", v };
}

function setNum(ws: XLSX.WorkSheet, c: number, r: number, v: number, fmt?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cell: any = { t: "n", v };
  if (fmt) cell.z = fmt;
  ws[XLSX.utils.encode_cell({ r, c })] = cell;
}

function setFormula(ws: XLSX.WorkSheet, c: number, r: number, f: string, v: number, fmt?: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cell: any = { t: "n", f, v };
  if (fmt) cell.z = fmt;
  ws[XLSX.utils.encode_cell({ r, c })] = cell;
}

const FMT_H = "0.0";
const FMT_PLN = '#,##0.00 "zł"';

function buildReportWorksheet(report: ReportForXlsx, entries: EntryForXlsx[]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];

  const profile = report.contractor_snapshot;
  const client = report.client_snapshot;
  const month = report.period_month;
  const year = report.period_year;

  let r = 0;

  setStr(ws, 0, r, "TIME SHEET");
  merges.push({ s: { r, c: 0 }, e: { r, c: 5 } });
  r++;

  setStr(ws, 0, r, `Okres: ${MONTHS_PL[month - 1]} ${year}`);
  r++;

  setStr(ws, 0, r, report.invoice_number ? `Nr faktury: ${report.invoice_number}` : "");
  r++;

  r++; // empty

  setStr(ws, 0, r, "Zleceniobiorca:");
  setStr(ws, 3, r, "Zleceniodawca:");
  r++;

  setStr(ws, 0, r, sv(profile?.contractor_name));
  setStr(ws, 3, r, sv(client?.client_name));
  r++;

  setStr(ws, 0, r, sv(profile?.contractor_nip) ? `NIP: ${sv(profile.contractor_nip)}` : "");
  setStr(ws, 3, r, sv(client?.client_nip) ? `NIP: ${sv(client.client_nip)}` : "");
  r++;

  setStr(ws, 0, r, sv(profile?.contractor_address));
  setStr(ws, 3, r, sv(client?.client_address));
  r++;

  setStr(ws, 0, r, sv(profile?.contractor_bank_account) ? `Konto: ${sv(profile.contractor_bank_account)}` : "");
  r++;

  r++; // empty

  setStr(ws, 0, r, "Data");
  setStr(ws, 1, r, "Dzień tygodnia");
  setStr(ws, 2, r, "Wykonywana praca");
  setStr(ws, 3, r, "Kategoria");
  setStr(ws, 4, r, "h");
  setStr(ws, 5, r, "Kwota PLN");
  r++;

  const weekGroups = buildGroups(entries);
  const weekSummaryRows: number[] = [];

  for (const week of weekGroups) {
    const daySummaryRows: number[] = [];

    for (const day of week.days) {
      const dayFirstRow = r;
      let dayHours = 0;
      let dayAmount = 0;

      for (const entry of day.entries) {
        setStr(ws, 0, r, day.dateShort);
        setStr(ws, 1, r, day.dayOfWeek);
        setStr(ws, 2, r, entry.description);
        setStr(ws, 3, r, entry.category);
        setNum(ws, 4, r, entry.hours, FMT_H);
        setNum(ws, 5, r, entry.line_total, FMT_PLN);
        dayHours += entry.hours;
        dayAmount += entry.line_total;
        r++;
      }

      const dayLastRow = r - 1;
      setStr(ws, 3, r, "Suma dzienna:");
      setFormula(ws, 4, r, `SUM(E${dayFirstRow + 1}:E${dayLastRow + 1})`, dayHours, FMT_H);
      setFormula(ws, 5, r, `SUM(F${dayFirstRow + 1}:F${dayLastRow + 1})`, dayAmount, FMT_PLN);
      daySummaryRows.push(r);
      r++;
    }

    const weekHours = week.days.reduce((s, d) => s + d.entries.reduce((ss, e) => ss + e.hours, 0), 0);
    const weekAmount = week.days.reduce((s, d) => s + d.entries.reduce((ss, e) => ss + e.line_total, 0), 0);
    const wHFormula = daySummaryRows.map((dr) => `E${dr + 1}`).join("+");
    const wAFormula = daySummaryRows.map((dr) => `F${dr + 1}`).join("+");

    setStr(ws, 0, r, `Suma tygodnia ${week.weekNum} (${fmtShort(week.startDate)}–${fmtShort(week.endDate)}):`);
    setFormula(ws, 4, r, wHFormula, weekHours, FMT_H);
    setFormula(ws, 5, r, wAFormula, weekAmount, FMT_PLN);
    weekSummaryRows.push(r);
    r++;
  }

  const monthHours = entries.reduce((s, e) => s + e.hours, 0);
  const monthAmount = entries.reduce((s, e) => s + e.line_total, 0);
  const mHFormula = weekSummaryRows.map((wr) => `E${wr + 1}`).join("+");
  const mAFormula = weekSummaryRows.map((wr) => `F${wr + 1}`).join("+");

  setStr(ws, 0, r, `SUMA MIESIĄCA ${MONTHS_PL[month - 1].toUpperCase()} ${year}:`);
  setFormula(ws, 4, r, mHFormula.length ? mHFormula : "0", monthHours, FMT_H);
  setFormula(ws, 5, r, mAFormula.length ? mAFormula : "0", monthAmount, FMT_PLN);
  r++;

  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: 5 } });
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 12 }, { wch: 16 }, { wch: 60 }, { wch: 20 }, { wch: 6 }, { wch: 14 },
  ];

  return ws;
}

function buildSummaryWorksheet(reports: ReportForBulkXlsx[]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];

  let r = 0;

  setStr(ws, 0, r, "Podsumowanie raportów Time Sheet");
  merges.push({ s: { r, c: 0 }, e: { r, c: 6 } });
  r++;

  r++; // empty

  // Nagłówki
  setStr(ws, 0, r, "Użytkownik");
  setStr(ws, 1, r, "E-mail");
  setStr(ws, 2, r, "Okres");
  setStr(ws, 3, r, "Nr faktury");
  setStr(ws, 4, r, "Kwota docelowa");
  setStr(ws, 5, r, "Kwota wyliczona");
  setStr(ws, 6, r, "Status");
  r++;

  const dataStartRow = r;

  for (const rep of reports) {
    const monthName = MONTHS_PL[rep.period_month - 1] ?? "";
    setStr(ws, 0, r, rep.contractor_name);
    setStr(ws, 1, r, rep.contractor_email);
    setStr(ws, 2, r, `${monthName} ${rep.period_year}`);
    setStr(ws, 3, r, rep.invoice_number ?? "");
    setNum(ws, 4, r, rep.target_amount, FMT_PLN);
    setNum(ws, 5, r, rep.calculated_amount, FMT_PLN);
    setStr(ws, 6, r, statusLabel(rep.status));
    r++;
  }

  const dataEndRow = r - 1;

  // Wiersz sumy
  setStr(ws, 3, r, "SUMA:");
  if (dataEndRow >= dataStartRow) {
    setFormula(ws, 4, r, `SUM(E${dataStartRow + 1}:E${dataEndRow + 1})`,
      reports.reduce((s, rp) => s + rp.target_amount, 0), FMT_PLN);
    setFormula(ws, 5, r, `SUM(F${dataStartRow + 1}:F${dataEndRow + 1})`,
      reports.reduce((s, rp) => s + rp.calculated_amount, 0), FMT_PLN);
  }
  r++;

  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: 6 } });
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 24 }, { wch: 30 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];

  return ws;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Wersja robocza",
    approved: "Zatwierdzony",
    exported: "Wyeksportowany",
  };
  return map[status] ?? status;
}

function sanitizeSheetName(name: string): string {
  return name
    .replace(/[\\/?*[\]:]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
}

export function generateXlsx(report: ReportForXlsx, entries: EntryForXlsx[]): Buffer {
  const ws = buildReportWorksheet(report, entries);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Time Sheet");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function generateBulkXlsx(reports: ReportForBulkXlsx[]): Buffer {
  const wb = XLSX.utils.book_new();

  const summaryWs = buildSummaryWorksheet(reports);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Podsumowanie");

  const nameCount = new Map<string, number>();

  for (const rep of reports) {
    const monthShort = (MONTHS_PL[rep.period_month - 1] ?? "").slice(0, 3);
    const rawBase = `${rep.contractor_name || "Użytkownik"} ${monthShort} ${rep.period_year}`;
    const count = (nameCount.get(rawBase) ?? 0) + 1;
    nameCount.set(rawBase, count);
    const nameWithSuffix = count > 1 ? `${rawBase} (${count})` : rawBase;
    const sheetName = sanitizeSheetName(nameWithSuffix);

    const reportWs = buildReportWorksheet(
      {
        period_month: rep.period_month,
        period_year: rep.period_year,
        invoice_number: rep.invoice_number,
        contractor_snapshot: rep.contractor_snapshot,
        client_snapshot: rep.client_snapshot,
      },
      rep.entries
    );

    XLSX.utils.book_append_sheet(wb, reportWs, sheetName);
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

import React from "react";
import path from "path";
import {
  Document,
  Font,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

let fontRegistered = false;

function ensureFonts() {
  if (fontRegistered) return;

  Font.register({
    family: "Roboto",
    fonts: [
      { src: path.join(FONTS_DIR, "Roboto-Regular.ttf") },
      { src: path.join(FONTS_DIR, "Roboto-Bold.ttf"), fontWeight: 700 },
      { src: path.join(FONTS_DIR, "Roboto-Italic.ttf"), fontStyle: "italic" },
    ],
  });

  fontRegistered = true;
}

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export interface ReportForPdf {
  period_month: number;
  period_year: number;
  invoice_number: string | null;
  target_amount: number;
  calculated_amount: number;
  contractor_snapshot: Record<string, unknown>;
  client_snapshot: Record<string, unknown>;
}

export interface EntryForPdf {
  work_date: string;
  day_of_week: string;
  week_number: number;
  description: string;
  category: string;
  hours: number;
  hourly_rate: number;
  line_total: number;
}

interface DayGroup {
  date: string;
  dateShort: string;
  dayOfWeek: string;
  entries: EntryForPdf[];
}

interface WeekGroup {
  weekNum: number;
  startDate: string;
  endDate: string;
  days: DayGroup[];
}

function buildWeekGroups(entries: EntryForPdf[]): WeekGroup[] {
  const byDate = new Map<string, DayGroup>();
  entries.forEach((e) => {
    let g = byDate.get(e.work_date);
    if (!g) {
      const [yr, mo, dy] = e.work_date.split("-");
      g = { date: e.work_date, dateShort: `${dy}.${mo}.${yr}`, dayOfWeek: e.day_of_week, entries: [] };
      byDate.set(e.work_date, g);
    }
    g.entries.push(e);
  });

  const byWeek = new Map<number, DayGroup[]>();
  byDate.forEach((d) => {
    const wn = d.entries[0].week_number;
    byWeek.set(wn, [...(byWeek.get(wn) ?? []), d]);
  });

  return Array.from(byWeek.keys())
    .sort((a, b) => a - b)
    .map((wn) => {
      const days = byWeek.get(wn)!.sort((a, b) => (a.date < b.date ? -1 : 1));
      return { weekNum: wn, startDate: days[0].date, endDate: days[days.length - 1].date, days };
    });
}

function fmtPLN(amount: number): string {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(amount);
}

function fmtH(h: number): string {
  return h.toFixed(1).replace(".", ",");
}

function fmtShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

function str(v: unknown): string {
  return v ? String(v) : "";
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 8,
    paddingTop: "20mm",
    paddingBottom: "18mm",
    paddingLeft: "20mm",
    paddingRight: "20mm",
    backgroundColor: "#ffffff",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "5mm" },
  titleText: { fontFamily: "Roboto", fontWeight: 700, fontSize: 18, color: "#0f172a" },
  subtitleText: { fontSize: 9, color: "#475569", marginTop: "1mm" },
  invoiceText: { fontSize: 9, color: "#475569", textAlign: "right" },
  divider: { borderBottom: "1pt", borderBottomColor: "#e2e8f0", marginBottom: "4mm" },
  companiesRow: { flexDirection: "row", marginBottom: "5mm" },
  companyCol: { flex: 1 },
  companyLabel: { fontFamily: "Roboto", fontWeight: 700, fontSize: 7, color: "#94a3b8", marginBottom: "1.5mm", textTransform: "uppercase" },
  companyName: { fontFamily: "Roboto", fontWeight: 700, fontSize: 8, color: "#1e293b", marginBottom: "0.5mm" },
  companyDetail: { fontSize: 7.5, color: "#475569", marginBottom: "0.3mm" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f3f4f6" },
  tableRow: { flexDirection: "row" },
  tableRowAlt: { flexDirection: "row", backgroundColor: "#f8fafc" },
  daySummaryRow: { flexDirection: "row", backgroundColor: "#e5e7eb" },
  weekSummaryRow: { flexDirection: "row", backgroundColor: "#d1d5db" },
  monthSummaryRow: { flexDirection: "row", backgroundColor: "#1e293b" },
  cellDate: { width: "22mm", padding: "1.5mm 2mm", borderRight: "0.3pt", borderRightColor: "#e5e7eb" },
  cellDay: { width: "28mm", padding: "1.5mm 2mm", borderRight: "0.3pt", borderRightColor: "#e5e7eb" },
  cellDesc: { flex: 1, padding: "1.5mm 2mm", borderRight: "0.3pt", borderRightColor: "#e5e7eb" },
  cellCat: { width: "35mm", padding: "1.5mm 2mm", borderRight: "0.3pt", borderRightColor: "#e5e7eb" },
  cellHours: { width: "14mm", padding: "1.5mm 2mm", textAlign: "right", borderRight: "0.3pt", borderRightColor: "#e5e7eb" },
  cellAmount: { width: "28mm", padding: "1.5mm 2mm", textAlign: "right" },
  cellMerged: { flex: 1, padding: "1.5mm 2mm" },
  thText: { fontFamily: "Roboto", fontWeight: 700, fontSize: 7.5, color: "#374151" },
  tdText: { fontSize: 7.5, color: "#334155" },
  daySumText: { fontFamily: "Roboto", fontStyle: "italic", fontSize: 7.5, color: "#4b5563" },
  weekSumText: { fontFamily: "Roboto", fontWeight: 700, fontSize: 7.5, color: "#1f2937" },
  monthSumText: { fontFamily: "Roboto", fontWeight: 700, fontSize: 8.5, color: "#ffffff" },
  footer: { position: "absolute", bottom: "8mm", left: "20mm", right: "20mm", flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#9ca3af" },
});

function ReportDocument({ report, entries }: { report: ReportForPdf; entries: EntryForPdf[] }) {
  const weekGroups = buildWeekGroups(entries);
  const monthHours = entries.reduce((s, e) => s + e.hours, 0);
  const monthAmount = entries.reduce((s, e) => s + e.line_total, 0);
  const profile = report.contractor_snapshot;
  const settings = report.client_snapshot;
  const generatedDate = new Date().toLocaleDateString("pl-PL");

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Nagłówek */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.titleText}>TIME SHEET</Text>
            <Text style={styles.subtitleText}>
              Okres: {MONTHS_PL[report.period_month - 1]} {report.period_year}
            </Text>
          </View>
          {!!report.invoice_number && (
            <View>
              <Text style={styles.invoiceText}>Nr faktury: {report.invoice_number}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Dane firm */}
        <View style={styles.companiesRow}>
          <View style={styles.companyCol}>
            <Text style={styles.companyLabel}>Zleceniobiorca</Text>
            <Text style={styles.companyName}>{str(profile?.contractor_name) || "—"}</Text>
            {!!profile?.contractor_company && <Text style={styles.companyDetail}>{str(profile.contractor_company)}</Text>}
            {!!profile?.contractor_nip && <Text style={styles.companyDetail}>NIP: {str(profile.contractor_nip)}</Text>}
            {!!profile?.contractor_address && <Text style={styles.companyDetail}>{str(profile.contractor_address)}</Text>}
            {!!profile?.contractor_bank_account && <Text style={styles.companyDetail}>Konto: {str(profile.contractor_bank_account)}</Text>}
          </View>
          <View style={styles.companyCol}>
            <Text style={styles.companyLabel}>Zleceniodawca</Text>
            <Text style={styles.companyName}>{str(settings?.client_name) || "—"}</Text>
            {!!settings?.client_nip && <Text style={styles.companyDetail}>NIP: {str(settings.client_nip)}</Text>}
            {!!settings?.client_address && <Text style={styles.companyDetail}>{str(settings.client_address)}</Text>}
          </View>
        </View>

        {/* Tabela */}
        <View>
          {/* Nagłówek tabeli */}
          <View style={styles.tableHeaderRow}>
            <View style={styles.cellDate}><Text style={styles.thText}>Data</Text></View>
            <View style={styles.cellDay}><Text style={styles.thText}>Dzień tygodnia</Text></View>
            <View style={styles.cellDesc}><Text style={styles.thText}>Wykonywana praca</Text></View>
            <View style={styles.cellCat}><Text style={styles.thText}>Kategoria</Text></View>
            <View style={styles.cellHours}><Text style={styles.thText}>h</Text></View>
            <View style={styles.cellAmount}><Text style={styles.thText}>Kwota PLN</Text></View>
          </View>

          {/* Wiersze danych */}
          {weekGroups.map((week) => {
            const weekHours = week.days.reduce((s, d) => s + d.entries.reduce((ss, e) => ss + e.hours, 0), 0);
            const weekAmount = week.days.reduce((s, d) => s + d.entries.reduce((ss, e) => ss + e.line_total, 0), 0);

            return (
              <React.Fragment key={`w${week.weekNum}`}>
                {week.days.map((day) => {
                  const dayHours = day.entries.reduce((s, e) => s + e.hours, 0);
                  const dayAmount = day.entries.reduce((s, e) => s + e.line_total, 0);

                  return (
                    <React.Fragment key={`d${day.date}`}>
                      {day.entries.map((entry, i) => (
                        <View key={`e${day.date}-${i}`} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                          <View style={styles.cellDate}>
                            {i === 0 && <Text style={styles.tdText}>{day.dateShort}</Text>}
                          </View>
                          <View style={styles.cellDay}>
                            {i === 0 && <Text style={styles.tdText}>{day.dayOfWeek}</Text>}
                          </View>
                          <View style={styles.cellDesc}>
                            <Text style={styles.tdText}>{entry.description}</Text>
                          </View>
                          <View style={styles.cellCat}>
                            <Text style={styles.tdText}>{entry.category}</Text>
                          </View>
                          <View style={styles.cellHours}>
                            <Text style={styles.tdText}>{fmtH(entry.hours)}</Text>
                          </View>
                          <View style={styles.cellAmount}>
                            <Text style={styles.tdText}>{fmtPLN(entry.line_total)}</Text>
                          </View>
                        </View>
                      ))}
                      {/* Suma dzienna */}
                      <View style={styles.daySummaryRow}>
                        <View style={styles.cellMerged}>
                          <Text style={[styles.daySumText, { textAlign: "right" }]}>Suma dzienna:</Text>
                        </View>
                        <View style={styles.cellHours}>
                          <Text style={styles.daySumText}>{fmtH(dayHours)}</Text>
                        </View>
                        <View style={styles.cellAmount}>
                          <Text style={styles.daySumText}>{fmtPLN(dayAmount)}</Text>
                        </View>
                      </View>
                    </React.Fragment>
                  );
                })}
                {/* Suma tygodniowa */}
                <View style={styles.weekSummaryRow}>
                  <View style={styles.cellMerged}>
                    <Text style={styles.weekSumText}>
                      Suma tygodnia {week.weekNum} ({fmtShort(week.startDate)}–{fmtShort(week.endDate)}):
                    </Text>
                  </View>
                  <View style={styles.cellHours}>
                    <Text style={styles.weekSumText}>{fmtH(weekHours)}</Text>
                  </View>
                  <View style={styles.cellAmount}>
                    <Text style={styles.weekSumText}>{fmtPLN(weekAmount)}</Text>
                  </View>
                </View>
              </React.Fragment>
            );
          })}

          {/* Suma miesięczna */}
          <View style={styles.monthSummaryRow}>
            <View style={styles.cellMerged}>
              <Text style={styles.monthSumText}>
                SUMA MIESIĄCA {MONTHS_PL[report.period_month - 1].toUpperCase()} {report.period_year}:
              </Text>
            </View>
            <View style={styles.cellHours}>
              <Text style={styles.monthSumText}>{fmtH(monthHours)}</Text>
            </View>
            <View style={styles.cellAmount}>
              <Text style={styles.monthSumText}>{fmtPLN(monthAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Stopka */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Wygenerowano: {generatedDate}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePdf(
  report: ReportForPdf,
  entries: EntryForPdf[]
): Promise<Buffer> {
  ensureFonts();
  const buf = await renderToBuffer(<ReportDocument report={report} entries={entries} />);
  return buf as Buffer;
}

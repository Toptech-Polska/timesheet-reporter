import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/roles";
import { generateBulkXlsx, type ReportForBulkXlsx, type EntryForXlsx } from "@/lib/export/toXlsx";
import { revalidatePath } from "next/cache";

const MONTHS_SAFE = [
  "styczen", "luty", "marzec", "kwiecien", "maj", "czerwiec",
  "lipiec", "sierpien", "wrzesien", "pazdziernik", "listopad", "grudzien",
];

export async function GET(req: Request) {
  try {
    // Sprawdź rolę admina przez zwykły klient (sesja)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return new Response("Brak autoryzacji", { status: 401 });

    const adminStatus = await isAdmin(supabase);
    if (!adminStatus) return new Response("Brak uprawnień", { status: 403 });

    // Parsuj parametry
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") ?? "0");
    const month = parseInt(searchParams.get("month") ?? "0");
    const status = searchParams.get("status") ?? "";

    if (!year) return new Response("Parametr 'year' jest wymagany", { status: 400 });

    // Pobierz dane przez klienta admin (omija RLS)
    const adminClient = createAdminClient();

    let reportsQuery = adminClient
      .schema("timesheet")
      .from("reports")
      .select("id, period_month, period_year, invoice_number, target_amount, calculated_amount, amount_difference, status, contractor_snapshot, client_snapshot, profiles(contractor_name, contractor_email)")
      .eq("period_year", year);

    if (month > 0) reportsQuery = reportsQuery.eq("period_month", month);
    if (status && status !== "all") reportsQuery = reportsQuery.eq("status", status);

    const { data: rawReports, error: reportsError } = await reportsQuery
      .order("period_month")
      .order("created_at");

    if (reportsError) {
      console.error("Bulk export reports error:", reportsError);
      return new Response("Błąd pobierania raportów", { status: 500 });
    }

    if (!rawReports || rawReports.length === 0) {
      return new Response("Brak raportów dla podanych filtrów", { status: 404 });
    }

    // Pobierz wszystkie wpisy jednym zapytaniem
    const reportIds = rawReports.map((r) => r.id);
    const { data: allEntries, error: entriesError } = await adminClient
      .schema("timesheet")
      .from("report_entries")
      .select("report_id, work_date, day_of_week, week_number, description, category, hours, hourly_rate, line_total, sort_order")
      .in("report_id", reportIds)
      .order("report_id")
      .order("sort_order");

    if (entriesError) {
      console.error("Bulk export entries error:", entriesError);
      return new Response("Błąd pobierania wpisów", { status: 500 });
    }

    // Grupuj wpisy po report_id
    const entriesMap = new Map<string, EntryForXlsx[]>();
    for (const e of allEntries ?? []) {
      const list = entriesMap.get(e.report_id) ?? [];
      list.push({
        work_date: e.work_date,
        day_of_week: e.day_of_week,
        week_number: e.week_number,
        description: e.description,
        category: e.category,
        hours: e.hours,
        hourly_rate: e.hourly_rate,
        line_total: e.line_total,
      });
      entriesMap.set(e.report_id, list);
    }

    // Zbuduj strukturę dla bulk exportu
    const reports: ReportForBulkXlsx[] = rawReports.map((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileRaw = (r as any).profiles;
      const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
      return {
        id: r.id,
        period_month: r.period_month,
        period_year: r.period_year,
        invoice_number: r.invoice_number ?? null,
        target_amount: r.target_amount ?? 0,
        calculated_amount: r.calculated_amount ?? 0,
        status: r.status,
        contractor_name: profile?.contractor_name ?? "",
        contractor_email: profile?.contractor_email ?? "",
        contractor_snapshot: (r.contractor_snapshot as Record<string, unknown>) ?? {},
        client_snapshot: (r.client_snapshot as Record<string, unknown>) ?? {},
        entries: entriesMap.get(r.id) ?? [],
      };
    });

    const buffer = generateBulkXlsx(reports);

    const monthSafe = month > 0 ? `-${MONTHS_SAFE[month - 1]}` : "";
    const filename = `timesheet-zbiorczo-${year}${monthSafe}.xlsx`;

    revalidatePath("/admin/raporty");

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Bulk export error:", err);
    return new Response("Błąd generowania pliku", { status: 500 });
  }
}

import { createClient } from "@/lib/supabase/server";
import { generateXlsx } from "@/lib/export/toXlsx";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const MONTHS_SAFE = [
  "styczen", "luty", "marzec", "kwiecien", "maj", "czerwiec",
  "lipiec", "sierpien", "wrzesien", "pazdziernik", "listopad", "grudzien",
];

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Brak autoryzacji", { status: 401 });
    }

    const { data: report } = await supabase
      .schema("timesheet")
      .from("reports")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .in("status", ["approved", "exported"])
      .maybeSingle();

    if (!report) {
      return new Response("Raport nie istnieje lub brak uprawnień do eksportu", { status: 404 });
    }

    const { data: entriesData } = await supabase
      .schema("timesheet")
      .from("report_entries")
      .select("*")
      .eq("report_id", params.id)
      .order("sort_order");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries = (entriesData ?? []).map((e: any) => ({
      work_date: e.work_date as string,
      day_of_week: e.day_of_week as string,
      week_number: e.week_number as number,
      description: e.work_description as string,
      category: e.category as string,
      hours: e.hours as number,
      hourly_rate: e.hourly_rate as number,
      line_total: e.line_total as number,
    }));

    const buffer = generateXlsx(
      {
        period_month: report.period_month,
        period_year: report.period_year,
        invoice_number: report.invoice_number ?? null,
        contractor_snapshot: report.contractor_snapshot ?? {},
        client_snapshot: report.client_snapshot ?? {},
      },
      entries
    );

    if (report.status === "approved") {
      await supabase
        .schema("timesheet")
        .from("reports")
        .update({ status: "exported" })
        .eq("id", params.id);

      revalidatePath("/raporty");
      revalidatePath(`/raporty/${params.id}`);
    }

    const month = MONTHS_SAFE[report.period_month - 1];
    const filename = `timesheet-${month}-${report.period_year}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("XLSX route error:", err);
    return new Response("Błąd generowania pliku Excel", { status: 500 });
  }
}

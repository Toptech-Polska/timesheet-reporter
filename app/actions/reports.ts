"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { EditableEntry } from "@/components/generator/types";

export interface SaveReportData {
  schema_id: string | null;
  period_month: number;
  period_year: number;
  target_amount: number;
  calculated_amount: number;
  amount_difference: number;
  status: "draft" | "approved";
  invoice_number: string | null;
  entries: EditableEntry[];
  notes: string | null;
}

export async function saveReport(
  data: SaveReportData
): Promise<{ id: string } | { error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Brak autoryzacji" };

    const [{ data: profile }, { data: settings }] = await Promise.all([
      supabase
        .schema("timesheet")
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .schema("timesheet")
        .from("app_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    const title = `Raport ${String(data.period_month).padStart(2, "0")}/${data.period_year}`;

    const { data: report, error: reportError } = await supabase
      .schema("timesheet")
      .from("reports")
      .insert({
        user_id: user.id,
        schema_id: data.schema_id,
        title,
        period_month: data.period_month,
        period_year: data.period_year,
        target_amount: data.target_amount,
        calculated_amount: data.calculated_amount,
        amount_difference: data.amount_difference,
        status: data.status,
        invoice_number: data.invoice_number || null,
        notes: data.notes || null,
        contractor_snapshot: profile ?? {},
        client_snapshot: settings ?? {},
        approved_at:
          data.status === "approved" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (reportError || !report) {
      console.error("saveReport:", reportError);
      return { error: "Nie udało się zapisać raportu." };
    }

    const entriesPayload = data.entries.map((e, i) => ({
      report_id: report.id,
      work_date: e.work_date,
      day_of_week: e.day_of_week,
      week_number: e.week_number,
      work_description: e.description,
      category: e.category,
      hours: e.hours,
      hourly_rate: e.hourly_rate,
      sort_order: i,
      is_manually_edited: e.is_manually_edited,
    }));

    const { error: entriesError } = await supabase
      .schema("timesheet")
      .from("report_entries")
      .insert(entriesPayload);

    if (entriesError) {
      console.error("saveReport entries:", entriesError);
      await supabase
        .schema("timesheet")
        .from("reports")
        .delete()
        .eq("id", report.id);
      return { error: "Nie udało się zapisać wpisów raportu." };
    }

    revalidatePath("/raporty");
    return { id: report.id };
  } catch (e) {
    console.error("saveReport exception:", e);
    return { error: "Wystąpił nieoczekiwany błąd." };
  }
}

export async function deleteReport(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Brak autoryzacji" };

    const { error } = await supabase
      .schema("timesheet")
      .from("reports")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("deleteReport:", error);
      return { error: "Nie udało się usunąć raportu." };
    }

    revalidatePath("/raporty");
    return {};
  } catch (e) {
    console.error("deleteReport exception:", e);
    return { error: "Wystąpił nieoczekiwany błąd." };
  }
}

export async function approveReport(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Brak autoryzacji" };

    const { error } = await supabase
      .schema("timesheet")
      .from("reports")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("approveReport:", error);
      return { error: "Nie udało się zatwierdzić raportu." };
    }

    revalidatePath("/raporty");
    revalidatePath(`/raporty/${id}`);
    return {};
  } catch (e) {
    console.error("approveReport exception:", e);
    return { error: "Wystąpił nieoczekiwany błąd." };
  }
}

export async function updateInvoiceNumber(
  id: string,
  number: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Brak autoryzacji" };

    const { error } = await supabase
      .schema("timesheet")
      .from("reports")
      .update({ invoice_number: number.trim() || null })
      .eq("id", id)
      .eq("user_id", user.id)
      .in("status", ["approved", "exported"]);

    if (error) {
      console.error("updateInvoiceNumber:", error);
      return { error: "Nie udało się zapisać numeru faktury." };
    }

    revalidatePath(`/raporty/${id}`);
    revalidatePath("/raporty");
    return {};
  } catch (e) {
    console.error("updateInvoiceNumber exception:", e);
    return { error: "Wystąpił nieoczekiwany błąd." };
  }
}

export async function updateReportEntries(
  reportId: string,
  entries: EditableEntry[]
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Brak autoryzacji" };

    const { data: report } = await supabase
      .schema("timesheet")
      .from("reports")
      .select("id, target_amount")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!report) return { error: "Raport nie istnieje lub nie można go edytować." };

    const { error: deleteError } = await supabase
      .schema("timesheet")
      .from("report_entries")
      .delete()
      .eq("report_id", reportId);

    if (deleteError) {
      console.error("updateReportEntries delete:", deleteError);
      return { error: "Nie udało się zaktualizować wpisów raportu." };
    }

    const entriesPayload = entries.map((e, i) => ({
      report_id: reportId,
      work_date: e.work_date,
      day_of_week: e.day_of_week,
      week_number: e.week_number,
      work_description: e.description,
      category: e.category,
      hours: e.hours,
      hourly_rate: e.hourly_rate,
      sort_order: i,
      is_manually_edited: e.is_manually_edited,
    }));

    const { error: insertError } = await supabase
      .schema("timesheet")
      .from("report_entries")
      .insert(entriesPayload);

    if (insertError) {
      console.error("updateReportEntries insert:", insertError);
      return { error: "Nie udało się zaktualizować wpisów raportu." };
    }

    const calculated_amount = entries.reduce((s, e) => s + e.line_total, 0);
    const amount_difference = (report.target_amount ?? 0) - calculated_amount;

    await supabase
      .schema("timesheet")
      .from("reports")
      .update({ calculated_amount, amount_difference, status: "draft" })
      .eq("id", reportId);

    revalidatePath(`/raporty/${reportId}`);
    return {};
  } catch (e) {
    console.error("updateReportEntries exception:", e);
    return { error: "Wystąpił nieoczekiwany błąd." };
  }
}

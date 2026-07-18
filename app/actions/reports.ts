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
  /** Konfiguracja generatora (tryb, schematy, wagi) — do odtworzenia ustawień */
  generation_config?: Record<string, unknown> | null;
}

// Tylko pola merytoryczne trafiają do snapshotu drukowanego na raportach —
// bez pól technicznych (is_active, google_drive_folder_id itd.).
const PROFILE_SNAPSHOT_FIELDS =
  "contractor_name, contractor_company, contractor_nip, contractor_address, contractor_email, contractor_bank_account";
const SETTINGS_SNAPSHOT_FIELDS =
  "client_name, client_nip, client_address, client_email, client_website";

function validateEntries(entries: EditableEntry[]): string | null {
  if (!entries.length) {
    return "Raport musi zawierać co najmniej jeden wpis.";
  }
  for (const e of entries) {
    const hours = Number(e.hours);
    const rate = Number(e.hourly_rate);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
      return "Nieprawidłowa liczba godzin we wpisie raportu.";
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      return "Nieprawidłowa stawka godzinowa we wpisie raportu.";
    }
  }
  return null;
}

// Kwoty liczone serwerowo z godzin i stawek — nie ufamy wartościom
// line_total/calculated_amount przysłanym z przeglądarki.
function computeCalculatedAmount(entries: EditableEntry[]): number {
  const sum = entries.reduce(
    (s, e) => s + Number(e.hours) * Number(e.hourly_rate),
    0
  );
  return Math.round(sum * 100) / 100;
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

    const validationError = validateEntries(data.entries);
    if (validationError) return { error: validationError };

    const calculated_amount = computeCalculatedAmount(data.entries);
    const amount_difference =
      Math.round((data.target_amount - calculated_amount) * 100) / 100;

    const [{ data: profile }, { data: settings }] = await Promise.all([
      supabase
        .schema("timesheet")
        .from("profiles")
        .select(PROFILE_SNAPSHOT_FIELDS)
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .schema("timesheet")
        .from("app_settings")
        .select(SETTINGS_SNAPSHOT_FIELDS)
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
        calculated_amount,
        amount_difference,
        status: data.status,
        invoice_number: data.invoice_number || null,
        notes: data.notes || null,
        generation_config: data.generation_config ?? null,
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
      schema_id: e.schema_id ?? null,
      schema_name: e.schema_name ?? null,
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

    // Usuwać można wyłącznie wersje robocze — zgodnie z komunikatem w UI.
    const { data: deleted, error } = await supabase
      .schema("timesheet")
      .from("reports")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "draft")
      .select("id");

    if (error) {
      console.error("deleteReport:", error);
      return { error: "Nie udało się usunąć raportu." };
    }

    if (!deleted || deleted.length === 0) {
      return { error: "Można usuwać tylko raporty w wersji roboczej." };
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

    const validationError = validateEntries(entries);
    if (validationError) return { error: validationError };

    const { data: report } = await supabase
      .schema("timesheet")
      .from("reports")
      .select("id, target_amount")
      .eq("id", reportId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!report) return { error: "Raport nie istnieje lub nie można go edytować." };

    // Kopia zapasowa istniejących wpisów — pozwala je przywrócić, jeśli
    // insert nowych się nie powiedzie (delete+insert nie jest transakcją).
    const { data: backup, error: backupError } = await supabase
      .schema("timesheet")
      .from("report_entries")
      .select(
        "work_date, day_of_week, week_number, work_description, category, hours, hourly_rate, sort_order, is_manually_edited, schema_id, schema_name"
      )
      .eq("report_id", reportId);

    if (backupError) {
      console.error("updateReportEntries backup:", backupError);
      return { error: "Nie udało się zaktualizować wpisów raportu." };
    }

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
      schema_id: e.schema_id ?? null,
      schema_name: e.schema_name ?? null,
    }));

    const { error: insertError } = await supabase
      .schema("timesheet")
      .from("report_entries")
      .insert(entriesPayload);

    if (insertError) {
      console.error("updateReportEntries insert:", insertError);

      // Best-effort rollback: przywróć wpisy sprzed edycji.
      if (backup && backup.length > 0) {
        const restorePayload = backup.map((b) => ({
          ...b,
          report_id: reportId,
        }));
        const { error: restoreError } = await supabase
          .schema("timesheet")
          .from("report_entries")
          .insert(restorePayload);
        if (restoreError) {
          console.error("updateReportEntries restore failed:", restoreError);
        }
      }

      return { error: "Nie udało się zaktualizować wpisów raportu." };
    }

    const calculated_amount = computeCalculatedAmount(entries);
    const amount_difference =
      Math.round(((report.target_amount ?? 0) - calculated_amount) * 100) / 100;

    const { error: updateError } = await supabase
      .schema("timesheet")
      .from("reports")
      .update({ calculated_amount, amount_difference, status: "draft" })
      .eq("id", reportId);

    if (updateError) {
      console.error("updateReportEntries report update:", updateError);
    }

    revalidatePath(`/raporty/${reportId}`);
    return {};
  } catch (e) {
    console.error("updateReportEntries exception:", e);
    return { error: "Wystąpił nieoczekiwany błąd." };
  }
}

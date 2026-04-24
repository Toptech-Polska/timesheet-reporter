"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

async function getAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, user: null };
  if (user.app_metadata?.user_role !== "admin")
    return { supabase: null, user: null };
  return { supabase, user };
}

export async function addAllowedEmail(
  email: string,
  note: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAdminClient();
    if (!supabase || !user) return { success: false, error: "Brak uprawnień" };

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return { success: false, error: "Nieprawidłowy adres e-mail" };
    }

    const { error } = await supabase
      .schema("timesheet")
      .from("allowed_emails")
      .insert({
        email: normalizedEmail,
        note: note.trim() || null,
        added_by: user.id,
      });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Ten adres e-mail już jest na liście" };
      }
      return { success: false, error: "Nie udało się dodać adresu" };
    }

    revalidatePath("/admin/uzytkownicy");
    return { success: true };
  } catch {
    return { success: false, error: "Wystąpił nieoczekiwany błąd" };
  }
}

export async function removeAllowedEmail(
  email: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAdminClient();
    if (!supabase || !user) return { success: false, error: "Brak uprawnień" };

    if (user.email === email) {
      return {
        success: false,
        error: "Nie możesz usunąć własnego adresu e-mail",
      };
    }

    const { error } = await supabase
      .schema("timesheet")
      .from("allowed_emails")
      .delete()
      .eq("email", email);

    if (error) {
      return { success: false, error: "Nie udało się usunąć adresu" };
    }

    revalidatePath("/admin/uzytkownicy");
    return { success: true };
  } catch {
    return { success: false, error: "Wystąpił nieoczekiwany błąd" };
  }
}

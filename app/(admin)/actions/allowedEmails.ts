"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  if (user.app_metadata?.user_role !== "admin") return null;
  return user;
}

export async function addAllowedEmail(
  email: string,
  note: string
): Promise<ActionResult> {
  try {
    const user = await verifyAdmin();
    if (!user) return { success: false, error: "Brak uprawnień" };

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      return { success: false, error: "Nieprawidłowy adres e-mail" };
    }

    const db = createAdminClient();
    const { error } = await db
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
      console.error("addAllowedEmail error:", error);
      return { success: false, error: "Nie udało się dodać adresu" };
    }

    revalidatePath("/admin/uzytkownicy");
    return { success: true };
  } catch (e) {
    console.error("addAllowedEmail exception:", e);
    return { success: false, error: "Wystąpił nieoczekiwany błąd" };
  }
}

export async function removeAllowedEmail(
  email: string
): Promise<ActionResult> {
  try {
    const user = await verifyAdmin();
    if (!user) return { success: false, error: "Brak uprawnień" };

    if (user.email === email) {
      return {
        success: false,
        error: "Nie możesz usunąć własnego adresu e-mail",
      };
    }

    const db = createAdminClient();
    const { error } = await db
      .schema("timesheet")
      .from("allowed_emails")
      .delete()
      .eq("email", email);

    if (error) {
      console.error("removeAllowedEmail error:", error);
      return { success: false, error: "Nie udało się usunąć adresu" };
    }

    revalidatePath("/admin/uzytkownicy");
    return { success: true };
  } catch (e) {
    console.error("removeAllowedEmail exception:", e);
    return { success: false, error: "Wystąpił nieoczekiwany błąd" };
  }
}

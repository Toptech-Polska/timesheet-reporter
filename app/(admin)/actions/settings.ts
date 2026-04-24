"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface SettingsData {
  client_name: string;
  client_nip: string;
  client_address: string;
  client_email: string | null;
  client_website: string | null;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function updateSettings(data: SettingsData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Brak autoryzacji" };
    }

    const role = user.app_metadata?.user_role;
    if (role !== "admin") {
      return { success: false, error: "Brak uprawnień" };
    }

    const { error } = await supabase
      .schema("timesheet")
      .from("app_settings")
      .update({
        client_name: data.client_name,
        client_nip: data.client_nip,
        client_address: data.client_address,
        client_email: data.client_email || null,
        client_website: data.client_website || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", 1);

    if (error) {
      console.error("updateSettings error:", error);
      return { success: false, error: "Nie udało się zapisać danych. Spróbuj ponownie." };
    }

    revalidatePath("/admin/ustawienia");
    revalidatePath("/profil");
    return { success: true };
  } catch (e) {
    console.error("updateSettings exception:", e);
    return { success: false, error: "Wystąpił nieoczekiwany błąd." };
  }
}

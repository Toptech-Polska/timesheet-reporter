"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ProfileData {
  contractor_name: string;
  contractor_company: string | null;
  contractor_nip: string | null;
  contractor_address: string | null;
  contractor_email: string | null;
  contractor_bank_account: string | null;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function updateProfile(data: ProfileData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Brak autoryzacji" };
    }

    const { error } = await supabase
      .schema("timesheet")
      .from("profiles")
      .upsert({
        id: user.id,
        contractor_name: data.contractor_name,
        contractor_company: data.contractor_company || null,
        contractor_nip: data.contractor_nip || null,
        contractor_address: data.contractor_address || null,
        contractor_email: data.contractor_email || null,
        contractor_bank_account: data.contractor_bank_account || null,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("updateProfile error:", error);
      return { success: false, error: "Nie udało się zapisać danych. Spróbuj ponownie." };
    }

    revalidatePath("/profil");
    return { success: true };
  } catch (e) {
    console.error("updateProfile exception:", e);
    return { success: false, error: "Wystąpił nieoczekiwany błąd." };
  }
}

export async function changePassword(newPassword: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      console.error("changePassword error:", error);
      return { success: false, error: "Nie udało się zmienić hasła. Spróbuj ponownie." };
    }
    return { success: true };
  } catch (e) {
    console.error("changePassword exception:", e);
    return { success: false, error: "Wystąpił nieoczekiwany błąd." };
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  error?: string;
}

async function getAdminSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, user: null };
  if (user.app_metadata?.user_role !== "admin") return { supabase: null, user: null };
  return { supabase, user };
}

export async function changeUserRole(
  targetUserId: string,
  newRole: "user" | "admin"
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAdminSupabase();
    if (!supabase || !user) return { success: false, error: "Brak uprawnień" };
    if (targetUserId === user.id) {
      return { success: false, error: "Nie możesz zmienić własnej roli" };
    }

    const { error } = await supabase
      .schema("timesheet")
      .from("user_roles")
      .upsert({ user_id: targetUserId, role: newRole });

    if (error) {
      console.error("changeUserRole error:", error);
      return { success: false, error: "Nie udało się zmienić roli." };
    }

    revalidatePath("/admin/uzytkownicy");
    return { success: true };
  } catch (e) {
    console.error("changeUserRole exception:", e);
    return { success: false, error: "Wystąpił nieoczekiwany błąd." };
  }
}

export async function toggleUserActive(
  targetUserId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAdminSupabase();
    if (!supabase || !user) return { success: false, error: "Brak uprawnień" };
    if (targetUserId === user.id) {
      return { success: false, error: "Nie możesz dezaktywować własnego konta" };
    }

    const { error } = await supabase
      .schema("timesheet")
      .from("profiles")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", targetUserId);

    if (error) {
      console.error("toggleUserActive error:", error);
      return { success: false, error: "Nie udało się zmienić statusu." };
    }

    revalidatePath("/admin/uzytkownicy");
    return { success: true };
  } catch (e) {
    console.error("toggleUserActive exception:", e);
    return { success: false, error: "Wystąpił nieoczekiwany błąd." };
  }
}

export async function updateUserDriveFolder(
  targetUserId: string,
  folderId: string | null,
  folderName: string | null
): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminSupabase();
    if (!supabase) return { success: false, error: "Brak uprawnień" };

    const { error } = await supabase
      .schema("timesheet")
      .from("profiles")
      .update({
        google_drive_folder_id: folderId || null,
        google_drive_folder_name: folderName || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (error) {
      console.error("updateUserDriveFolder error:", error);
      return { success: false, error: "Nie udało się zaktualizować folderu." };
    }

    revalidatePath(`/admin/uzytkownicy/${targetUserId}`);
    revalidatePath("/admin/uzytkownicy");
    return { success: true };
  } catch (e) {
    console.error("updateUserDriveFolder exception:", e);
    return { success: false, error: "Wystąpił nieoczekiwany błąd." };
  }
}

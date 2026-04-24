"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface WorkItemData {
  id?: string;
  description: string;
  category: string;
  hourly_rate: number;
  proportion: number;
  active_from?: string | null;
  active_until?: string | null;
  sort_order: number;
}

export interface SchemaData {
  name: string;
  description?: string | null;
  working_days_of_week: number[];
  max_hours_per_day: number;
  work_items: WorkItemData[];
}

export interface CreateSchemaResult {
  id?: string;
  error?: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

export async function createSchema(data: SchemaData): Promise<CreateSchemaResult> {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) return { error: "Brak autoryzacji" };

    const { data: schema, error: schemaError } = await supabase
      .schema("timesheet")
      .from("schemas")
      .insert({
        user_id: user.id,
        name: data.name,
        description: data.description || null,
        working_days_of_week: data.working_days_of_week,
        max_hours_per_day: data.max_hours_per_day,
        is_archived: false,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (schemaError || !schema) {
      console.error("createSchema:", schemaError);
      return { error: "Nie udało się utworzyć schematu." };
    }

    const items = data.work_items.map((item, i) => ({
      schema_id: schema.id,
      description: item.description,
      category: item.category,
      hourly_rate: item.hourly_rate,
      proportion: item.proportion,
      active_from: item.active_from || null,
      active_until: item.active_until || null,
      sort_order: i,
    }));

    const { error: itemsError } = await supabase
      .schema("timesheet")
      .from("schema_work_items")
      .insert(items);

    if (itemsError) {
      await supabase.schema("timesheet").from("schemas").delete().eq("id", schema.id);
      return { error: "Nie udało się zapisać pozycji pracy." };
    }

    revalidatePath("/schematy");
    return { id: schema.id };
  } catch (e) {
    console.error("createSchema exception:", e);
    return { error: "Wystąpił nieoczekiwany błąd." };
  }
}

export async function updateSchema(id: string, data: SchemaData): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) return { success: false, error: "Brak autoryzacji" };

    const { data: existing } = await supabase
      .schema("timesheet")
      .from("schemas")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) return { success: false, error: "Schemat nie istnieje lub brak dostępu." };

    const { error: schemaError } = await supabase
      .schema("timesheet")
      .from("schemas")
      .update({
        name: data.name,
        description: data.description || null,
        working_days_of_week: data.working_days_of_week,
        max_hours_per_day: data.max_hours_per_day,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (schemaError) return { success: false, error: "Nie udało się zaktualizować schematu." };

    // Fetch current DB item IDs
    const { data: currentItems } = await supabase
      .schema("timesheet")
      .from("schema_work_items")
      .select("id")
      .eq("schema_id", id);

    const keptIds = data.work_items.filter((i) => i.id).map((i) => i.id!);
    const idsToDelete = (currentItems ?? [])
      .map((i) => i.id as string)
      .filter((dbId) => !keptIds.includes(dbId));

    if (idsToDelete.length > 0) {
      await supabase
        .schema("timesheet")
        .from("schema_work_items")
        .delete()
        .in("id", idsToDelete);
    }

    // Update existing items
    for (const item of data.work_items.filter((i) => i.id)) {
      await supabase
        .schema("timesheet")
        .from("schema_work_items")
        .update({
          description: item.description,
          category: item.category,
          hourly_rate: item.hourly_rate,
          proportion: item.proportion,
          active_from: item.active_from || null,
          active_until: item.active_until || null,
          sort_order: data.work_items.findIndex((w) => w.id === item.id),
        })
        .eq("id", item.id!);
    }

    // Insert new items
    const newItems = data.work_items
      .filter((i) => !i.id)
      .map((item) => ({
        schema_id: id,
        description: item.description,
        category: item.category,
        hourly_rate: item.hourly_rate,
        proportion: item.proportion,
        active_from: item.active_from || null,
        active_until: item.active_until || null,
        sort_order: data.work_items.findIndex((w) => w === item),
      }));

    if (newItems.length > 0) {
      const { error: insertError } = await supabase
        .schema("timesheet")
        .from("schema_work_items")
        .insert(newItems);
      if (insertError) return { success: false, error: "Nie udało się zapisać nowych pozycji." };
    }

    revalidatePath("/schematy");
    revalidatePath(`/schematy/${id}`);
    return { success: true };
  } catch (e) {
    console.error("updateSchema exception:", e);
    return { success: false, error: "Wystąpił nieoczekiwany błąd." };
  }
}

export async function archiveSchema(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) return { success: false, error: "Brak autoryzacji" };

    const { data: schema } = await supabase
      .schema("timesheet")
      .from("schemas")
      .select("id, is_archived")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!schema) return { success: false, error: "Schemat nie istnieje." };

    const { error } = await supabase
      .schema("timesheet")
      .from("schemas")
      .update({
        is_archived: !schema.is_archived,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: "Nie udało się zmienić statusu." };

    revalidatePath("/schematy");
    return { success: true };
  } catch (e) {
    console.error("archiveSchema exception:", e);
    return { success: false, error: "Wystąpił nieoczekiwany błąd." };
  }
}

export async function duplicateSchema(
  id: string
): Promise<{ newId?: string; error?: string }> {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) return { error: "Brak autoryzacji" };

    const { data: original } = await supabase
      .schema("timesheet")
      .from("schemas")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!original) return { error: "Schemat nie istnieje." };

    const { data: originalItems } = await supabase
      .schema("timesheet")
      .from("schema_work_items")
      .select("*")
      .eq("schema_id", id)
      .order("sort_order");

    const { data: newSchema, error: newSchemaError } = await supabase
      .schema("timesheet")
      .from("schemas")
      .insert({
        user_id: user.id,
        name: `[Kopia] ${original.name}`,
        description: original.description,
        working_days_of_week: original.working_days_of_week,
        max_hours_per_day: original.max_hours_per_day,
        is_archived: false,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (newSchemaError || !newSchema) return { error: "Nie udało się zduplikować schematu." };

    if (originalItems && originalItems.length > 0) {
      const cloned = originalItems.map(
        (item: {
          description: string;
          category: string;
          hourly_rate: number;
          proportion: number;
          active_from: string | null;
          active_until: string | null;
          sort_order: number;
        }) => ({
          schema_id: newSchema.id,
          description: item.description,
          category: item.category,
          hourly_rate: item.hourly_rate,
          proportion: item.proportion,
          active_from: item.active_from,
          active_until: item.active_until,
          sort_order: item.sort_order,
        })
      );
      await supabase.schema("timesheet").from("schema_work_items").insert(cloned);
    }

    revalidatePath("/schematy");
    return { newId: newSchema.id };
  } catch (e) {
    console.error("duplicateSchema exception:", e);
    return { error: "Wystąpił nieoczekiwany błąd." };
  }
}

import { createClient } from "@/lib/supabase/server";
import { SchemaForm } from "@/components/schema/SchemaForm";

const DEFAULT_CATEGORIES = [
  "Rozwój",
  "Finanse",
  "Sprzedaż i marketing",
  "Analiza/Rozwój",
  "Rozwój/Finanse",
];

export default async function NowySchematPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const categories = await fetchCategories(supabase, user?.id ?? "");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nowy schemat</h1>
        <p className="text-sm text-slate-500 mt-1">
          Zdefiniuj strukturę pozycji pracy i konfigurację czasu
        </p>
      </div>
      <SchemaForm mode="create" categories={categories} />
    </div>
  );
}

async function fetchCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string[]> {
  const { data: userSchemas } = await supabase
    .schema("timesheet")
    .from("schemas")
    .select("id")
    .eq("user_id", userId);

  const ids = (userSchemas ?? []).map((s) => s.id);

  if (ids.length === 0) return DEFAULT_CATEGORIES;

  const { data: items } = await supabase
    .schema("timesheet")
    .from("schema_work_items")
    .select("category")
    .in("schema_id", ids);

  const used = Array.from(
    new Set((items ?? []).map((i) => i.category).filter(Boolean))
  ) as string[];

  return Array.from(new Set([...DEFAULT_CATEGORIES, ...used]));
}

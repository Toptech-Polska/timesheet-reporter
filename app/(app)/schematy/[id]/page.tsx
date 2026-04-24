import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SchemaForm, type SchemaFormValues } from "@/components/schema/SchemaForm";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();
  const { data: schema } = await supabase
    .schema("timesheet")
    .from("schemas")
    .select("name")
    .eq("id", params.id)
    .maybeSingle();

  if (!schema) return { title: "Schemat | TimeSheet Reporter" };
  return { title: `${schema.name} | TimeSheet Reporter` };
}

const DEFAULT_CATEGORIES = [
  "Rozwój",
  "Finanse",
  "Sprzedaż i marketing",
  "Analiza/Rozwój",
  "Rozwój/Finanse",
];

export default async function EditSchemaPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: schema } = await supabase
    .schema("timesheet")
    .from("schemas")
    .select("*, schema_work_items(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!schema) notFound();

  const workItems = (
    (schema.schema_work_items as Array<{
      id: string;
      description: string;
      category: string;
      hourly_rate: number;
      proportion: number;
      active_from: string | null;
      active_until: string | null;
      sort_order: number;
    }>) ?? []
  )
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      db_id: item.id,
      description: item.description ?? "",
      category: item.category ?? "",
      hourly_rate: Number(item.hourly_rate) || 200,
      proportion: Number(item.proportion) || 1,
      active_from: item.active_from ?? "",
      active_until: item.active_until ?? "",
    }));

  const initialData: SchemaFormValues = {
    name: schema.name ?? "",
    description: schema.description ?? "",
    working_days_of_week: (schema.working_days_of_week as number[]) ?? [
      1, 2, 3, 4, 5,
    ],
    max_hours_per_day: Number(schema.max_hours_per_day) || 8,
    work_items: workItems.length > 0 ? workItems : [],
  };

  const categories = await fetchCategories(supabase, user.id);

  return (
    <div className="max-w-3xl space-y-6">
      <Breadcrumbs
        crumbs={[
          { label: "Schematy", href: "/schematy" },
          { label: schema.name },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Edytuj schemat:{" "}
          <span className="text-blue-600">{schema.name}</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Zmiany zostaną zastosowane do nowych raportów
        </p>
      </div>
      <SchemaForm
        mode="edit"
        schemaId={id}
        initialData={initialData}
        categories={categories}
      />
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

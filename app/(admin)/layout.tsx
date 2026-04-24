import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/logowanie");
  }

  const adminStatus = await isAdmin(supabase);
  if (!adminStatus) {
    redirect("/brak-uprawnien");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar userEmail={user.email ?? ""} />
      <main className="lg:pl-60">
        <div className="pt-14 lg:pt-0">
          <div className="px-6 py-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

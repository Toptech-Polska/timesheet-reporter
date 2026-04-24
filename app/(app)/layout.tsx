import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        userEmail={user.email ?? ""}
        isAdmin={adminStatus}
      />
      <main className="lg:pl-60">
        <div className="pt-14 lg:pt-0">
          <div className="px-6 py-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Clock,
  Menu,
  X,
  ArrowLeft,
  LayoutGrid,
} from "lucide-react";

interface AdminSidebarProps {
  userEmail: string;
}

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/uzytkownicy", label: "Użytkownicy", icon: Users },
  { href: "/admin/raporty", label: "Raporty", icon: FileText },
  { href: "/admin/ustawienia", label: "Ustawienia", icon: Settings },
];

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/logowanie");
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const content = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100 w-60">
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-blue-400 shrink-0" />
          <span className="text-lg font-bold tracking-tight text-white">
            TimeSheet
          </span>
        </div>
        <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
          ADMIN
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {adminLinks.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 px-4 py-4">
        <p className="text-xs text-slate-400 truncate mb-3" title={userEmail}>
          {userEmail}
        </p>
        <Link
          href="/raporty"
          onClick={() => setMobileOpen(false)}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors mb-1"
        >
          <ArrowLeft className="size-4 shrink-0" />
          Wróć do aplikacji
        </Link>
        <a
          href="https://tsps.pl/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors mb-1"
        >
          <LayoutGrid className="size-4 shrink-0" />
          Hub aplikacji
        </a>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="size-4 shrink-0" />
          Wyloguj
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-60">
        {content}
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-blue-400" />
          <span className="text-base font-bold text-white">TimeSheet</span>
          <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded ml-1">
            ADMIN
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-300 hover:text-white"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 w-60">
            {content}
          </aside>
        </>
      )}
    </>
  );
}

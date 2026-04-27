"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  FileText,
  CalendarDays,
  User,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Clock,
  LayoutGrid,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface SidebarProps {
  userEmail: string;
  isAdmin: boolean;
}

const navLinks = [
  { href: "/raporty", label: "Raporty", icon: FileText },
  { href: "/schematy", label: "Schematy", icon: CalendarDays },
  { href: "/profil", label: "Profil", icon: User },
];

export function Sidebar({ userEmail, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/logowanie");
  }

  const content = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100 w-60">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700">
        <Clock className="size-5 text-blue-400 shrink-0" />
        <span className="text-lg font-bold tracking-tight text-white">
          TimeSheet
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
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

        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/admin")
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <ShieldCheck className="size-4 shrink-0" />
            Panel admina
          </Link>
        )}
      </nav>

      <div className="border-t border-slate-700 px-4 py-4">
        <p className="text-xs text-slate-400 truncate mb-3" title={userEmail}>
          {userEmail}
        </p>
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
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-60">
        {content}
      </aside>

      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-blue-400" />
          <span className="text-base font-bold text-white">TimeSheet</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-slate-300 hover:text-white"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
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

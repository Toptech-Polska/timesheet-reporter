import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-slate-400 mb-4" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 text-slate-300 shrink-0" />}
            {isLast || !crumb.href ? (
              <span className={isLast ? "text-slate-700 font-medium" : "text-slate-400"}>
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className="hover:text-slate-600 transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

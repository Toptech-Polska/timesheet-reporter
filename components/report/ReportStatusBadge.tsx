type Status = "draft" | "approved" | "exported";

export function ReportStatusBadge({ status }: { status: Status }) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
        Wersja robocza
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
        Zatwierdzony
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
      Wyeksportowany
    </span>
  );
}

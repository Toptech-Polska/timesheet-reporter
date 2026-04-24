type Status = "draft" | "approved" | "exported";

export function ReportStatusBadge({ status }: { status: Status }) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
        Wersja robocza
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
        Zatwierdzony
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
      Wyeksportowany
    </span>
  );
}

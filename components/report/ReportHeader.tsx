const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

interface ReportHeaderProps {
  month: number;
  year: number;
  invoiceNumber: string;
  profile: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
}

function str(v: unknown): string {
  return v ? String(v) : "";
}

export function ReportHeader({
  month,
  year,
  invoiceNumber,
  profile,
  settings,
}: ReportHeaderProps) {
  return (
    <div className="bg-white dark:bg-[#1e2130] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm px-6 py-5 print:shadow-none print:border-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Title + period */}
        <div className="sm:col-span-1 space-y-1">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
            TIME SHEET
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Okres:{" "}
            <span className="font-semibold">
              {MONTHS_PL[month - 1]} {year}
            </span>
          </p>
          {invoiceNumber && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Nr faktury: <span className="font-semibold">{invoiceNumber}</span>
            </p>
          )}
        </div>

        {/* Contractor */}
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">
            Zleceniobiorca
          </p>
          <div className="text-sm text-slate-700 dark:text-slate-300 space-y-0.5">
            <p className="font-semibold">
              {str(profile?.contractor_name) || "—"}
            </p>
            {!!profile?.contractor_company && (
              <p className="text-slate-500 dark:text-slate-400">
                {str(profile.contractor_company)}
              </p>
            )}
            {!!profile?.contractor_nip && (
              <p className="text-slate-500 dark:text-slate-400">NIP: {str(profile.contractor_nip)}</p>
            )}
            {!!profile?.contractor_address && (
              <p className="text-slate-500 dark:text-slate-400">{str(profile.contractor_address)}</p>
            )}
            {!!profile?.contractor_bank_account && (
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Konto: {str(profile.contractor_bank_account)}
              </p>
            )}
          </div>
        </div>

        {/* Client */}
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">
            Zleceniodawca
          </p>
          <div className="text-sm text-slate-700 dark:text-slate-300 space-y-0.5">
            <p className="font-semibold">
              {str(settings?.client_name) || "—"}
            </p>
            {!!settings?.client_nip && (
              <p className="text-slate-500 dark:text-slate-400">NIP: {str(settings.client_nip)}</p>
            )}
            {!!settings?.client_address && (
              <p className="text-slate-500 dark:text-slate-400">{str(settings.client_address)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

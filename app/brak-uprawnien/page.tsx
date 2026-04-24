import Link from "next/link";

export default function BrakUprawnienPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-slate-300 mb-4">403</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Brak uprawnień
        </h1>
        <p className="text-slate-500 mb-8">
          Nie posiadasz uprawnień do wyświetlenia tej strony. Jeśli uważasz, że
          to błąd, skontaktuj się z administratorem.
        </p>
        <Link
          href="/raporty"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Wróć do aplikacji
        </Link>
      </div>
    </div>
  );
}

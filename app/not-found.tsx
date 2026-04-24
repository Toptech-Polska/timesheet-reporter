import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-slate-100 p-6">
            <FileQuestion className="size-12 text-slate-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-3">
          Nie znaleziono strony
        </h2>
        <p className="text-slate-500 text-sm mb-8">
          Strona, której szukasz, nie istnieje lub została przeniesiona.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/raporty">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0">
              Wróć do raportów
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Strona główna</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

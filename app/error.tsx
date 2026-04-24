"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-red-50 p-6">
            <AlertTriangle className="size-12 text-red-400" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Wystąpił nieoczekiwany błąd
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          Coś poszło nie tak. Spróbuj odświeżyć stronę lub wróć do strony głównej.
          {error.digest && (
            <span className="block mt-1 text-xs text-slate-400">
              Kod błędu: {error.digest}
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            Spróbuj ponownie
          </Button>
          <Link href="/raporty">
            <Button variant="outline">Wróć do raportów</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

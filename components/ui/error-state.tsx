import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Wystąpił błąd podczas ładowania danych.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-red-50 p-4 mb-4">
        <AlertCircle className="size-8 text-red-400" />
      </div>
      <p className="text-slate-700 font-medium mb-1">Błąd ładowania</p>
      <p className="text-sm text-slate-400 mb-6 max-w-xs">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      )}
    </div>
  );
}

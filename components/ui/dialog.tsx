"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Potwierdź",
  cancelLabel = "Anuluj",
  confirmVariant = "default",
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !loading && onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={() => !loading && onOpenChange(false)}
            className="text-slate-400 hover:text-slate-600 shrink-0"
            disabled={loading}
            aria-label="Zamknij"
          >
            <X className="size-5" />
          </button>
        </div>

        {description && (
          <p className="text-sm text-slate-600 mb-6">{description}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              confirmVariant === "destructive" &&
                "bg-red-600 hover:bg-red-700 text-white border-0"
            )}
          >
            {loading ? "Proszę czekać..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

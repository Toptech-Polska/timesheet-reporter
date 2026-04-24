"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const DURATION = 4000;

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), DURATION);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, onRemove]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm font-medium min-w-72 max-w-sm animate-in slide-in-from-right-5 fade-in",
        toast.type === "success" &&
          "bg-white border-green-200 text-slate-800",
        toast.type === "error" &&
          "bg-white border-red-200 text-slate-800",
        toast.type === "info" &&
          "bg-white border-blue-200 text-slate-800"
      )}
      role="alert"
    >
      {toast.type === "success" && (
        <CheckCircle className="size-5 text-green-500 shrink-0 mt-px" />
      )}
      {toast.type === "error" && (
        <AlertCircle className="size-5 text-red-500 shrink-0 mt-px" />
      )}
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-slate-400 hover:text-slate-600 shrink-0"
        aria-label="Zamknij"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function Toaster({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

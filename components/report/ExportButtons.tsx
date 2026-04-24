"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ExportButtons({ reportId }: { reportId: string }) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const { showToast } = useToast();

  async function handleExport(format: "pdf" | "xlsx") {
    const setLoading = format === "pdf" ? setLoadingPdf : setLoadingXlsx;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/${format}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        showToast(`Błąd eksportu: ${text || res.statusText}`, "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";\n]+)"?/);
      a.href = url;
      a.download = match?.[1] ?? `timesheet.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast("Nie udało się pobrać pliku.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={loadingPdf}>
        <Download className="size-4 mr-1.5" />
        {loadingPdf ? "Generuję..." : "↓ PDF"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")} disabled={loadingXlsx}>
        <Download className="size-4 mr-1.5" />
        {loadingXlsx ? "Generuję..." : "↓ Excel"}
      </Button>
    </div>
  );
}

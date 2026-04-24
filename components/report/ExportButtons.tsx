"use client";

import { useState } from "react";
import { Download, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { uploadPdfToGoogleDrive } from "@/app/actions/googleDrive";

export function ExportButtons({ reportId }: { reportId: string }) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [loadingDrive, setLoadingDrive] = useState(false);
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

  async function handleDriveUpload() {
    setLoadingDrive(true);
    try {
      const result = await uploadPdfToGoogleDrive(reportId);
      if ("fileUrl" in result) {
        showToast("Zapisano w Google Drive", "success");
        window.open(result.fileUrl, "_blank");
      } else if (result.error === "reauth") {
        showToast(
          "Zaloguj się ponownie aby udzielić dostępu do Google Drive",
          "error"
        );
      } else if (result.error === "no_folder") {
        showToast(
          "Skonfiguruj folder Google Drive w ustawieniach administratora",
          "error"
        );
      } else {
        showToast(result.error ?? "Błąd przesyłania", "error");
      }
    } catch {
      showToast("Nie udało się przesłać pliku.", "error");
    } finally {
      setLoadingDrive(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("pdf")}
        disabled={loadingPdf}
      >
        <Download className="size-4 mr-1.5" />
        {loadingPdf ? "Generuję..." : "↓ PDF"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport("xlsx")}
        disabled={loadingXlsx}
      >
        <Download className="size-4 mr-1.5" />
        {loadingXlsx ? "Generuję..." : "↓ Excel"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDriveUpload}
        disabled={loadingDrive}
      >
        <CloudUpload className="size-4 mr-1.5" />
        {loadingDrive ? "Wysyłanie..." : "↑ Google Drive"}
      </Button>
    </div>
  );
}

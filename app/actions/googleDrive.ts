"use server";

import { createClient } from "@/lib/supabase/server";
import { generatePdf } from "@/lib/export/toPdf";

export type DriveUploadResult =
  | { fileUrl: string }
  | { error: "reauth" | "no_folder" | string };

export async function uploadPdfToGoogleDrive(
  reportId: string
): Promise<DriveUploadResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Nie jesteś zalogowany" };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let googleToken = session?.provider_token as string | null;

  if (!googleToken && session?.provider_refresh_token) {
    try {
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
          refresh_token: session.provider_refresh_token,
          grant_type: "refresh_token",
        }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json() as { access_token: string };
        googleToken = refreshData.access_token;
      }
    } catch (e) {
      console.error("Token refresh failed:", e);
    }
  }

  if (!googleToken) return { error: "reauth" };

  const { data: profile } = await supabase
    .schema("timesheet")
    .from("profiles")
    .select("google_drive_folder_id, contractor_name")
    .eq("id", user.id)
    .single();

  const folderId = profile?.google_drive_folder_id as string | null;
  if (!folderId) return { error: "no_folder" };

  const { data: report } = await supabase
    .schema("timesheet")
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .eq("user_id", user.id)
    .in("status", ["approved", "exported"])
    .maybeSingle();

  if (!report) return { error: "Nie znaleziono raportu lub brak uprawnień" };

  const { data: entriesData } = await supabase
    .schema("timesheet")
    .from("report_entries")
    .select("*")
    .eq("report_id", reportId)
    .order("sort_order");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = (entriesData ?? []).map((e: any) => ({
    work_date: e.work_date as string,
    day_of_week: e.day_of_week as string,
    week_number: e.week_number as number,
    description: e.work_description as string,
    category: e.category as string,
    hours: e.hours as number,
    hourly_rate: e.hourly_rate as number,
    line_total: e.line_total as number,
  }));

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generatePdf(
      {
        period_month: report.period_month,
        period_year: report.period_year,
        invoice_number: report.invoice_number ?? null,
        target_amount: report.target_amount,
        calculated_amount: report.calculated_amount,
        contractor_snapshot: report.contractor_snapshot ?? {},
        client_snapshot: report.client_snapshot ?? {},
      },
      entries
    );
  } catch (pdfErr) {
    console.error("PDF generation failed in Drive upload:", pdfErr);
    return { error: "Błąd generowania PDF przed przesłaniem" };
  }

  const contractorName = (profile?.contractor_name as string | undefined) ?? "";
  const namePart = contractorName
    ? `-${contractorName.toLowerCase().replace(/\s+/g, "-")}`
    : "";
  const month = String(report.period_month).padStart(2, "0");
  const filename = `timesheet-${report.period_year}-${month}${namePart}.pdf`;

  const boundary = "ts_pdf_boundary_xR9k";
  const metadata = JSON.stringify({
    name: filename,
    mimeType: "application/pdf",
    parents: [folderId],
  });

  const preamble = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/pdf\r\n\r\n`
  );
  const closing = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([preamble, pdfBuffer, closing]);

  console.log("Drive upload — token present:", !!googleToken,
    "token length:", googleToken?.length,
    "folder:", folderId);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${googleToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error("Drive API error:", response.status, errText);
    if (response.status === 401 || response.status === 403) {
      return { error: "reauth" };
    }
    if (response.status === 404) {
      return { error: "no_folder" };
    }
    return { error: "Błąd przesyłania do Google Drive" };
  }

  const result = (await response.json()) as { id: string };
  return { fileUrl: `https://drive.google.com/file/d/${result.id}/view` };
}

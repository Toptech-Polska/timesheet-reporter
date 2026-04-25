import { generatePdf } from "../lib/export/toPdf";

const dummyReport = {
  period_month: 1,
  period_year: 2025,
  invoice_number: "FV/2025/01",
  target_amount: 10000,
  calculated_amount: 9800,
  contractor_snapshot: {
    contractor_name: "Jan Kowalski",
    contractor_nip: "1234567890",
    contractor_address: "ul. Testowa 1, Warszawa",
    contractor_bank_account: "PL00 1111 2222 3333",
  },
  client_snapshot: {
    client_name: "Firma Sp. z o.o.",
    client_nip: "0987654321",
    client_address: "ul. Główna 2, Kraków",
  },
};

const dummyEntries = [
  {
    work_date: "2025-01-06",
    day_of_week: "Poniedziałek",
    week_number: 2,
    description: "Implementacja funkcji eksportu PDF z polskimi znakami: ą ę ó ź ż",
    category: "Development",
    hours: 8,
    hourly_rate: 150,
    line_total: 1200,
  },
  {
    work_date: "2025-01-07",
    day_of_week: "Wtorek",
    week_number: 2,
    description: "Code review i testy",
    category: "Development",
    hours: 6,
    hourly_rate: 150,
    line_total: 900,
  },
];

console.log("Generuję PDF...");
generatePdf(dummyReport, dummyEntries)
  .then((buf) => {
    console.log("OK! Rozmiar bufora:", buf.length, "bajtów");
  })
  .catch((err) => {
    console.error("BŁĄD:", err);
  });

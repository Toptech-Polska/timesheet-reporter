"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { addAllowedEmail, removeAllowedEmail } from "@/app/(admin)/actions/allowedEmails";
import { formatDatePL } from "@/lib/utils/dates";

export interface AllowedEmailRow {
  email: string;
  note: string | null;
  added_at: string;
}

export function AllowedEmailsSection({
  allowedEmails,
  currentUserEmail,
}: {
  allowedEmails: AllowedEmailRow[];
  currentUserEmail: string;
}) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      const res = await addAllowedEmail(email, note);
      if (res.success) {
        showToast("Adres e-mail dodany do listy dostępu", "success");
        setEmail("");
        setNote("");
      } else {
        showToast(res.error ?? "Błąd", "error");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(targetEmail: string) {
    setRemovingEmail(targetEmail);
    try {
      const res = await removeAllowedEmail(targetEmail);
      if (res.success) {
        showToast("Adres e-mail usunięty z listy dostępu", "success");
      } else {
        showToast(res.error ?? "Błąd", "error");
      }
    } finally {
      setRemovingEmail(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Dostęp do aplikacji
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Tylko adresy e-mail z tej listy mogą zalogować się przez Google
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          placeholder="nowy@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="sm:max-w-xs"
          required
        />
        <Input
          type="text"
          placeholder="Notatka (opcjonalnie)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="sm:max-w-xs"
        />
        <Button type="submit" disabled={adding} className="shrink-0">
          {adding ? "Dodawanie..." : "Dodaj dostęp"}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["E-mail", "Notatka", "Data dodania", "Akcje"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {allowedEmails.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  Brak zatwierdzonych adresów e-mail
                </td>
              </tr>
            ) : (
              allowedEmails.map((row) => {
                const isSelf = row.email === currentUserEmail;
                return (
                  <tr
                    key={row.email}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.email}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.note ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {formatDatePL(row.added_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSelf || removingEmail === row.email}
                        title={
                          isSelf
                            ? "Nie możesz usunąć własnego adresu"
                            : undefined
                        }
                        onClick={() => handleRemove(row.email)}
                        className="text-xs h-7 px-2.5 text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        {removingEmail === row.email ? "Usuwanie..." : "Usuń"}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Łącznie: {allowedEmails.length} zatwierdzonych adresów
      </p>
    </div>
  );
}

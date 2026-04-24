"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { changeUserRole, toggleUserActive } from "@/app/(admin)/actions/users";
import { formatDatePL } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

export interface UserRow {
  id: string;
  email: string;
  contractor_name: string | null;
  contractor_nip: string | null;
  is_active: boolean;
  role: "user" | "admin";
  created_at: string;
}

interface DialogState {
  type: "role" | "active" | null;
  userId: string;
  userName: string;
  currentRole?: "user" | "admin";
  newRole?: "user" | "admin";
  isActive?: boolean;
}

const ROLE_LABELS: Record<"user" | "admin", string> = {
  user: "Użytkownik",
  admin: "Admin",
};

export function UsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const { showToast } = useToast();
  const [dialog, setDialog] = useState<DialogState>({ type: null, userId: "", userName: "" });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (u.contractor_name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? u.is_active : !u.is_active);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  function openRoleDialog(user: UserRow) {
    const newRole: "user" | "admin" = user.role === "admin" ? "user" : "admin";
    setDialog({
      type: "role",
      userId: user.id,
      userName: user.contractor_name ?? user.email,
      currentRole: user.role,
      newRole,
    });
  }

  function openActiveDialog(user: UserRow) {
    setDialog({
      type: "active",
      userId: user.id,
      userName: user.contractor_name ?? user.email,
      isActive: user.is_active,
    });
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      if (dialog.type === "role") {
        const res = await changeUserRole(dialog.userId, dialog.newRole!);
        if (res.success) {
          showToast(`Rola zmieniona na: ${ROLE_LABELS[dialog.newRole!]}`, "success");
        } else {
          showToast(res.error ?? "Błąd", "error");
        }
      } else if (dialog.type === "active") {
        const res = await toggleUserActive(dialog.userId, !dialog.isActive);
        if (res.success) {
          showToast(
            `Konto ${!dialog.isActive ? "aktywowane" : "dezaktywowane"}`,
            "success"
          );
        } else {
          showToast(res.error ?? "Błąd", "error");
        }
      }
    } finally {
      setLoading(false);
      setDialog({ type: null, userId: "", userName: "" });
    }
  }

  const dialogTitle =
    dialog.type === "role"
      ? `Zmień rolę: ${dialog.userName}`
      : dialog.isActive
      ? `Dezaktywuj: ${dialog.userName}`
      : `Aktywuj: ${dialog.userName}`;

  const dialogDescription =
    dialog.type === "role"
      ? `Czy na pewno chcesz zmienić rolę użytkownika "${dialog.userName}" z ${ROLE_LABELS[dialog.currentRole ?? "user"]} na ${ROLE_LABELS[dialog.newRole ?? "user"]}?`
      : dialog.isActive
      ? `Czy na pewno chcesz dezaktywować konto "${dialog.userName}"? Użytkownik straci dostęp do aplikacji.`
      : `Czy na pewno chcesz aktywować konto "${dialog.userName}"?`;

  return (
    <div className="space-y-4">
      {/* Filtry */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Szukaj po nazwie lub e-mailu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          className="h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Wszystkie role</option>
          <option value="admin">Admin</option>
          <option value="user">Użytkownik</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Wszystkie statusy</option>
          <option value="active">Aktywny</option>
          <option value="inactive">Nieaktywny</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Imię i nazwisko", "E-mail", "NIP", "Rola", "Status", "Data rejestracji", "Akcje"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Brak użytkowników spełniających kryteria
                </td>
              </tr>
            ) : (
              filtered.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {user.contractor_name ?? (
                        <span className="text-slate-400 italic">Brak danych</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.contractor_nip ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          user.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        )}
                      >
                        {user.is_active ? "Aktywny" : "Nieaktywny"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDatePL(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSelf}
                          title={isSelf ? "Nie możesz zmienić własnej roli" : undefined}
                          onClick={() => openRoleDialog(user)}
                          className="text-xs h-7 px-2.5"
                        >
                          Zmień rolę
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSelf}
                          title={isSelf ? "Nie możesz dezaktywować własnego konta" : undefined}
                          onClick={() => openActiveDialog(user)}
                          className={cn(
                            "text-xs h-7 px-2.5",
                            user.is_active
                              ? "text-red-600 hover:text-red-700 hover:border-red-300"
                              : "text-green-600 hover:text-green-700 hover:border-green-300"
                          )}
                        >
                          {user.is_active ? "Dezaktywuj" : "Aktywuj"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Łącznie: {filtered.length} z {users.length} użytkowników
      </p>

      <ConfirmDialog
        open={dialog.type !== null}
        onOpenChange={(open) => {
          if (!open) setDialog({ type: null, userId: "", userName: "" });
        }}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel="Potwierdź"
        confirmVariant={
          dialog.type === "active" && dialog.isActive ? "destructive" : "default"
        }
        onConfirm={handleConfirm}
        loading={loading}
      />
    </div>
  );
}

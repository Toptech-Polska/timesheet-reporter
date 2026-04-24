"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateUserDriveFolder } from "@/app/(admin)/actions/users";

interface DriveFolderFormProps {
  userId: string;
  initialFolderId: string | null;
  initialFolderName: string | null;
}

export function DriveFolderForm({
  userId,
  initialFolderId,
  initialFolderName,
}: DriveFolderFormProps) {
  const { showToast } = useToast();
  const [folderId, setFolderId] = useState(initialFolderId ?? "");
  const [folderName, setFolderName] = useState(initialFolderName ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateUserDriveFolder(
        userId,
        folderId.trim() || null,
        folderName.trim() || null
      );
      if (res.success) {
        showToast("Folder Google Drive zaktualizowany", "success");
      } else {
        showToast(res.error ?? "Błąd", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="drive_folder_id">ID folderu Google Drive</Label>
        <Input
          id="drive_folder_id"
          placeholder="np. 0AB3aeXpeTx5SUk9PVA"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
        />
        <p className="text-xs text-slate-400">
          Skopiuj ID z URL folderu:{" "}
          <span className="font-mono">
            drive.google.com/drive/folders/<strong>[ID]</strong>
          </span>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="drive_folder_name">Nazwa folderu (informacyjna)</Label>
        <Input
          id="drive_folder_name"
          placeholder="np. Jacek Targosz"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
        />
        <p className="text-xs text-slate-400">
          Wyświetlana użytkownikowi w jego profilu
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white border-0"
        >
          {saving ? "Zapisywanie..." : "Zapisz"}
        </Button>
      </div>
    </form>
  );
}

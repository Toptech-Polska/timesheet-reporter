"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateSettings } from "@/app/(admin)/actions/settings";
import { Info } from "lucide-react";

const schema = z.object({
  client_name: z.string().min(1, "Nazwa firmy jest wymagana"),
  client_nip: z
    .string()
    .min(1, "NIP jest wymagany")
    .refine((v) => /^\d{10}$/.test(v), { message: "NIP musi składać się z 10 cyfr" }),
  client_address: z.string().min(1, "Adres jest wymagany"),
  client_email: z
    .string()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Podaj prawidłowy adres e-mail",
    })
    .optional(),
  client_website: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AppSettings {
  client_name: string | null;
  client_nip: string | null;
  client_address: string | null;
  client_email: string | null;
  client_website: string | null;
}

export function SettingsForm({ settings }: { settings: AppSettings | null }) {
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_name: settings?.client_name ?? "",
      client_nip: settings?.client_nip ?? "",
      client_address: settings?.client_address ?? "",
      client_email: settings?.client_email ?? "",
      client_website: settings?.client_website ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const result = await updateSettings({
      client_name: values.client_name,
      client_nip: values.client_nip,
      client_address: values.client_address,
      client_email: values.client_email || null,
      client_website: values.client_website || null,
    });

    if (result.success) {
      showToast("Dane zleceniodawcy zostały zaktualizowane", "success");
    } else {
      showToast(result.error ?? "Wystąpił błąd", "error");
    }
  }

  const preview = watch();

  return (
    <>
    <div className="bg-slate-50 rounded-xl border border-slate-200 px-5 py-4 space-y-2">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Podgląd nagłówka raportu</p>
      <div className="text-sm text-slate-700 space-y-0.5">
        <p className="font-semibold">{preview.client_name || <span className="text-slate-300">Nazwa firmy</span>}</p>
        {preview.client_nip && <p className="text-slate-500">NIP: {preview.client_nip}</p>}
        {preview.client_address && (
          <p className="text-slate-500 whitespace-pre-line">{preview.client_address}</p>
        )}
        {preview.client_email && <p className="text-slate-500">{preview.client_email}</p>}
        {preview.client_website && <p className="text-slate-500">{preview.client_website}</p>}
      </div>
    </div>
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="client_name">
            Nazwa firmy <span className="text-red-500">*</span>
          </Label>
          <Input
            id="client_name"
            placeholder="Spółka z o.o."
            aria-invalid={!!errors.client_name}
            {...register("client_name")}
          />
          {errors.client_name && (
            <p className="text-sm text-red-600">{errors.client_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client_nip">
            NIP <span className="text-red-500">*</span>
          </Label>
          <Input
            id="client_nip"
            placeholder="1234567890"
            aria-invalid={!!errors.client_nip}
            {...register("client_nip")}
          />
          {errors.client_nip && (
            <p className="text-sm text-red-600">{errors.client_nip.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="client_email">E-mail</Label>
          <Input
            id="client_email"
            type="email"
            placeholder="biuro@firma.pl"
            aria-invalid={!!errors.client_email}
            {...register("client_email")}
          />
          {errors.client_email && (
            <p className="text-sm text-red-600">{errors.client_email.message}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="client_address">
            Adres <span className="text-red-500">*</span>
          </Label>
          <textarea
            id="client_address"
            rows={3}
            placeholder="ul. Przykładowa 1&#10;00-001 Warszawa"
            aria-invalid={!!errors.client_address}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none aria-[invalid=true]:border-red-400"
            {...register("client_address")}
          />
          {errors.client_address && (
            <p className="text-sm text-red-600">{errors.client_address.message}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="client_website">Strona www</Label>
          <Input
            id="client_website"
            placeholder="https://www.firma.pl"
            {...register("client_website")}
          />
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
        <Info className="size-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Zmiany dotyczą nowych raportów. Zatwierdzone raporty zachowują snapshot
          danych z chwili zatwierdzenia.
        </p>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="bg-blue-600 hover:bg-blue-700 text-white border-0"
        >
          {isSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
        </Button>
      </div>
    </form>
    </>
  );
}

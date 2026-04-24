"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateProfile } from "@/app/actions/profile";

const schema = z.object({
  contractor_name: z.string().min(1, "Imię i nazwisko jest wymagane"),
  contractor_company: z.string().optional(),
  contractor_nip: z
    .string()
    .refine((v) => !v || /^\d{10}$/.test(v), {
      message: "NIP musi składać się z 10 cyfr",
    })
    .optional(),
  contractor_address: z.string().optional(),
  contractor_email: z
    .string()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Podaj prawidłowy adres e-mail",
    })
    .optional(),
  contractor_bank_account: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Profile {
  contractor_name: string | null;
  contractor_company: string | null;
  contractor_nip: string | null;
  contractor_address: string | null;
  contractor_email: string | null;
  contractor_bank_account: string | null;
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contractor_name: profile?.contractor_name ?? "",
      contractor_company: profile?.contractor_company ?? "",
      contractor_nip: profile?.contractor_nip ?? "",
      contractor_address: profile?.contractor_address ?? "",
      contractor_email: profile?.contractor_email ?? "",
      contractor_bank_account: profile?.contractor_bank_account ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const result = await updateProfile({
      contractor_name: values.contractor_name,
      contractor_company: values.contractor_company || null,
      contractor_nip: values.contractor_nip || null,
      contractor_address: values.contractor_address || null,
      contractor_email: values.contractor_email || null,
      contractor_bank_account: values.contractor_bank_account || null,
    });

    if (result.success) {
      showToast("Dane zostały zaktualizowane", "success");
    } else {
      showToast(result.error ?? "Wystąpił błąd", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="contractor_name">
            Imię i nazwisko <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contractor_name"
            placeholder="Jan Kowalski"
            aria-invalid={!!errors.contractor_name}
            {...register("contractor_name")}
          />
          {errors.contractor_name && (
            <p className="text-sm text-red-600">{errors.contractor_name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contractor_company">Firma</Label>
          <Input
            id="contractor_company"
            placeholder="Nazwa firmy"
            {...register("contractor_company")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contractor_nip">NIP</Label>
          <Input
            id="contractor_nip"
            placeholder="1234567890"
            aria-invalid={!!errors.contractor_nip}
            {...register("contractor_nip")}
          />
          {errors.contractor_nip && (
            <p className="text-sm text-red-600">{errors.contractor_nip.message}</p>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="contractor_address">Adres</Label>
          <textarea
            id="contractor_address"
            rows={3}
            placeholder="ul. Przykładowa 1&#10;00-001 Warszawa"
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            {...register("contractor_address")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contractor_email">E-mail kontaktowy</Label>
          <Input
            id="contractor_email"
            type="email"
            placeholder="kontakt@firma.pl"
            aria-invalid={!!errors.contractor_email}
            {...register("contractor_email")}
          />
          {errors.contractor_email && (
            <p className="text-sm text-red-600">{errors.contractor_email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contractor_bank_account">Numer konta bankowego</Label>
          <Input
            id="contractor_bank_account"
            placeholder="PL61 1090 1014 0000 0712 1981 2874"
            {...register("contractor_bank_account")}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="bg-blue-600 hover:bg-blue-700 text-white border-0"
        >
          {isSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
        </Button>
      </div>
    </form>
  );
}

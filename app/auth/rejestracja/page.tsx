"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const schema = z
  .object({
    fullName: z.string().min(2, "Imię i nazwisko musi mieć co najmniej 2 znaki"),
    email: z.string().email("Podaj prawidłowy adres e-mail"),
    password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RejestracjaPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setServerError("Konto z tym adresem e-mail już istnieje.");
      } else {
        setServerError("Wystąpił błąd podczas rejestracji. Spróbuj ponownie.");
      }
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] text-center">
          <div className="flex justify-center mb-4">
            <Clock className="size-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Sprawdź swoją skrzynkę e-mail
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Wysłaliśmy link potwierdzający rejestrację. Kliknij go, aby
            aktywować konto.
          </p>
          <Link
            href="/auth/logowanie"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Wróć do logowania
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="size-7 text-blue-600" />
            <span className="text-2xl font-bold text-slate-900">TimeSheet</span>
          </div>
          <p className="text-sm text-slate-500">Utwórz nowe konto</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Imię i nazwisko</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jan Kowalski"
                autoComplete="name"
                aria-invalid={!!errors.fullName}
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Adres e-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="jan.kowalski@firma.pl"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 znaków"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Powtórz hasło</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Powtórz hasło"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {serverError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              {isSubmitting ? "Rejestracja..." : "Zarejestruj się"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Masz już konto?{" "}
          <Link
            href="/auth/logowanie"
            className="font-medium text-blue-600 hover:underline"
          >
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const schema = z.object({
  email: z.string().email("Podaj prawidłowy adres e-mail"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

type FormValues = z.infer<typeof schema>;

export default function LogowaniePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError("Nieprawidłowy e-mail lub hasło.");
      return;
    }

    router.push("/raporty");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="size-7 text-blue-600" />
            <span className="text-2xl font-bold text-slate-900">TimeSheet</span>
          </div>
          <p className="text-sm text-slate-500">Zaloguj się do swojego konta</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
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
              {isSubmitting ? "Logowanie..." : "Zaloguj się"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Nie masz konta?{" "}
          <Link
            href="/auth/rejestracja"
            className="font-medium text-blue-600 hover:underline"
          >
            Zarejestruj się
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { changePassword } from "@/app/actions/profile";

const schema = z
  .object({
    password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Hasła nie są zgodne",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export function PasswordForm() {
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const result = await changePassword(values.password);
    if (result.success) {
      showToast("Hasło zostało zmienione", "success");
      reset();
    } else {
      showToast(result.error ?? "Wystąpił błąd", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Nowe hasło</Label>
        <Input
          id="password"
          type="password"
          placeholder="Minimum 8 znaków"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Powtórz nowe hasło</Label>
        <Input
          id="confirm"
          type="password"
          placeholder="Wpisz hasło ponownie"
          aria-invalid={!!errors.confirm}
          {...register("confirm")}
        />
        {errors.confirm && (
          <p className="text-sm text-red-600">{errors.confirm.message}</p>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white border-0"
        >
          {isSubmitting ? "Zapisywanie..." : "Zmień hasło"}
        </Button>
      </div>
    </form>
  );
}

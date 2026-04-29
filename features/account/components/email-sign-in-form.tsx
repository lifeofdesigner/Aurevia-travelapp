"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useTranslations} from "next-intl";
import {useForm} from "react-hook-form";
import {toast} from "sonner";
import {z} from "zod";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {createSupabaseBrowserClient} from "@/lib/supabase/browser";

type EmailSignInFormProps = {
  nextPath: string;
};

export function EmailSignInForm({nextPath}: EmailSignInFormProps) {
  const t = useTranslations("Auth");
  const schema = z.object({
    email: z
      .string()
      .min(1, t("validation.emailRequired"))
      .email(t("validation.emailInvalid"))
  });
  const {
    formState: {errors, isSubmitting},
    handleSubmit,
    register
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: ""
    }
  });

  async function onSubmit(values: z.output<typeof schema>) {
    const supabase = createSupabaseBrowserClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", nextPath);
    const response = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        emailRedirectTo: callbackUrl.toString()
      }
    });

    if (response.error) {
      toast.error(t("emailErrorTitle"), {
        description: response.error.message
      });
      return;
    }

    toast.success(t("emailSuccessTitle"), {
      description: t("emailSuccessDescription", {email: values.email})
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "auth-email-error" : undefined}
          {...register("email")}
        />
        <FormFieldError id="auth-email-error" message={errors.email?.message} />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("sending") : t("submit")}
      </Button>
      <p className="text-sm leading-7 text-muted-foreground">{t("emailHint")}</p>
    </form>
  );
}

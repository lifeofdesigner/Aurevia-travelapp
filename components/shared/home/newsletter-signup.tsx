"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useTranslations} from "next-intl";
import {useTransition} from "react";
import {useForm} from "react-hook-form";
import {toast} from "sonner";
import {z} from "zod";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

type NewsletterValues = {
  email: string;
};

export function NewsletterSignup() {
  const t = useTranslations("Newsletter");
  const [isPending, startTransition] = useTransition();
  const newsletterSchema = z.object({
    email: z
      .string()
      .min(1, t("validation.emailRequired"))
      .email(t("validation.emailInvalid"))
  });
  const {
    formState: {errors, isSubmitSuccessful},
    handleSubmit,
    register,
    reset
  } = useForm<NewsletterValues>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      email: ""
    }
  });

  function onSubmit(values: NewsletterValues) {
    startTransition(() => {
      toast.success(t("successTitle"), {
        description: t("successDescription", {email: values.email})
      });
      reset();
    });
  }

  return (
    <form
      className="grid gap-4 md:grid-cols-[1fr_auto]"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="newsletter-email">{t("emailLabel")}</Label>
        <Input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "newsletter-email-error" : undefined}
          {...register("email")}
        />
        <FormFieldError
          id="newsletter-email-error"
          message={errors.email?.message}
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" className="h-11 w-full rounded-lg px-6 md:w-auto" disabled={isPending}>
          {isPending ? t("submitting") : t("submit")}
        </Button>
      </div>
      <p className="text-sm leading-6 text-muted-foreground md:col-span-2">
        {isSubmitSuccessful ? t("followUp") : t("disclaimer")}
      </p>
    </form>
  );
}

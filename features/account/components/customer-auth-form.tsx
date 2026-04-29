"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {Eye, EyeOff} from "lucide-react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {toast} from "sonner";
import {z} from "zod";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {type AdminAccessSettings} from "@/features/admin/lib/control-center-types";
import {createSupabaseBrowserClient} from "@/lib/supabase/browser";

type CustomerAuthFormProps = {
  accessSettings: AdminAccessSettings;
  nextPath: string;
};

type AuthMode = "sign_in" | "register" | "magic_link";

function buildCallbackUrl(nextPath: string) {
  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}

function PasswordToggle({
  isVisible,
  onToggle
}: {
  isVisible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={isVisible ? "Hide password" : "Show password"}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
      onClick={onToggle}
    >
      {isVisible ? (
        <EyeOff aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Eye aria-hidden="true" className="h-4 w-4" />
      )}
    </button>
  );
}

function PasswordSignInForm({nextPath}: CustomerAuthFormProps) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const schema = z.object({
    email: z
      .string()
      .min(1, t("validation.emailRequired"))
      .email(t("validation.emailInvalid")),
    password: z.string().min(1, t("validation.passwordRequired"))
  });
  const {
    formState: {errors, isSubmitting},
    handleSubmit,
    register
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    defaultValues: {
      email: "",
      password: ""
    },
    resolver: zodResolver(schema)
  });

  async function onSubmit(values: z.output<typeof schema>) {
    const response = await fetch("/api/auth/customer/sign-in", {
      body: JSON.stringify(values),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const payload = (await response.json().catch(() => null)) as {message?: string} | null;

    if (!response.ok) {
      toast.error(t("passwordLoginErrorTitle"), {
        description: payload?.message ?? t("passwordLoginErrorDescription")
      });
      return;
    }

    toast.success(t("signInSuccessTitle"), {
      description: t("signInSuccessDescription")
    });
    router.push(nextPath);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="customer-login-email">{t("emailLabel")}</Label>
        <Input
          id="customer-login-email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "customer-login-email-error" : undefined}
          {...register("email")}
        />
        <FormFieldError id="customer-login-email-error" message={errors.email?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-login-password">{t("passwordLabel")}</Label>
        <div className="relative">
          <Input
            id="customer-login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-12"
            placeholder={t("passwordPlaceholder")}
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={errors.password ? "customer-login-password-error" : undefined}
            {...register("password")}
          />
          <PasswordToggle
            isVisible={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
          />
        </div>
        <FormFieldError id="customer-login-password-error" message={errors.password?.message} />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("signingIn") : t("signInSubmit")}
      </Button>
    </form>
  );
}

function RegisterForm({accessSettings, nextPath}: CustomerAuthFormProps) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const schema = z
    .object({
      confirmPassword: z.string().min(1, t("validation.confirmPasswordRequired")),
      email: z
        .string()
        .min(1, t("validation.emailRequired"))
        .email(t("validation.emailInvalid")),
      fullName: z.string().trim().min(2, t("validation.fullNameRequired")),
      password: z.string().min(8, t("validation.passwordMin"))
    })
    .extend({
      phone: accessSettings.customerLoginRequiresSmsConfirmation
        ? z
          .string()
          .trim()
          .min(7, "Enter the phone number that should receive SMS confirmation.")
        : z.string().trim().optional()
    })
    .refine((value) => value.password === value.confirmPassword, {
      message: t("validation.passwordsMustMatch"),
      path: ["confirmPassword"]
    });
  const {
    formState: {errors, isSubmitting},
    handleSubmit,
    register
  } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    defaultValues: {
      confirmPassword: "",
      email: "",
      fullName: "",
      phone: "",
      password: ""
    },
    resolver: zodResolver(schema)
  });

  async function onSubmit(values: z.output<typeof schema>) {
    const response = await fetch("/api/auth/customer/register", {
      body: JSON.stringify({
        email: values.email,
        fullName: values.fullName,
        nextPath,
        password: values.password,
        phone: values.phone
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          message?: string;
          needsEmailConfirmation?: boolean;
          needsSmsConfirmation?: boolean;
          signedIn?: boolean;
        }
      | null;

    if (!response.ok) {
      toast.error(t("registrationErrorTitle"), {
        description: payload?.message ?? t("registrationErrorDescription")
      });
      return;
    }

    if (payload?.needsEmailConfirmation) {
      toast.success(t("registrationCheckInboxTitle"), {
        description: t("registrationCheckInboxDescription", {email: values.email})
      });
      return;
    }

    if (payload?.needsSmsConfirmation) {
      toast.success("Account created", {
        description: payload.message ?? "Confirm the phone number by SMS before signing in."
      });
      return;
    }

    toast.success(t("registrationSuccessTitle"), {
      description: t("registrationSuccessDescription")
    });
    router.push(nextPath);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="customer-register-name">{t("fullNameLabel")}</Label>
        <Input
          id="customer-register-name"
          type="text"
          autoComplete="name"
          placeholder={t("fullNamePlaceholder")}
          aria-invalid={errors.fullName ? "true" : "false"}
          aria-describedby={errors.fullName ? "customer-register-name-error" : undefined}
          {...register("fullName")}
        />
        <FormFieldError id="customer-register-name-error" message={errors.fullName?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-register-email">{t("emailLabel")}</Label>
        <Input
          id="customer-register-email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "customer-register-email-error" : undefined}
          {...register("email")}
        />
        <FormFieldError id="customer-register-email-error" message={errors.email?.message} />
      </div>

      {accessSettings.customerLoginRequiresSmsConfirmation ? (
        <div className="space-y-2">
          <Label htmlFor="customer-register-phone">Phone number for SMS</Label>
          <Input
            id="customer-register-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+43 660 000 0000"
            aria-invalid={errors.phone ? "true" : "false"}
            aria-describedby={errors.phone ? "customer-register-phone-error" : undefined}
            {...register("phone")}
          />
          <FormFieldError id="customer-register-phone-error" message={errors.phone?.message} />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="customer-register-password">{t("passwordLabel")}</Label>
        <div className="relative">
          <Input
            id="customer-register-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="pr-12"
            placeholder={t("passwordPlaceholder")}
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={errors.password ? "customer-register-password-error" : undefined}
            {...register("password")}
          />
          <PasswordToggle
            isVisible={showPassword}
            onToggle={() => setShowPassword((current) => !current)}
          />
        </div>
        <FormFieldError id="customer-register-password-error" message={errors.password?.message} />
        <p className="text-xs leading-5 text-muted-foreground">{t("passwordHint")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-register-confirm-password">{t("confirmPasswordLabel")}</Label>
        <Input
          id="customer-register-confirm-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder={t("confirmPasswordPlaceholder")}
          aria-invalid={errors.confirmPassword ? "true" : "false"}
          aria-describedby={
            errors.confirmPassword ? "customer-register-confirm-password-error" : undefined
          }
          {...register("confirmPassword")}
        />
        <FormFieldError
          id="customer-register-confirm-password-error"
          message={errors.confirmPassword?.message}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("creatingAccount") : t("registerSubmit")}
      </Button>
    </form>
  );
}

function MagicLinkForm({nextPath}: CustomerAuthFormProps) {
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
    defaultValues: {
      email: ""
    },
    resolver: zodResolver(schema)
  });

  async function onSubmit(values: z.output<typeof schema>) {
    const supabase = createSupabaseBrowserClient();
    const response = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        emailRedirectTo: buildCallbackUrl(nextPath)
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
        <Label htmlFor="customer-magic-email">{t("emailLabel")}</Label>
        <Input
          id="customer-magic-email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "customer-magic-email-error" : undefined}
          {...register("email")}
        />
        <FormFieldError id="customer-magic-email-error" message={errors.email?.message} />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? t("sending") : t("magicLinkSubmit")}
      </Button>
      <p className="text-sm leading-7 text-muted-foreground">{t("emailHint")}</p>
    </form>
  );
}

export function CustomerAuthForm({accessSettings, nextPath}: CustomerAuthFormProps) {
  const t = useTranslations("Auth");
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const modes: Array<{label: string; value: AuthMode}> = [
    {label: t("signInTab"), value: "sign_in"},
    {label: t("registerTab"), value: "register"},
    {label: t("magicLinkTab"), value: "magic_link"}
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-1">
        {modes.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`min-h-10 rounded-md px-3 text-xs font-semibold transition-colors ${
              mode === item.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === "sign_in" ? (
        <PasswordSignInForm accessSettings={accessSettings} nextPath={nextPath} />
      ) : null}
      {mode === "register" ? (
        <RegisterForm accessSettings={accessSettings} nextPath={nextPath} />
      ) : null}
      {mode === "magic_link" ? (
        <MagicLinkForm accessSettings={accessSettings} nextPath={nextPath} />
      ) : null}
    </div>
  );
}

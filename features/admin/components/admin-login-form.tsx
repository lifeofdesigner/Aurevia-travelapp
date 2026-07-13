"use client";

import {ArrowRight, Eye, EyeOff} from "lucide-react";
import Link from "next/link";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useFormState, useFormStatus} from "react-dom";
import {type FormEvent, useEffect, useState} from "react";

import {
  authenticateAdmin,
  type AdminLoginActionState
} from "@/app/admin-login/actions";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {createAdminSupabaseBrowserClient} from "@/lib/auth/admin-auth-browser";

const INITIAL_ADMIN_LOGIN_STATE: AdminLoginActionState = {
  error: null
};

function AdminLoginSubmitButton() {
  const {pending} = useFormStatus();

  return (
    <Button
      className="h-11 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark"
      disabled={pending}
    >
      {pending ? "Signing in..." : "Sign in to Admin"}
    </Button>
  );
}

export function AdminLoginForm() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createAdminSupabaseBrowserClient());
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [isRecoveryPending, setIsRecoveryPending] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<string | null>(
    null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useFormState(
    authenticateAdmin,
    INITIAL_ADMIN_LOGIN_STATE
  );
  const resetState = searchParams.get("reset");

  useEffect(() => {
    let isMounted = true;

    function hasRecoveryParams() {
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      return (
        queryParams.get("type") === "recovery" ||
        hashParams.get("type") === "recovery" ||
        queryParams.has("code") ||
        hashParams.has("access_token")
      );
    }

    async function hydrateRecoveryState() {
      if (!hasRecoveryParams()) {
        return;
      }

      const sessionResult = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (sessionResult.data.session) {
        setIsRecoveringPassword(true);
      }

      if (sessionResult.error) {
        setRecoveryError(sessionResult.error.message);
      }
    }

    void hydrateRecoveryState();

    const {data} = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || hasRecoveryParams()) {
        setIsRecoveringPassword(true);
        setRecoveryError(null);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (recoveryPassword.length < 8) {
      setRecoveryError("Password must be at least 8 characters long.");
      return;
    }

    if (recoveryPassword !== confirmPassword) {
      setRecoveryError("Passwords do not match.");
      return;
    }

    setIsRecoveryPending(true);
    setRecoveryError(null);
    setRecoverySuccessMessage(null);

    const updateResult = await supabase.auth.updateUser({
      password: recoveryPassword
    });

    if (updateResult.error) {
      setRecoveryError(updateResult.error.message);
      setIsRecoveryPending(false);
      return;
    }

    await supabase.auth.signOut();
    setIsRecoveryPending(false);
    setRecoverySuccessMessage("Password updated. Sign in with your new admin password.");
    setIsRecoveringPassword(false);
    setRecoveryPassword("");
    setConfirmPassword("");
    router.replace(`${pathname}?reset=success`);
  }

  if (isRecoveringPassword) {
    return (
      <form className="space-y-5" noValidate onSubmit={handlePasswordReset}>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">Reset admin password</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Set a new password for your admin account, then sign in again to continue.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-foreground" htmlFor="admin-recovery-password">
            New password
          </Label>
          <Input
            id="admin-recovery-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="h-11 rounded-lg border-input bg-card text-foreground placeholder:text-muted-foreground"
            onChange={(event) => setRecoveryPassword(event.target.value)}
            placeholder="Enter a new password"
            value={recoveryPassword}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-foreground" htmlFor="admin-recovery-confirm-password">
            Confirm password
          </Label>
          <div className="relative">
            <Input
              id="admin-recovery-confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="h-11 rounded-lg border-input bg-card pr-12 text-foreground placeholder:text-muted-foreground"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm the new password"
              value={confirmPassword}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Eye aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {recoveryError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {recoveryError}
          </p>
        ) : null}

        <Button
          className="h-11 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark"
          disabled={isRecoveryPending}
          type="submit"
        >
          {isRecoveryPending ? "Updating password..." : "Save new password"}
        </Button>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {resetState === "success" || recoverySuccessMessage ? (
        <p className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
          {recoverySuccessMessage ?? "Password updated. Sign in with your new admin password."}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label className="text-sm text-foreground" htmlFor="admin-email">
          Email
        </Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          className="h-11 rounded-lg border-input bg-card text-foreground placeholder:text-muted-foreground"
          placeholder="admin@aurevia.travel"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-foreground" htmlFor="admin-password">
          Password
        </Label>
        <div className="relative">
          <Input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="h-11 rounded-lg border-input bg-card pr-12 text-foreground placeholder:text-muted-foreground"
            placeholder="Enter your password"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Eye aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <AdminLoginSubmitButton />

      <div className="flex items-center justify-between gap-3 text-sm">
        <Link
          href="/admin-login/forgot-password"
          className="text-muted-foreground no-underline transition-colors hover:text-foreground"
        >
          Forgot password
        </Link>
      </div>

      <div className="border-t border-border pt-5 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
        >
          Customer portal
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import {type FormEvent, useState} from "react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {createAdminSupabaseBrowserClient} from "@/lib/auth/admin-auth-browser";

const GENERIC_SUCCESS_MESSAGE =
  "If an admin account exists for that email, a reset link has been sent to the inbox.";

export function AdminForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [supabase] = useState(() => createAdminSupabaseBrowserClient());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Enter the admin email address to continue.");
      return;
    }

    setIsPending(true);
    setError(null);
    setSuccessMessage(null);

    const redirectTo = `${window.location.origin}/admin-login`;
    const result = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo
    });

    if (result.error) {
      setError(result.error.message);
      setIsPending(false);
      return;
    }

    setSuccessMessage(GENERIC_SUCCESS_MESSAGE);
    setIsPending(false);
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label className="text-sm text-foreground" htmlFor="admin-reset-email">
          Email
        </Label>
        <Input
          id="admin-reset-email"
          type="email"
          autoComplete="email"
          className="h-11 rounded-lg border-input bg-card text-foreground placeholder:text-muted-foreground"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@aurevia.travel"
          value={email}
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-foreground">
          {successMessage}
        </p>
      ) : null}

      <Button
        className="h-11 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary-dark"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Sending reset link..." : "Send reset link"}
      </Button>

      <div className="border-t border-border pt-5 text-center">
        <Link
          href="/admin-login"
          className="text-sm text-muted-foreground no-underline transition-colors hover:text-foreground"
        >
          Back to admin sign in
        </Link>
      </div>
    </form>
  );
}

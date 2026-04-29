"use client";

import {LogOut} from "lucide-react";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {type Locale} from "@/lib/i18n/routing";
import {createSupabaseBrowserClient} from "@/lib/supabase/browser";

type SignOutButtonProps = {
  locale: Locale;
};

export function SignOutButton({locale}: SignOutButtonProps) {
  const t = useTranslations("Dashboard.profile");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const result = await supabase.auth.signOut();

      if (result.error) {
        throw result.error;
      }

      router.push(`/${locale}`);
      router.refresh();
    } catch (error) {
      toast.error(t("signOutErrorTitle"), {
        description:
          error instanceof Error ? error.message : t("signOutErrorDescription")
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="rounded-lg px-5"
      disabled={isLoading}
      onClick={handleClick}
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      {isLoading ? t("signingOut") : t("signOutAction")}
    </Button>
  );
}

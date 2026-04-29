import {getTranslations} from "next-intl/server";

import {Button} from "@/components/ui/button";
import {Link} from "@/lib/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("Errors");

  return (
    <main
      id="main-content"
      className="container flex min-h-screen items-center justify-center py-12"
    >
      <div className="max-w-md space-y-5 text-center">
        <p className="text-sm font-semibold uppercase text-primary">404</p>
        <h1 className="font-display text-4xl tracking-[0.01em]">{t("notFoundTitle")}</h1>
        <p className="leading-7 text-muted-foreground">{t("notFoundDescription")}</p>
        <Button asChild>
          <Link href="/">{t("homeAction")}</Link>
        </Button>
      </div>
    </main>
  );
}

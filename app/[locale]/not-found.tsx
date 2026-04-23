import {getTranslations} from "next-intl/server";
import Link from "next/link";

import {Button} from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("Errors");

  return (
    <main
      id="main-content"
      className="container flex min-h-screen items-center justify-center py-12"
    >
      <div className="max-w-md space-y-5 text-center">
        <p className="text-sm font-semibold uppercase text-primary">404</p>
        <h1 className="text-3xl font-semibold tracking-normal">{t("notFoundTitle")}</h1>
        <p className="text-muted-foreground">{t("notFoundDescription")}</p>
        <Button asChild>
          <Link href="/">{t("homeAction")}</Link>
        </Button>
      </div>
    </main>
  );
}

"use client";

import {useTranslations} from "next-intl";
import {PageLoadingState} from "@/components/shared/feedback/page-loading-state";

export default function CheckoutLoading() {
  const t = useTranslations("Common");

  return <PageLoadingState label={t("loading")} />;
}

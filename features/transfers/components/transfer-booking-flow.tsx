"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useMutation} from "@tanstack/react-query";
import {CircleCheckBig, Route, ShieldCheck} from "lucide-react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {toast} from "sonner";

import {FormFieldError} from "@/components/forms/form-field-error";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {type Locale} from "@/lib/i18n/routing";

import {
  formatTransferDateTime,
  formatTransferPrice,
  getTransferCapacityLabel
} from "../lib/formatters";
import {createTransferBookingSchema} from "../lib/schemas";
import {
  type NormalizedTransferOffer,
  type TransferBookingConfirmation,
  type TransferBookingFormValues
} from "../types";

type TransferBookingFlowProps = {
  defaultContactEmail: string;
  initialFlightNumber?: string;
  locale: Locale;
  offer: NormalizedTransferOffer;
  searchLogId?: string;
};

type TransferBookingRoutePayload = TransferBookingFormValues & {
  locale: Locale;
  offerId: string;
  searchLogId?: string;
};

const steps = ["passenger", "contact", "review"] as const;

async function createTransferBooking(
  payload: TransferBookingRoutePayload
): Promise<TransferBookingConfirmation> {
  const response = await fetch("/api/transfers/bookings", {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });
  const body = (await response.json()) as
    | {message?: string}
    | TransferBookingConfirmation;

  if (!response.ok) {
    throw new Error(
      "message" in body && typeof body.message === "string"
        ? body.message
        : "Unable to create the pending transfer booking."
    );
  }

  return body as TransferBookingConfirmation;
}

export function TransferBookingFlow({
  defaultContactEmail,
  initialFlightNumber,
  locale,
  offer,
  searchLogId
}: TransferBookingFlowProps) {
  const t = useTranslations("Transfers.booking");
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const schema = createTransferBookingSchema({
    contactEmailInvalid: t("validation.contactEmailInvalid"),
    contactEmailRequired: t("validation.contactEmailRequired"),
    contactPhoneInvalid: t("validation.contactPhoneInvalid"),
    leadPassengerFirstNameRequired: t("validation.leadPassengerFirstNameRequired"),
    leadPassengerLastNameRequired: t("validation.leadPassengerLastNameRequired"),
    specialRequestsTooLong: t("validation.specialRequestsTooLong")
  });
  const {
    formState: {errors},
    getValues,
    handleSubmit,
    register,
    trigger
  } = useForm<TransferBookingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contactEmail: defaultContactEmail,
      contactPhone: "",
      flightNumber: initialFlightNumber ?? "",
      leadPassengerFirstName: "",
      leadPassengerLastName: "",
      specialRequests: ""
    }
  });
  const mutation = useMutation({
    mutationFn: (values: TransferBookingFormValues) =>
      createTransferBooking({
        ...values,
        locale,
        offerId: offer.id,
        searchLogId
      }),
    onError: (error) => {
      toast.error(t("errorTitle"), {
        description: error.message
      });
    },
    onSuccess: (confirmation) => {
      toast.success(t("successTitle"), {
        description: t("successDescription", {
          reference: confirmation.bookingReference
        })
      });
      router.push(`/${locale}/transfers/bookings/${confirmation.bookingId}`);
    }
  });

  async function handleContinue() {
    if (steps[stepIndex] === "passenger") {
      const fieldNames: Array<
        "flightNumber" | "leadPassengerFirstName" | "leadPassengerLastName"
      > = ["leadPassengerFirstName", "leadPassengerLastName"];

      if (offer.routeMode !== "point_to_point") {
        fieldNames.push("flightNumber");
      }

      const valid = await trigger(fieldNames);

      if (valid) {
        setStepIndex(1);
      }

      return;
    }

    if (steps[stepIndex] === "contact") {
      const valid = await trigger(["contactEmail", "contactPhone", "specialRequests"]);

      if (valid) {
        setStepIndex(2);
      }
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-border/80 bg-card/92 shadow-soft">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Route aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {t("eyebrow")}
              </p>
              <CardTitle className="font-display text-3xl tracking-[0.01em]">
                {t("title")}
              </CardTitle>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <span
                key={step}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  index === stepIndex
                    ? "bg-primary text-primary-foreground"
                    : index < stepIndex
                      ? "bg-secondary text-secondary-foreground"
                      : "border border-border/80 bg-background text-muted-foreground"
                }`}
              >
                {t(`steps.${step}`)}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-8" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
            {steps[stepIndex] === "passenger" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("passengerTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{t("passengerBody")}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-lead-first-name">
                      {t("leadPassengerFirstNameLabel")}
                    </Label>
                    <Input
                      id="transfer-lead-first-name"
                      aria-invalid={errors.leadPassengerFirstName ? "true" : "false"}
                      aria-describedby={
                        errors.leadPassengerFirstName
                          ? "transfer-lead-first-name-error"
                          : undefined
                      }
                      {...register("leadPassengerFirstName")}
                    />
                    <FormFieldError
                      id="transfer-lead-first-name-error"
                      message={errors.leadPassengerFirstName?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transfer-lead-last-name">
                      {t("leadPassengerLastNameLabel")}
                    </Label>
                    <Input
                      id="transfer-lead-last-name"
                      aria-invalid={errors.leadPassengerLastName ? "true" : "false"}
                      aria-describedby={
                        errors.leadPassengerLastName
                          ? "transfer-lead-last-name-error"
                          : undefined
                      }
                      {...register("leadPassengerLastName")}
                    />
                    <FormFieldError
                      id="transfer-lead-last-name-error"
                      message={errors.leadPassengerLastName?.message}
                    />
                  </div>
                </div>

                {offer.routeMode !== "point_to_point" ? (
                  <div className="space-y-2">
                    <Label htmlFor="transfer-flight-number-booking">
                      {t("flightNumberLabel")}
                    </Label>
                    <Input
                      id="transfer-flight-number-booking"
                      placeholder={t("flightNumberPlaceholder")}
                      aria-invalid={errors.flightNumber ? "true" : "false"}
                      aria-describedby={
                        errors.flightNumber ? "transfer-flight-number-booking-error" : undefined
                      }
                      {...register("flightNumber")}
                    />
                    <FormFieldError
                      id="transfer-flight-number-booking-error"
                      message={errors.flightNumber?.message}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {steps[stepIndex] === "contact" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("contactTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{t("contactBody")}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-contact-email">{t("contactEmailLabel")}</Label>
                    <Input
                      id="transfer-contact-email"
                      type="email"
                      autoComplete="email"
                      aria-invalid={errors.contactEmail ? "true" : "false"}
                      aria-describedby={
                        errors.contactEmail ? "transfer-contact-email-error" : undefined
                      }
                      {...register("contactEmail")}
                    />
                    <FormFieldError
                      id="transfer-contact-email-error"
                      message={errors.contactEmail?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transfer-contact-phone">{t("contactPhoneLabel")}</Label>
                    <Input
                      id="transfer-contact-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder={t("contactPhonePlaceholder")}
                      aria-invalid={errors.contactPhone ? "true" : "false"}
                      aria-describedby={
                        errors.contactPhone ? "transfer-contact-phone-error" : undefined
                      }
                      {...register("contactPhone")}
                    />
                    <FormFieldError
                      id="transfer-contact-phone-error"
                      message={errors.contactPhone?.message}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer-special-requests">{t("specialRequestsLabel")}</Label>
                  <Textarea
                    id="transfer-special-requests"
                    placeholder={t("specialRequestsPlaceholder")}
                    aria-invalid={errors.specialRequests ? "true" : "false"}
                    aria-describedby={
                      errors.specialRequests ? "transfer-special-requests-error" : undefined
                    }
                    {...register("specialRequests")}
                  />
                  <FormFieldError
                    id="transfer-special-requests-error"
                    message={errors.specialRequests?.message}
                  />
                </div>
              </div>
            ) : null}

            {steps[stepIndex] === "review" ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl">{t("reviewTitle")}</h2>
                  <p className="text-sm leading-7 text-muted-foreground">{t("reviewBody")}</p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("reviewPassengerLabel")}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-2 text-sm text-foreground">
                      <CircleCheckBig aria-hidden="true" className="h-4 w-4 text-primary" />
                      {getValues("leadPassengerFirstName")} {getValues("leadPassengerLastName")}
                    </p>
                    {getValues("flightNumber") ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t("flightNumberValue", {flightNumber: getValues("flightNumber")!})}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("reviewContactLabel")}
                    </p>
                    <p className="mt-3 text-sm text-foreground">{getValues("contactEmail")}</p>
                    {getValues("contactPhone") ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getValues("contactPhone")}
                      </p>
                    ) : null}
                    {getValues("specialRequests") ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {getValues("specialRequests")}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-border/80 bg-background/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t("reviewPricingLabel")}
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-foreground">
                      <div className="flex items-center justify-between">
                        <span>{t("subtotalLabel")}</span>
                        <span>
                          {formatTransferPrice({totalAmount: offer.subtotalAmount}, locale)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t("taxesLabel")}</span>
                        <span>{formatTransferPrice({totalAmount: offer.taxAmount}, locale)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border/70 pt-2 font-semibold">
                        <span>{t("totalLabel")}</span>
                        <span>{formatTransferPrice(offer, locale)}</span>
                      </div>
                      <p className="text-xs leading-6 text-muted-foreground">{t("vatNotice")}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg px-6"
                disabled={stepIndex === 0 || mutation.isPending}
                onClick={() => setStepIndex((currentStep) => Math.max(0, currentStep - 1))}
              >
                {t("backAction")}
              </Button>

              {steps[stepIndex] === "review" ? (
                <Button type="submit" className="rounded-lg px-6" disabled={mutation.isPending}>
                  {mutation.isPending ? t("submitting") : t("submitAction")}
                </Button>
              ) : (
                <Button type="button" className="rounded-lg px-6" onClick={handleContinue}>
                  {t("continueAction")}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <aside className="space-y-5">
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>{t("summaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-border/80 bg-background/70">
              <div
                aria-hidden="true"
                className="h-48 bg-cover bg-center"
                style={{backgroundImage: `url(${offer.imageUrl})`}}
              />
              <div className="space-y-3 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {offer.vendorName}
                  </p>
                  <h3 className="font-display text-2xl">{offer.vehicleName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getTransferCapacityLabel(offer)}
                  </p>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("pickupLabel")}</dt>
                    <dd className="text-right font-medium text-foreground">
                      {formatTransferDateTime(offer.pickupAt, locale)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("routeModeLabel")}</dt>
                    <dd className="text-right font-medium text-foreground">
                      {t(`routeModeOptions.${offer.routeMode}`)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t("vehicleClassLabel")}</dt>
                    <dd className="text-right font-medium text-foreground">
                      {t(`vehicleClassOptions.${offer.vehicleClass}`)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                    <dt className="font-semibold text-foreground">{t("totalLabel")}</dt>
                    <dd className="font-display text-3xl text-foreground">
                      {formatTransferPrice(offer, locale)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-background/70 p-5 text-sm leading-7 text-muted-foreground">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
                {offer.serviceSummary}
              </p>
              <p className="mt-3">
                {offer.meetAndGreetIncluded ? t("meetAndGreetIncluded") : t("meetAndGreetExcluded")}
              </p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

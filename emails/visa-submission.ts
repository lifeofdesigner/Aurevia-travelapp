import {type Locale} from "@/lib/i18n/routing";

type VisaSubmissionEmailInput = {
  applicationReference: string;
  brandName?: string;
  destinationLabel: string;
  locale: Locale;
};

const copy = {
  de: {
    body: "Ihr Visa-Service-Antrag wurde uebermittelt und fuer die naechste interne Pruefung vorgemerkt.",
    subjectSuffix: "Visa-Einreichung",
    title: "Visa-Antrag uebermittelt"
  },
  en: {
    body: "Your visa service application has been submitted and queued for internal review.",
    subjectSuffix: "visa submission",
    title: "Visa application submitted"
  }
} as const;

export function buildVisaSubmissionEmail({
  applicationReference,
  brandName = "Travel Desk",
  destinationLabel,
  locale
}: VisaSubmissionEmailInput) {
  const t = copy[locale];

  return {
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h1 style="font-size: 24px; margin-bottom: 12px;">${t.title}</h1>
        <p>${t.body}</p>
        <p>Reference: ${applicationReference}<br />Destination: ${destinationLabel}</p>
      </div>
    `,
    subject: `${brandName} ${t.subjectSuffix} | ${applicationReference}`,
    text: `${t.title}\n${t.body}\nReference: ${applicationReference}\nDestination: ${destinationLabel}`
  };
}

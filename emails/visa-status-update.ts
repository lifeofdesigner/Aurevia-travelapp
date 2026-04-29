import {type Locale} from "@/lib/i18n/routing";

import {buildEmailShell, getEmailBrandName} from "./shared";

type VisaStatusUpdateEmailInput = {
  applicationReference: string;
  explanation: string;
  footerText: string;
  locale: Locale;
  nextSteps: readonly string[];
  requiredDocuments: readonly string[];
  statusLabel: string;
};

export function buildVisaStatusUpdateEmail({
  applicationReference,
  explanation,
  footerText,
  locale,
  nextSteps,
  requiredDocuments,
  statusLabel
}: VisaStatusUpdateEmailInput) {
  const brandName = getEmailBrandName(footerText);
  const title = locale === "de" ? "Visa-Antrag aktualisiert" : "Visa Application Update";
  const subject = locale === "de"
    ? `${brandName} Visa-Update | ${applicationReference}`
    : `${brandName} Visa Update | ${applicationReference}`;

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
      ${locale === "de"
        ? "Ihr Visa-Antrag hat einen neuen Status."
        : "Your visa application has received a new status update."}
    </p>
    <div style="border:1px solid #e8e0d0;border-radius:8px;padding:18px;background:#ffffff;">
      <p style="margin:0;font-size:14px;line-height:1.8;color:#56705f;">Reference: <strong>${applicationReference}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#56705f;">Status: <strong>${statusLabel}</strong></p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#56705f;">${explanation}</p>
    </div>
    <div style="margin-top:18px;border:1px solid #e8e0d0;border-radius:8px;padding:18px;background:#ffffff;">
      <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7a9a85;">Next steps</p>
      ${nextSteps.map((step) => `<p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#56705f;">- ${step}</p>`).join("")}
    </div>
    ${requiredDocuments.length > 0
      ? `<div style="margin-top:18px;border:1px solid #e8e0d0;border-radius:8px;padding:18px;background:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7a9a85;">Documents required</p>
          ${requiredDocuments.map((item) => `<p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#56705f;">- ${item}</p>`).join("")}
        </div>`
      : ""}
  `;

  return {
    html: buildEmailShell({
      bodyHtml,
      footerText,
      title
    }),
    subject,
    text: `${title}\nReference: ${applicationReference}\nStatus: ${statusLabel}\n${explanation}\nNext steps: ${nextSteps.join("; ")}${requiredDocuments.length > 0 ? `\nDocuments required: ${requiredDocuments.join("; ")}` : ""}`
  };
}

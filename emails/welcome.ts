import {type Locale} from "@/lib/i18n/routing";

import {buildEmailShell, getEmailBrandName} from "./shared";

type WelcomeEmailInput = {
  firstName: string | null;
  footerText: string;
  locale: Locale;
  quickLinks: {
    dashboard: string;
    flights: string;
    hotels: string;
  };
};

export function buildWelcomeEmail({
  firstName,
  footerText,
  locale,
  quickLinks
}: WelcomeEmailInput) {
  const brandName = getEmailBrandName(footerText);
  const title = locale === "de" ? `Willkommen bei ${brandName}` : `Welcome to ${brandName}`;
  const subject = locale === "de"
    ? `Willkommen bei ${brandName}`
    : `Welcome to ${brandName}`;
  const name = firstName?.trim() || (locale === "de" ? "Reisende" : "Traveler");

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
      ${locale === "de"
        ? `Hallo ${name}, Ihr Konto ist bereit.`
        : `Hello ${name}, your account is ready.`}
    </p>
    <div style="border:1px solid #e8e0d0;border-radius:8px;padding:18px;background:#ffffff;">
      <p style="margin:0;font-size:14px;line-height:1.8;color:#56705f;">
        ${locale === "de"
          ? "Starten Sie mit den wichtigsten Bereichen:"
          : "Start with the most useful areas of your account:"}
      </p>
      <p style="margin:10px 0 0;font-size:14px;line-height:1.8;color:#56705f;"><a href="${quickLinks.flights}" style="color:#1c3d2e;">Search flights</a></p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#56705f;"><a href="${quickLinks.hotels}" style="color:#1c3d2e;">Browse hotels</a></p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#56705f;"><a href="${quickLinks.dashboard}" style="color:#1c3d2e;">Open your dashboard</a></p>
    </div>
  `;

  return {
    html: buildEmailShell({
      bodyHtml,
      footerText,
      title
    }),
    subject,
    text: `${title}\nFlights: ${quickLinks.flights}\nHotels: ${quickLinks.hotels}\nDashboard: ${quickLinks.dashboard}`
  };
}

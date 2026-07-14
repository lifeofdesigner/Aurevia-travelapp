import "@/app/globals.css";

import {type Metadata} from "next";
import {Inter, Libre_Franklin} from "next/font/google";
import {type ReactNode} from "react";

import {GlobalInteractionFeedback} from "@/components/shared/feedback/global-interaction-feedback";
import {buildMetadataIcons, getSiteBranding} from "@/server/brand/site-branding";

const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap"
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getSiteBranding();

  return {
    applicationName: branding.siteName,
    description: `Separate ${branding.siteName} admin authentication portal.`,
    icons: buildMetadataIcons(branding.faviconUrl),
    title: `Admin Portal | ${branding.siteName}`
  };
}

type AdminLoginLayoutProps = {
  children: ReactNode;
};

export default async function AdminLoginLayout({children}: AdminLoginLayoutProps) {
  const branding = await getSiteBranding();

  return (
    <html
      lang="en"
      className={`${libreFranklin.variable} ${inter.variable}`}
      data-site-theme={branding.websiteTheme}
      suppressHydrationWarning
    >
      <body className="font-sans">
        <GlobalInteractionFeedback />
        {children}
      </body>
    </html>
  );
}

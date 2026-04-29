import "server-only";

import {getServerEnv} from "@/lib/env/server";
import {
  formatBusinessAddressForDocuments,
  getSiteBranding
} from "@/server/brand/site-branding";

export type AureviaCompanyProfile = {
  address: string;
  email: string;
  name: string;
  vatId: string;
};

export function getAureviaCompanyProfile(): AureviaCompanyProfile {
  const env = getServerEnv();

  return {
    address: env.AUREVIA_COMPANY_ADDRESS,
    email: env.AUREVIA_COMPANY_EMAIL,
    name: env.AUREVIA_COMPANY_NAME,
    vatId: env.AUREVIA_COMPANY_VAT_ID
  };
}

export async function getAureviaCompanyProfileForDocuments(): Promise<AureviaCompanyProfile> {
  const [branding] = await Promise.all([getSiteBranding()]);
  const env = getServerEnv();

  return {
    address: formatBusinessAddressForDocuments(branding),
    email: branding.contactEmail,
    name: branding.siteName,
    vatId: env.AUREVIA_COMPANY_VAT_ID
  };
}

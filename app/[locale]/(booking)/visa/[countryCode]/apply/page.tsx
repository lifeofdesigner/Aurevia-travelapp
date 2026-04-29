import Link from "next/link";
import {notFound} from "next/navigation";

import {VisaApplicationWizard} from "@/features/visa/components/visa-application-wizard";
import {getVisaServiceProduct} from "@/features/visa/lib/catalog";
import {getVisaApplicationDefaults} from "@/features/visa/lib/schemas";
import {type Locale} from "@/lib/i18n/routing";
import {getLocalizedPath, ROUTES} from "@/lib/routes";
import {requireAuthenticatedUser} from "@/server/account/auth";
import {getSiteBranding} from "@/server/brand/site-branding";
import {createVisaApplicationDraft} from "@/server/visa/application-service";
import {
  getLatestEditableVisaApplicationForUser,
  getVisaApplicationForUser,
  getVisaUploadsForUser
} from "@/server/visa/query-service";
import {getPublicVisaCountryCatalog} from "@/server/visa/public-catalog-service";

type VisaCountryApplyPageProps = {
  params: {
    countryCode: string;
    locale: Locale;
  };
  searchParams: Record<string, string | string[] | undefined>;
};

function getStringValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function VisaCountryApplyPage({
  params,
  searchParams
}: VisaCountryApplyPageProps) {
  const [branding, catalog] = await Promise.all([
    getSiteBranding(),
    getPublicVisaCountryCatalog(params.locale, params.countryCode)
  ]);

  if (!catalog) {
    notFound();
  }

  const selectedVisaType = getStringValue(searchParams.visaType) || "tourist";
  const nationality = getStringValue(searchParams.nationality);
  const travelDate = getStringValue(searchParams.travelDate);
  const matchedProduct =
    catalog.products.find((product) => product.key === selectedVisaType) ??
    catalog.products[0] ??
    null;
  const currentPath = `${getLocalizedPath(ROUTES.visa, params.locale)}/${catalog.country.code}/apply`;
  const user = await requireAuthenticatedUser(
    params.locale,
    `${currentPath}${selectedVisaType ? `?visaType=${encodeURIComponent(selectedVisaType)}` : ""}`
  );
  const visaServiceProduct = getVisaServiceProduct(catalog.country.code);

  if (!visaServiceProduct) {
    notFound();
  }

  const requestedApplicationId = getStringValue(searchParams.applicationId);
  const requestedApplication =
    requestedApplicationId.length > 0
      ? await getVisaApplicationForUser(requestedApplicationId, user.id)
      : null;
  const latestEditableApplication =
    requestedApplication ??
    (await getLatestEditableVisaApplicationForUser(
      user.id,
      catalog.country.code,
      selectedVisaType === "business" || selectedVisaType === "student" ? selectedVisaType : "tourist"
    ));
  const applicationId =
    latestEditableApplication?.id ??
    (await createVisaApplicationDraft({
      nationalityCountryCode: nationality || undefined,
      travelDate: travelDate || undefined,
      userId: user.id,
      visaCountryCode: catalog.country.code,
      visaType:
        selectedVisaType === "business" || selectedVisaType === "student"
          ? selectedVisaType
          : "tourist"
    }));
  const application =
    latestEditableApplication ??
    (await getVisaApplicationForUser(applicationId, user.id));

  if (!application) {
    notFound();
  }

  const uploads = await getVisaUploadsForUser(application.id, user.id);
  const initialValues = getVisaApplicationDefaults(
    application.formData,
    catalog.country.code,
    nationality || application.formData.nationalityCountryCode,
    travelDate || application.formData.intendedArrivalDate
  );

  return (
    <main id="main-content" className="aurevia-section">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <Link
            href={`${getLocalizedPath(ROUTES.visa, params.locale)}/${catalog.country.code}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to visa types
          </Link>
          <h1 className="font-display text-4xl italic text-[#1c3d2e]">
            {matchedProduct?.title ?? `${catalog.country.name} visa application`}
          </h1>
          <p className="text-sm leading-7 text-[#7a9a85]">
            Continue through the guided {branding.siteName} visa application flow with destination-locked
            requirements, private document uploads, and draft saving tied to your account.
          </p>
        </div>

        <VisaApplicationWizard
          applicationId={application.id}
          defaultApplicantEmail={user.email ?? ""}
          initialReviewedAt={application.reviewedAt}
          initialStatus={application.status}
          initialSubmittedAt={application.submittedAt}
          initialUploads={uploads}
          initialValues={initialValues}
          lastSavedAt={application.updatedAt}
          locale={params.locale}
          product={visaServiceProduct}
        />
      </div>
    </main>
  );
}

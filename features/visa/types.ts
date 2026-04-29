import {type Locale} from "@/lib/i18n/routing";
import {type Money} from "@/lib/money";
import {type VisaApplicationStatus} from "@/types/database-enums";

export type {VisaApplicationStatus} from "@/types/database-enums";

export const VISA_PURPOSES = [
  "tourism",
  "business",
  "family_visit",
  "conference",
  "study",
  "medical",
  "transit"
] as const;
export type VisaPurpose = (typeof VISA_PURPOSES)[number];

export const VISA_RESIDENCY_STATUSES = [
  "citizen",
  "permanent_resident",
  "work_permit",
  "student_resident",
  "temporary_resident",
  "visitor"
] as const;
export type VisaResidencyStatus = (typeof VISA_RESIDENCY_STATUSES)[number];

export const VISA_PRODUCT_TYPES = ["tourist", "business", "student"] as const;
export type VisaProductType = (typeof VISA_PRODUCT_TYPES)[number];

export const VISA_DOCUMENT_TYPES = [
  "passport_scan",
  "photograph",
  "travel_itinerary",
  "accommodation_proof",
  "financial_proof",
  "travel_insurance",
  "residency_permit",
  "employment_letter",
  "invitation_letter",
  "dependent_consent"
] as const;
export type VisaDocumentType = (typeof VISA_DOCUMENT_TYPES)[number];

export type VisaCountryOption = {
  aliases: string[];
  code: string;
  localizedName: string;
  name: string;
  slug: string;
};

export type VisaRequirementDefinition = {
  acceptedMimeTypes: string[];
  code: VisaDocumentType;
  documentCategory: "passport_scan" | "visa_document";
  maxSizeBytes: number;
  multiple: boolean;
  required: boolean;
};

export type VisaProcessingTimeline = {
  appointmentRequired: boolean;
  prioritySupport: boolean;
  processingDaysMax: number;
  processingDaysMin: number;
};

export type VisaServiceProduct = {
  countryCode: string;
  optionalRequirementCodes: VisaDocumentType[];
  price: Money;
  processingTimeline: VisaProcessingTimeline;
  requirementCodes: VisaDocumentType[];
  serviceCode: string;
  slug: string;
  supportsDependents: boolean;
};

export type VisaCatalogSearchValues = {
  destinationCountry: string;
  nationality: string;
  travelDate: string;
};

export type VisaCatalogSearchCriteria = VisaCatalogSearchValues & {
  locale: Locale;
};

export type VisaTravelCompanion = {
  dateOfBirth: string;
  fullName: string;
  passportNumber?: string;
  relationship: string;
};

export type VisaApplicationFormValues = {
  acknowledgeInformationAccuracy: boolean;
  acknowledgeServiceScope: boolean;
  companions: VisaTravelCompanion[];
  dateOfBirth: string;
  destinationCountryCode: string;
  email: string;
  firstName: string;
  intendedArrivalDate: string;
  intendedDepartureDate: string;
  lastName: string;
  nationalityCountryCode: string;
  passportCountryCode: string;
  passportExpiresOn: string;
  passportIssuedOn: string;
  passportNumber: string;
  phone?: string;
  purposeOfTravel: VisaPurpose;
  purposeOfTravelDetails?: string;
  residencyAddressLine1: string;
  residencyAddressLine2?: string;
  residencyCity: string;
  residencyCountryCode: string;
  residencyStatus: VisaResidencyStatus;
};

export type VisaApplicationDraftValues = {
  acknowledgeInformationAccuracy?: boolean;
  acknowledgeServiceScope?: boolean;
  companions?: Array<Partial<VisaTravelCompanion>>;
  dateOfBirth?: string;
  destinationCountryCode?: string;
  email?: string;
  firstName?: string;
  intendedArrivalDate?: string;
  intendedDepartureDate?: string;
  lastName?: string;
  nationalityCountryCode?: string;
  passportCountryCode?: string;
  passportExpiresOn?: string;
  passportIssuedOn?: string;
  passportNumber?: string;
  phone?: string;
  purposeOfTravel?: VisaPurpose;
  purposeOfTravelDetails?: string;
  residencyAddressLine1?: string;
  residencyAddressLine2?: string;
  residencyCity?: string;
  residencyCountryCode?: string;
  residencyStatus?: VisaResidencyStatus;
  visaType?: VisaProductType;
};

export type VisaApplicationMutationPayload = {
  action: "save_draft" | "submit";
  formData: VisaApplicationFormValues;
  locale: Locale;
};

export type VisaUploadedDocument = {
  accessPath: string;
  applicationId: string;
  byteSize: number;
  createdAt: string;
  documentCategory: "passport_scan" | "visa_document";
  documentType: VisaDocumentType;
  fileName: string;
  id: string;
  metadataLabel?: string;
  mimeType: string;
};

export type VisaApplicationSummary = {
  applicationReference?: string | null;
  countryCode: string;
  createdAt: string;
  formData: VisaApplicationDraftValues;
  id: string;
  reviewedAt?: string | null;
  status: VisaApplicationStatus;
  submittedAt?: string | null;
  updatedAt: string;
};

export type VisaApplicationRequirementSnapshot = {
  code: VisaDocumentType;
  required: boolean;
  uploadCount: number;
};

export type VisaApplicationSaveResult = {
  applicationId: string;
  savedAt: string;
  status: VisaApplicationStatus;
};

export type VisaApplicationSubmitResult = {
  applicationId: string;
  applicationReference: string;
  savedAt: string;
  status: "submitted";
};

import "server-only";

import {getUserDataInventory, type PrivacyDataInventory} from "./export-service";

export type PrivacyDeletionPlan = {
  allowedHardDeleteAreas: string[];
  anonymizationAreas: string[];
  inventory: PrivacyDataInventory;
  legalReviewRequired: boolean;
  retentionExceptionHooks: string[];
  retainedAreas: string[];
};

export async function buildUserDeletionPlan(userId: string): Promise<PrivacyDeletionPlan> {
  const inventory = await getUserDataInventory(userId);

  return {
    allowedHardDeleteAreas: [
      inventory.notificationsCount > 0 ? "notifications" : null,
      inventory.travelerProfilesCount > 0 ? "traveler_profiles" : null,
      inventory.addressesCount > 0 ? "addresses" : null,
      inventory.consentRecordsCount > 0 ? "consent_records" : null
    ].filter((value): value is string => Boolean(value)),
    anonymizationAreas: [
      inventory.bookingsCount > 0 ? "booking customer contact fields" : null,
      inventory.uploadsCount > 0 ? "upload metadata where lawful" : null,
      inventory.visaApplicationsCount > 0 ? "visa application free-text fields" : null,
      "profile identity fields",
      "support ticket customer references"
    ].filter((value): value is string => Boolean(value)),
    inventory,
    legalReviewRequired: true,
    retentionExceptionHooks: [
      "finance_retention_required",
      "snapshot_anonymization_preferred",
      "open_case_hold",
      "upload_review_required"
    ],
    retainedAreas: [
      "payments",
      "refunds",
      "invoices",
      "tax_line_items",
      "audit_logs",
      "immutable booking snapshots"
    ]
  };
}

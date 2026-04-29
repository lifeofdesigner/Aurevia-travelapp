import "server-only";

import {type Json} from "@/types/supabase";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

import {createFinanceAuditLog} from "./audit";
import {getBookingPaymentSummaryById} from "./booking-summary";
import {getAureviaCompanyProfileForDocuments} from "./company";
import {renderInvoicePdf} from "./invoice-pdf";
import {storeInvoicePdf} from "./invoice-storage";
import {buildBookingTaxLines} from "./tax";

function toJson(value: unknown) {
  return value as Json;
}

export async function createOrGetPaidInvoiceForBooking(bookingId: string) {
  const existingSummary = await getBookingPaymentSummaryById(bookingId);

  if (!existingSummary) {
    throw new Error("The booking could not be found for invoice generation.");
  }

  if (
    existingSummary.invoiceId &&
    existingSummary.invoiceNumber &&
    existingSummary.invoicePdfUploadId
  ) {
    return {
      invoiceId: existingSummary.invoiceId,
      invoiceNumber: existingSummary.invoiceNumber,
      pdfUploadId: existingSummary.invoicePdfUploadId
    };
  }

  const admin = createSupabaseAdminClient();
  const company = await getAureviaCompanyProfileForDocuments();
  const now = new Date().toISOString();
  let finalizedInvoice =
    existingSummary.invoiceId && existingSummary.invoiceNumber
      ? {
          id: existingSummary.invoiceId,
          invoice_number: existingSummary.invoiceNumber
        }
      : null;

  if (!finalizedInvoice) {
    const invoiceInsert = await admin
      .from("invoices")
      .insert({
        billing_address_snapshot: toJson(existingSummary.billingAddressSnapshot),
        booking_id: existingSummary.bookingId,
        currency_code: existingSummary.currency,
        issued_at: now,
        issuer_snapshot: toJson(company),
        paid_at: now,
        status: "paid",
        subtotal_amount_minor: existingSummary.subtotalAmountMinor,
        tax_amount_minor: existingSummary.taxAmountMinor,
        total_amount_minor: existingSummary.totalAmountMinor,
        user_id: existingSummary.customerUserId
      })
      .select("id, invoice_number")
      .single();

    if (invoiceInsert.error || !invoiceInsert.data?.id || !invoiceInsert.data.invoice_number) {
      throw new Error(invoiceInsert.error?.message ?? "Unable to create the invoice record.");
    }

    finalizedInvoice = invoiceInsert.data as {id: string; invoice_number: string};
  }

  const lineItemsCountResult = await admin
    .from("invoice_line_items")
    .select("id", {count: "exact", head: true})
    .eq("invoice_id", finalizedInvoice.id);
  const existingLineItemsCount = lineItemsCountResult.count ?? 0;

  if (existingLineItemsCount === 0) {
    const lineItemsResult = await admin.from("invoice_line_items").insert(
      existingSummary.items.map((item, index) => ({
        currency_code: item.currencyCode,
        description: item.description ? `${item.title} | ${item.description}` : item.title,
        invoice_id: finalizedInvoice.id,
        line_index: index + 1,
        metadata: toJson({
          bookingItemId: item.bookingItemId,
          bookingType: item.bookingType,
          serviceEndAt: item.serviceEndAt,
          serviceStartAt: item.serviceStartAt
        }),
        quantity: item.quantity,
        related_booking_item_id: item.bookingItemId,
        subtotal_amount_minor: item.subtotalAmountMinor,
        total_amount_minor: item.totalAmountMinor,
        unit_amount_minor: Math.round(item.totalAmountMinor / Math.max(1, item.quantity))
      }))
    );

    if (lineItemsResult.error) {
      throw new Error(lineItemsResult.error.message);
    }
  }

  const taxLines = buildBookingTaxLines(existingSummary);

  if (taxLines.length > 0) {
    const taxCountResult = await admin
      .from("tax_line_items")
      .select("id", {count: "exact", head: true})
      .eq("invoice_id", finalizedInvoice.id);

    if ((taxCountResult.count ?? 0) === 0) {
      const taxResult = await admin.from("tax_line_items").insert(
        taxLines.map((line) => ({
          booking_item_id: line.bookingItemId,
          currency_code: line.currency,
          invoice_id: finalizedInvoice.id,
          jurisdiction_country_code: line.jurisdictionCountryCode,
          tax_amount_minor: line.taxAmountMinor,
          tax_name: line.taxName,
          tax_rate: line.rate,
          taxable_amount_minor: line.taxableAmountMinor
        }))
      );

      if (taxResult.error) {
        throw new Error(taxResult.error.message);
      }
    }
  }

  const pdfBytes = await renderInvoicePdf({
    booking: existingSummary,
    company,
    invoiceId: finalizedInvoice.id,
    invoiceNumber: finalizedInvoice.invoice_number,
    issuedAt: now,
    locale: existingSummary.locale,
    taxLines
  });
  const pdfUploadId = await storeInvoicePdf({
    bookingId: existingSummary.bookingId,
    fileBytes: pdfBytes,
    fileName: `${finalizedInvoice.invoice_number}.pdf`,
    invoiceId: finalizedInvoice.id,
    ownerUserId: existingSummary.customerUserId
  });
  const invoiceUpdate = await admin
    .from("invoices")
    .update({
      pdf_upload_id: pdfUploadId
    })
    .eq("id", finalizedInvoice.id);

  if (invoiceUpdate.error) {
    throw new Error(invoiceUpdate.error.message);
  }

  await createFinanceAuditLog({
    action: "finance.invoice.issued",
    entityId: finalizedInvoice.id,
    entityType: "invoice",
    metadata: {
      bookingId: existingSummary.bookingId,
      invoiceNumber: finalizedInvoice.invoice_number
    },
    targetUserId: existingSummary.customerUserId
  });

  return {
    invoiceId: finalizedInvoice.id,
    invoiceNumber: finalizedInvoice.invoice_number,
    pdfUploadId
  };
}

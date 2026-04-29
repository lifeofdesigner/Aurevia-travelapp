import {formatDate} from "@/lib/dates";
import {formatMoney} from "@/lib/money";

import {type VisaUploadedDocument, type VisaServiceProduct} from "../types";

export function formatVisaServicePrice(product: VisaServiceProduct, locale: string) {
  return formatMoney(product.price, locale);
}

export function formatVisaProcessingTimeline(
  processingDaysMin: number,
  processingDaysMax: number
) {
  return `${processingDaysMin}-${processingDaysMax}`;
}

export function formatVisaUploadedFileSize(byteSize: number) {
  if (byteSize < 1024 * 1024) {
    return `${Math.max(1, Math.round(byteSize / 1024))} KB`;
  }

  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatVisaDocumentDate(upload: Pick<VisaUploadedDocument, "createdAt">, locale: string) {
  return formatDate(upload.createdAt, locale);
}

import {Document, Image, Page, Text, View} from "@react-pdf/renderer";

import {type Locale} from "@/lib/i18n/routing";
import {type SupportedCurrency} from "@/lib/money";

import {
  formatPdfDate,
  formatPdfMoney,
  defaultPdfBranding,
  getTicketLogoDimensions,
  type PdfBranding,
  pdfStyles
} from "./shared";

export type GenericBookingDocumentData = {
  bookingDate: string;
  bookingReference: string;
  bookingStatus: string;
  currency: SupportedCurrency;
  customerLabel: string;
  itemRows: Array<{
    amountMinor: number;
    description: string | null;
    quantity: number;
    serviceWindow: string | null;
    title: string;
  }>;
  productLabel: string;
  priceBaseFareMinor: number;
  priceTaxMinor: number;
  priceTotalMinor: number;
  travelerNames: string[];
};

type GenericBookingDocumentProps = {
  branding?: PdfBranding;
  documentData: GenericBookingDocumentData;
  locale: Locale;
};

export function GenericBookingDocument({
  branding = defaultPdfBranding,
  documentData,
  locale
}: GenericBookingDocumentProps) {
  return (
    <Document
      author={branding.siteName}
      subject={`Booking document ${documentData.bookingReference}`}
      title={`${branding.siteName} Booking Document ${documentData.bookingReference}`}
    >
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View style={pdfStyles.headerTop}>
            <View style={{width: "58%"}}>
              <Text style={pdfStyles.brandKicker}>Travel document</Text>
              {branding.logoUrl ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={branding.logoUrl} style={getTicketLogoDimensions(branding.ticketLogoSize)} />
                </>
              ) : (
                <Text style={pdfStyles.brandName}>{branding.siteName}</Text>
              )}
              <Text style={pdfStyles.headerMeta}>
                {branding.businessLocation} | {branding.contactEmail}
              </Text>
            </View>
            <View style={pdfStyles.referencePanel}>
              <Text style={pdfStyles.referenceLabel}>Booking reference</Text>
              <Text style={pdfStyles.referenceValue}>{documentData.bookingReference}</Text>
            </View>
          </View>
          <Text style={pdfStyles.documentTitle}>Booking Confirmation Document</Text>
          <Text style={pdfStyles.documentSubTitle}>
            {documentData.productLabel} booking issued on {formatPdfDate(documentData.bookingDate, locale)}.
          </Text>
        </View>

        <View style={pdfStyles.statusStrip}>
          <Text style={pdfStyles.statusStripText}>Status: {documentData.bookingStatus}</Text>
          <Text style={pdfStyles.statusStripText}>Product: {documentData.productLabel}</Text>
        </View>

        <View style={pdfStyles.body}>
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Booking overview</Text>
            <View style={pdfStyles.card}>
              <View style={pdfStyles.rowBetween}>
                <View style={{width: "47%"}}>
                  <Text style={pdfStyles.keyLabel}>Status</Text>
                  <Text style={pdfStyles.keyValue}>{documentData.bookingStatus}</Text>
                </View>
                <View style={{width: "47%"}}>
                  <Text style={pdfStyles.keyLabel}>Customer</Text>
                  <Text style={pdfStyles.keyValue}>{documentData.customerLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Included services</Text>
            {documentData.itemRows.map((row) => (
              <View key={`${row.title}-${row.quantity}`} style={pdfStyles.card}>
                <View style={pdfStyles.rowBetween}>
                  <View style={{width: "72%"}}>
                    <Text style={pdfStyles.keyValueStrong}>{row.title}</Text>
                    {row.description ? (
                      <Text style={[pdfStyles.bodyText, {marginTop: 6}]}>
                        {row.description}
                      </Text>
                    ) : null}
                    <Text style={[pdfStyles.bodyText, {marginTop: 6}]}>
                      Quantity: {row.quantity}
                      {row.serviceWindow ? ` | ${row.serviceWindow}` : ""}
                    </Text>
                  </View>
                  <View style={{width: "24%"}}>
                    <Text style={[pdfStyles.keyValue, pdfStyles.textRight]}>
                      {formatPdfMoney(row.amountMinor, documentData.currency, locale)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Travelers</Text>
            <View style={pdfStyles.card}>
              {documentData.travelerNames.length === 0 ? (
                <Text style={pdfStyles.bodyText}>Traveler details are available in your {branding.siteName} account.</Text>
              ) : (
                documentData.travelerNames.map((name) => (
                  <Text key={name} style={[pdfStyles.keyValue, {marginBottom: 4}]}>
                    {name}
                  </Text>
                ))
              )}
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Price section</Text>
            <View style={pdfStyles.card}>
              <View style={[pdfStyles.rowBetween, {marginBottom: 8}]}>
                <Text style={pdfStyles.bodyText}>Subtotal</Text>
                <Text style={pdfStyles.keyValue}>
                  {formatPdfMoney(documentData.priceBaseFareMinor, documentData.currency, locale)}
                </Text>
              </View>
              <View style={[pdfStyles.rowBetween, {marginBottom: 8}]}>
                <Text style={pdfStyles.bodyText}>Taxes</Text>
                <Text style={pdfStyles.keyValue}>
                  {formatPdfMoney(documentData.priceTaxMinor, documentData.currency, locale)}
                </Text>
              </View>
              <View style={pdfStyles.divider} />
              <View style={pdfStyles.rowBetween}>
                <Text style={pdfStyles.keyValueStrong}>Total paid</Text>
                <Text style={pdfStyles.keyValueStrong}>
                  {formatPdfMoney(documentData.priceTotalMinor, documentData.currency, locale)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text fixed style={pdfStyles.footer}>
          This document was generated for your {branding.siteName} booking | {branding.businessLocation}
        </Text>
      </Page>
    </Document>
  );
}

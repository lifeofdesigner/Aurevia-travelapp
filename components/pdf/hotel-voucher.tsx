import {Document, Image, Page, Text, View} from "@react-pdf/renderer";

import {type Locale} from "@/lib/i18n/routing";
import {type SupportedCurrency} from "@/lib/money";

import {
  formatPdfDate,
  formatPdfMoney,
  defaultPdfBranding,
  type PdfBranding,
  pdfStyles
} from "./shared";

export type HotelVoucherData = {
  bookingDate: string;
  bookingReference: string;
  bookingStatus: string;
  cancellationPolicy: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  currency: SupportedCurrency;
  guestCountLabel: string;
  hotelAddress: string;
  hotelName: string;
  priceBaseFareMinor: number;
  priceTaxMinor: number;
  priceTotalMinor: number;
  roomType: string;
};

type HotelVoucherProps = {
  branding?: PdfBranding;
  locale: Locale;
  voucher: HotelVoucherData;
};

export function HotelVoucher({
  branding = defaultPdfBranding,
  locale,
  voucher
}: HotelVoucherProps) {
  return (
    <Document
      author={branding.siteName}
      subject={`Hotel voucher ${voucher.bookingReference}`}
      title={`${branding.siteName} Hotel Voucher ${voucher.bookingReference}`}
    >
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <View style={pdfStyles.headerTop}>
            <View style={{width: "58%"}}>
              <Text style={pdfStyles.brandKicker}>Travel document</Text>
              {branding.logoUrl ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={branding.logoUrl} style={pdfStyles.brandImage} />
                </>
              ) : (
                <Text style={pdfStyles.brandName}>{branding.siteName}</Text>
              )}
              <Text style={pdfStyles.headerMeta}>
                {branding.businessLocation} | {branding.contactEmail}
              </Text>
            </View>
            <View style={pdfStyles.referencePanel}>
              <Text style={pdfStyles.referenceLabel}>Voucher reference</Text>
              <Text style={pdfStyles.referenceValue}>{voucher.bookingReference}</Text>
            </View>
          </View>
          <Text style={pdfStyles.documentTitle}>Hotel Accommodation Voucher</Text>
          <Text style={pdfStyles.documentSubTitle}>
            Confirmed stay document issued on {formatPdfDate(voucher.bookingDate, locale)}.
          </Text>
        </View>

        <View style={pdfStyles.statusStrip}>
          <Text style={pdfStyles.statusStripText}>Status: {voucher.bookingStatus}</Text>
          <Text style={pdfStyles.statusStripText}>Guests: {voucher.guestCountLabel}</Text>
        </View>

        <View style={pdfStyles.body}>
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Hotel details</Text>
            <View style={pdfStyles.card}>
              <Text style={pdfStyles.keyValueStrong}>{voucher.hotelName}</Text>
              <Text style={[pdfStyles.bodyText, {marginTop: 6}]}>{voucher.hotelAddress}</Text>
              <View style={[pdfStyles.twoColumn, {marginTop: 12}]}>
                <View style={{width: "47%"}}>
                  <Text style={pdfStyles.keyLabel}>Room type</Text>
                  <Text style={pdfStyles.keyValue}>{voucher.roomType}</Text>
                </View>
                <View style={{width: "47%"}}>
                  <Text style={pdfStyles.keyLabel}>Guests</Text>
                  <Text style={pdfStyles.keyValue}>{voucher.guestCountLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Check-in and check-out</Text>
            <View style={pdfStyles.card}>
              <View style={pdfStyles.twoColumn}>
                <View style={{width: "47%"}}>
                  <Text style={pdfStyles.keyLabel}>Check-in</Text>
                  <Text style={pdfStyles.keyValueStrong}>
                    {formatPdfDate(voucher.checkInDate, locale)}
                  </Text>
                  <Text style={pdfStyles.bodyText}>{voucher.checkInTime}</Text>
                </View>
                <View style={{width: "47%"}}>
                  <Text style={pdfStyles.keyLabel}>Check-out</Text>
                  <Text style={pdfStyles.keyValueStrong}>
                    {formatPdfDate(voucher.checkOutDate, locale)}
                  </Text>
                  <Text style={pdfStyles.bodyText}>{voucher.checkOutTime}</Text>
                </View>
              </View>
              <View style={pdfStyles.divider} />
              <View style={pdfStyles.rowBetween}>
                <View>
                  <Text style={pdfStyles.keyLabel}>Status</Text>
                  <Text style={pdfStyles.keyValue}>{voucher.bookingStatus}</Text>
                </View>
                <View style={{width: "38%"}}>
                  <Text style={pdfStyles.keyLabel}>Reference</Text>
                  <Text style={[pdfStyles.keyValue, pdfStyles.textRight]}>
                    {voucher.bookingReference}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Price section</Text>
            <View style={pdfStyles.card}>
              <View style={[pdfStyles.rowBetween, {marginBottom: 8}]}>
                <Text style={pdfStyles.bodyText}>Base rate</Text>
                <Text style={pdfStyles.keyValue}>
                  {formatPdfMoney(voucher.priceBaseFareMinor, voucher.currency, locale)}
                </Text>
              </View>
              <View style={[pdfStyles.rowBetween, {marginBottom: 8}]}>
                <Text style={pdfStyles.bodyText}>Taxes</Text>
                <Text style={pdfStyles.keyValue}>
                  {formatPdfMoney(voucher.priceTaxMinor, voucher.currency, locale)}
                </Text>
              </View>
              <View style={pdfStyles.divider} />
              <View style={pdfStyles.rowBetween}>
                <Text style={pdfStyles.keyValueStrong}>Total paid</Text>
                <Text style={pdfStyles.keyValueStrong}>
                  {formatPdfMoney(voucher.priceTotalMinor, voucher.currency, locale)}
                </Text>
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Cancellation policy</Text>
            <View style={[pdfStyles.card, pdfStyles.cardMuted]}>
              <Text style={pdfStyles.bodyText}>{voucher.cancellationPolicy}</Text>
            </View>
          </View>
        </View>

        <Text fixed style={pdfStyles.footer}>
          This voucher confirms your {branding.siteName} stay | {branding.businessLocation}
        </Text>
      </Page>
    </Document>
  );
}

import {NextResponse} from "next/server";

import {listAdminBookingsForExport} from "@/server/admin/query-service";
import {type BookingStatus, BOOKING_STATUSES, BOOKING_TYPES, PAYMENT_STATUSES} from "@/types/database-enums";
import {isSupportedCurrency, toMinorUnit} from "@/lib/money";
import {requireAdminApiUser} from "@/server/admin/auth";

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function parseMajorAmountToMinor(value: string | null, currency: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  if (currency && isSupportedCurrency(currency)) {
    return toMinorUnit(parsed, currency);
  }

  return Math.round(parsed * 100);
}

export async function GET(request: Request) {
  try {
    await requireAdminApiUser("export.all");
    const searchParams = new URL(request.url).searchParams;
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const currency = searchParams.get("currency");
    const bookings = await listAdminBookingsForExport({
      currency: currency && isSupportedCurrency(currency) ? currency : undefined,
      customer: searchParams.get("customer") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      maxTotalAmountMinor: parseMajorAmountToMinor(searchParams.get("maxAmount"), currency),
      minTotalAmountMinor: parseMajorAmountToMinor(searchParams.get("minAmount"), currency),
      paymentStatus:
        paymentStatus && PAYMENT_STATUSES.includes(paymentStatus as (typeof PAYMENT_STATUSES)[number])
          ? (paymentStatus as (typeof PAYMENT_STATUSES)[number])
          : undefined,
      query: searchParams.get("q") ?? undefined,
      status:
        status && BOOKING_STATUSES.includes(status as BookingStatus)
          ? (status as BookingStatus)
          : undefined,
      type:
        type && BOOKING_TYPES.includes(type as (typeof BOOKING_TYPES)[number])
          ? (type as (typeof BOOKING_TYPES)[number])
          : undefined
    });

    const lines = [
      [
        "booking_reference",
        "customer_name",
        "customer_email",
        "customer_user_id",
        "booking_type",
        "booking_status",
        "payment_status",
        "currency",
        "total_amount_minor",
        "created_at"
      ].join(","),
      ...bookings.map((booking) =>
        [
          booking.bookingReference,
          booking.customerName,
          booking.customerEmail,
          booking.customerUserId,
          booking.primaryBookingType,
          booking.status,
          booking.paymentStatus,
          booking.currency,
          String(booking.totalAmountMinor),
          booking.createdAt
        ]
          .map(escapeCsv)
          .join(",")
      )
    ];

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Disposition": `attachment; filename="aurevia-admin-bookings-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
        "Content-Type": "text/csv; charset=utf-8"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export bookings.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}

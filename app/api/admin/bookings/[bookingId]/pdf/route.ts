import {NextResponse} from "next/server";

import {type Locale, isSupportedLocale} from "@/lib/i18n/routing";
import {requireAdminApiUser} from "@/server/admin/auth";
import {renderAdminBookingPdf} from "@/server/admin/booking-pdf";
import {getAdminBookingDetail} from "@/server/admin/query-service";

export async function GET(
  request: Request,
  {params}: {params: {bookingId: string}}
) {
  try {
    await requireAdminApiUser("bookings.view");
    const localeParam = new URL(request.url).searchParams.get("locale");
    const locale: Locale = localeParam && isSupportedLocale(localeParam) ? localeParam : "en";
    const booking = await getAdminBookingDetail(params.bookingId);

    if (!booking) {
      return NextResponse.json({message: "Booking not found."}, {status: 404});
    }

    const pdfBytes = await renderAdminBookingPdf({
      booking,
      locale
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Disposition": `attachment; filename="aurevia-booking-${booking.bookingReference}.pdf"`,
        "Content-Type": "application/pdf"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate the booking PDF.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}

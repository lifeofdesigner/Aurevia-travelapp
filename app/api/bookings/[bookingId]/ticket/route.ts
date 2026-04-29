import {Readable} from "node:stream";

import {renderToStream} from "@react-pdf/renderer";
import {NextResponse} from "next/server";

import {type Locale, isSupportedLocale} from "@/lib/i18n/routing";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {PERMISSIONS, hasPermission} from "@/lib/permissions";
import {getBookingDetailForUser} from "@/server/account/dashboard-service";
import {getCurrentStaffIdentity} from "@/server/admin/auth";
import {getAdminBookingDetail} from "@/server/admin/query-service";
import {getSiteBranding} from "@/server/brand/site-branding";
import {
  buildBookingTicketDocument,
  toTicketBookingDetail
} from "@/server/bookings/ticket-document";

export const runtime = "nodejs";

function getLocaleFromRequest(request: Request): Locale {
  const localeParam = new URL(request.url).searchParams.get("locale");
  return localeParam && isSupportedLocale(localeParam) ? localeParam : "en";
}

export async function GET(
  request: Request,
  {params}: {params: {bookingId: string}}
) {
  try {
    const locale = getLocaleFromRequest(request);
    const branding = await getSiteBranding();
    const staff = await getCurrentStaffIdentity();

    if (staff && hasPermission(staff.role, PERMISSIONS.bookingReadAll)) {
      const adminBooking = await getAdminBookingDetail(params.bookingId);

      if (!adminBooking) {
        return NextResponse.json({message: "Booking not found."}, {status: 404});
      }

      const stream = await renderToStream(
        buildBookingTicketDocument({
          branding,
          booking: toTicketBookingDetail(adminBooking),
          locale
        })
      );

      return new NextResponse(
        Readable.toWeb(stream as unknown as Readable) as unknown as ReadableStream,
        {
          headers: {
            "Content-Disposition": `attachment; filename="aurevia-booking-${adminBooking.bookingReference}.pdf"`,
            "Content-Type": "application/pdf"
          }
        }
      );
    }

    const supabase = createSupabaseServerClient();
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;

    if (!user) {
      return NextResponse.json(
        {message: "Sign in is required before accessing booking tickets."},
        {status: 401}
      );
    }

    const booking = await getBookingDetailForUser(user.id, params.bookingId);

    if (!booking) {
      return NextResponse.json({message: "Booking not found."}, {status: 404});
    }

    const stream = await renderToStream(
      buildBookingTicketDocument({
        branding,
        booking: toTicketBookingDetail(booking),
        locale
      })
    );

    return new NextResponse(
      Readable.toWeb(stream as unknown as Readable) as unknown as ReadableStream,
      {
        headers: {
          "Content-Disposition": `attachment; filename="aurevia-booking-${booking.bookingReference}.pdf"`,
          "Content-Type": "application/pdf"
        }
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate the booking ticket.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}

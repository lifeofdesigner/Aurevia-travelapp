import {NextResponse} from "next/server";

import {requireAdminApiUser} from "@/server/admin/auth";
import {listAdminCustomersForExport} from "@/server/admin/query-service";
import {USER_ROLES} from "@/types/database-enums";

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function formatSpendSummary(
  summary: Array<{
    amountMinor: number;
    currency: string;
  }>
) {
  return summary.map((entry) => `${entry.currency}:${entry.amountMinor}`).join(" | ");
}

export async function GET(request: Request) {
  try {
    await requireAdminApiUser("export.all");
    const searchParams = new URL(request.url).searchParams;
    const role = searchParams.get("role");
    const items = await listAdminCustomersForExport({
      query: searchParams.get("q") ?? undefined,
      role:
        role && USER_ROLES.includes(role as (typeof USER_ROLES)[number])
          ? (role as (typeof USER_ROLES)[number])
          : undefined
    });

    const lines = [
      [
        "user_id",
        "email",
        "first_name",
        "last_name",
        "phone",
        "role",
        "is_suspended",
        "booking_count",
        "visa_application_count",
        "spend_summary",
        "created_at",
        "last_signed_in_at"
      ].join(","),
      ...items.map((item) =>
        [
          item.userId,
          item.email,
          item.firstName ?? "",
          item.lastName ?? "",
          item.phone ?? "",
          item.role,
          String(item.isSuspended),
          String(item.bookingCount),
          String(item.visaApplicationCount),
          formatSpendSummary(item.spendSummary),
          item.createdAt,
          item.lastSignedInAt ?? ""
        ]
          .map(escapeCsv)
          .join(",")
      )
    ];

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Disposition": `attachment; filename="aurevia-admin-customers-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
        "Content-Type": "text/csv; charset=utf-8"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export customers.";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 400;
    return NextResponse.json({message}, {status});
  }
}

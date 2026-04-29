import "server-only";

import {PERMISSIONS, hasPermission} from "@/lib/permissions";
import {getSiteBranding} from "@/server/brand/site-branding";
import {syncCustomerAuthConfirmationForSettings} from "@/server/customer-access/settings";
import {createEmailProvider} from "@/server/email/provider";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

import {createAdminAuditLog} from "./audit";
import {type AdminStaffIdentity} from "@/features/admin/types";

function assertCustomerManagerAccess(actor: AdminStaffIdentity) {
  if (!hasPermission(actor.role, PERMISSIONS.adminAccess)) {
    throw new Error("Forbidden.");
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function updateAdminCustomerSuspension({
  actor,
  isSuspended,
  userId
}: {
  actor: AdminStaffIdentity;
  isSuspended: boolean;
  userId: string;
}) {
  assertCustomerManagerAccess(actor);

  const admin = createSupabaseAdminClient();
  const profileResult = await admin
    .from("profiles")
    .select("user_id, role, email, is_suspended")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  const profile =
    (profileResult.data as
      | {
          email: string;
          is_suspended: boolean;
          role: string;
          user_id: string;
        }
      | null) ?? null;

  if (!profile) {
    throw new Error("Customer not found.");
  }

  if (profile.role !== "customer") {
    throw new Error("Only customer accounts can be suspended from this screen.");
  }

  const updateResult = await admin
    .from("profiles")
    .update({
      is_suspended: isSuspended,
      suspended_at: isSuspended ? new Date().toISOString() : null
    })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  if (!isSuspended) {
    await syncCustomerAuthConfirmationForSettings({userId});
  }

  await createAdminAuditLog({
    action: isSuspended ? "customer.suspended" : "customer.reactivated",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: userId,
    entityType: "customer",
    metadata: {
      email: profile.email
    },
    targetUserId: userId
  });
}

export async function sendAdminCustomerEmail({
  actor,
  message,
  replyTo,
  subject,
  userId
}: {
  actor: AdminStaffIdentity;
  message: string;
  replyTo: string | null;
  subject: string;
  userId: string;
}) {
  assertCustomerManagerAccess(actor);

  const admin = createSupabaseAdminClient();
  const [customerResult, actorProfileResult] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, email, first_name, last_name")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("user_id, email, first_name, last_name")
      .eq("user_id", actor.userId)
      .maybeSingle()
  ]);
  const customer =
    (customerResult.data as
      | {
          email: string;
          first_name: string | null;
          last_name: string | null;
          user_id: string;
        }
      | null) ?? null;
  const actorProfile =
    (actorProfileResult.data as
      | {
          email: string;
          first_name: string | null;
          last_name: string | null;
          user_id: string;
        }
      | null) ?? null;

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const customerName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;
  const actorLabel =
    [actorProfile?.first_name, actorProfile?.last_name].filter(Boolean).join(" ") ||
    actor.email;
  const branding = await getSiteBranding();
  const escapedSiteName = escapeHtml(branding.siteName);
  const provider = createEmailProvider();

  await provider.send({
    html: `
      <div style="font-family:Manrope,Arial,sans-serif;background:#f7f3ec;padding:32px;color:#1c3d2e;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d0;border-radius:8px;overflow:hidden;">
          <div style="background:#1c3d2e;padding:24px 28px;">
            <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a84c;">${escapedSiteName}</p>
            <h1 style="margin:10px 0 0;font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:30px;color:#f5f0e8;">
              Message From ${escapedSiteName}
            </h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
              Hello ${escapeHtml(customerName)},
            </p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
              ${escapeHtml(message).replaceAll("\n", "<br />")}
            </p>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#56705f;">
              Sent by ${escapeHtml(actorLabel)} from ${escapedSiteName}.
            </p>
          </div>
        </div>
      </div>
    `,
    replyTo: replyTo ?? undefined,
    subject,
    text: `Hello ${customerName},\n\n${message}\n\nSent by ${actorLabel} from ${branding.siteName}.`,
    to: [customer.email]
  });

  await createAdminAuditLog({
    action: "customer.email.sent",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: userId,
    entityType: "customer",
    metadata: {
      replyTo,
      subject
    },
    targetUserId: userId
  });
}

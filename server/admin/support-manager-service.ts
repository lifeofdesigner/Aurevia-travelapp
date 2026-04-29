import "server-only";

import {hasPermission, PERMISSIONS} from "@/lib/permissions";
import {getSiteBranding} from "@/server/brand/site-branding";
import {createEmailProvider} from "@/server/email/provider";
import {createSupabaseAdminClient} from "@/server/supabase/admin";

import {createAdminAuditLog} from "./audit";
import {type AdminStaffIdentity} from "@/features/admin/types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function assertSupportManagerAccess(actor: AdminStaffIdentity) {
  if (!hasPermission(actor.role, PERMISSIONS.bookingManageAll)) {
    throw new Error("Forbidden.");
  }
}

export async function createAdminSupportReply({
  actor,
  messageBody,
  replyTo,
  ticketId
}: {
  actor: AdminStaffIdentity;
  messageBody: string;
  replyTo: string | null;
  ticketId: string;
}) {
  assertSupportManagerAccess(actor);

  const admin = createSupabaseAdminClient();
  const [ticketResult, actorProfileResult] = await Promise.all([
    admin
      .from("support_tickets")
      .select("id, ticket_number, subject, owner_user_id")
      .eq("id", ticketId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("user_id, email, first_name, last_name")
      .eq("user_id", actor.userId)
      .maybeSingle()
  ]);
  const ticket =
    (ticketResult.data as
      | {
          id: string;
          owner_user_id: string;
          subject: string;
          ticket_number: string;
        }
      | null) ?? null;

  if (!ticket) {
    throw new Error("Support ticket not found.");
  }

  const customerResult = await admin
    .from("profiles")
    .select("user_id, email, first_name, last_name")
    .eq("user_id", ticket.owner_user_id)
    .maybeSingle();
  const customer =
    (customerResult.data as
      | {
          email: string;
          first_name: string | null;
          last_name: string | null;
          user_id: string;
        }
      | null) ?? null;

  if (!customer) {
    throw new Error("Support ticket customer could not be found.");
  }

  const actorProfile =
    (actorProfileResult.data as
      | {
          email: string;
          first_name: string | null;
          last_name: string | null;
          user_id: string;
        }
      | null) ?? null;
  const actorLabel =
    [actorProfile?.first_name, actorProfile?.last_name].filter(Boolean).join(" ") ||
    actor.email;
  const customerName =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;
  const branding = await getSiteBranding();
  const escapedSiteName = escapeHtml(branding.siteName);
  const provider = createEmailProvider();

  await provider.send({
    html: `
      <div style="font-family:Manrope,Arial,sans-serif;background:#f7f3ec;padding:32px;color:#1c3d2e;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e8e0d0;border-radius:8px;overflow:hidden;">
          <div style="background:#1c3d2e;padding:24px 28px;">
            <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#c9a84c;">${escapedSiteName} Support</p>
            <h1 style="margin:10px 0 0;font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:30px;color:#f5f0e8;">
              Update for Ticket ${escapeHtml(ticket.ticket_number)}
            </h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
              Hello ${escapeHtml(customerName)},
            </p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#56705f;">
              ${escapeHtml(messageBody).replaceAll("\n", "<br />")}
            </p>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#56705f;">
              Sent by ${escapeHtml(actorLabel)} from ${escapedSiteName}.
            </p>
          </div>
        </div>
      </div>
    `,
    replyTo: replyTo ?? undefined,
    subject: `${branding.siteName} Support: ${ticket.subject}`,
    text: `Hello ${customerName},\n\n${messageBody}\n\nTicket: ${ticket.ticket_number}\nSent by ${actorLabel}.`,
    to: [customer.email]
  });

  const now = new Date().toISOString();
  const insertResult = await admin
    .from("support_ticket_messages")
    .insert({
      author_user_id: actor.userId,
      delivery_channel: "email",
      emailed_at: now,
      message_body: messageBody,
      ticket_id: ticket.id,
      visibility: "customer"
    })
    .select("id")
    .maybeSingle();

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  const updateResult = await admin
    .from("support_tickets")
    .update({
      last_admin_reply_at: now,
      status: "waiting_on_customer"
    })
    .eq("id", ticket.id)
    .is("deleted_at", null);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  await createAdminAuditLog({
    action: "support_ticket.reply_sent",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: ticket.id,
    entityType: "support_ticket",
    metadata: {
      replyTo
    },
    targetUserId: ticket.owner_user_id
  });
}

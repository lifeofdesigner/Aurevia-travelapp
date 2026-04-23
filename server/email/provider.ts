import "server-only";

import {Resend} from "resend";
import {z} from "zod";

import {getServerEnv} from "@/lib/env/server";

export const emailAddressSchema = z.string().email();

export const emailMessageSchema = z.object({
  to: z.array(emailAddressSchema).min(1),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().min(1).optional(),
  replyTo: emailAddressSchema.optional()
});

export type EmailMessage = z.infer<typeof emailMessageSchema>;

export type EmailSendResult = {
  provider: "resend" | "development";
  id: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

class DevelopmentEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    emailMessageSchema.parse(message);

    return {
      provider: "development",
      id: `dev-email-${Date.now()}`
    };
  }
}

class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly resend: Resend,
    private readonly from: string
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const parsedMessage = emailMessageSchema.parse(message);
    const response = await this.resend.emails.send({
      from: this.from,
      to: parsedMessage.to,
      subject: parsedMessage.subject,
      html: parsedMessage.html,
      text: parsedMessage.text,
      replyTo: parsedMessage.replyTo
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      provider: "resend",
      id: response.data?.id ?? "resend-email"
    };
  }
}

export function createEmailProvider(): EmailProvider {
  const env = getServerEnv();

  if (!env.RESEND_API_KEY) {
    return new DevelopmentEmailProvider();
  }

  return new ResendEmailProvider(new Resend(env.RESEND_API_KEY), env.EMAIL_FROM);
}

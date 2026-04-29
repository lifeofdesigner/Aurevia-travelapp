import {z} from "zod";

import {
  LIVE_CHAT_AGENT_ROLES,
  LIVE_CHAT_AGENT_STATUSES,
  LIVE_CHAT_PRIORITIES,
  LIVE_CHAT_STATUSES
} from "@/lib/live-chat/types";

const nullableTrimmedString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const attachmentSchema = z.object({
  byteSize: z.number().int().nonnegative(),
  fileName: z.string().trim().min(1).max(180),
  id: z.string().uuid(),
  mimeType: z.string().trim().min(1).max(120)
});

export const liveChatStartConversationSchema = z.object({
  company: nullableTrimmedString,
  currentPageUrl: nullableTrimmedString,
  departmentId: z.string().uuid().nullable().optional().transform((value) => value ?? null),
  email: z.union([z.string().trim().email(), z.literal(""), z.null()]).optional().transform((value) => {
    if (!value || value === "") {
      return null;
    }

    return value;
  }),
  initialPageUrl: nullableTrimmedString,
  message: z.string().trim().min(1).max(4000),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  name: nullableTrimmedString,
  phone: nullableTrimmedString,
  referrerUrl: nullableTrimmedString,
  subject: nullableTrimmedString
});

export const liveChatVisitorMessageSchema = z.object({
  attachments: z.array(attachmentSchema).max(5).optional().default([]),
  body: z.string().trim().max(4000).nullable().optional().transform((value) => value ?? null),
  currentPageUrl: nullableTrimmedString
}).superRefine((value, context) => {
  if (!value.body && value.attachments.length === 0) {
    context.addIssue({
      code: "custom",
      message: "A message or attachment is required."
    });
  }
});

export const liveChatRatingSchema = z.object({
  feedback: nullableTrimmedString,
  rating: z.number().int().min(1).max(5)
});

export const liveChatAgentMessageSchema = z.object({
  attachments: z.array(attachmentSchema).max(5).optional().default([]),
  body: z.string().trim().max(6000).nullable().optional().transform((value) => value ?? null),
  isInternalNote: z.boolean().optional().default(false)
}).superRefine((value, context) => {
  if (!value.body && value.attachments.length === 0) {
    context.addIssue({
      code: "custom",
      message: "A reply, note, or attachment is required."
    });
  }
});

export const liveChatConversationUpdateSchema = z.object({
  assignedAgentId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  priority: z.enum(LIVE_CHAT_PRIORITIES).optional(),
  status: z.enum(LIVE_CHAT_STATUSES).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional()
});

export const liveChatAgentSchema = z.object({
  avatarUrl: nullableTrimmedString,
  canManageAgents: z.boolean().optional().default(false),
  canManageSettings: z.boolean().optional().default(false),
  canViewAllChats: z.boolean().optional().default(false),
  departmentIds: z.array(z.string().uuid()).optional().default([]),
  displayName: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  isActive: z.boolean().optional().default(true),
  maxActiveChats: z.number().int().min(1).max(50).optional().default(5),
  role: z.enum(LIVE_CHAT_AGENT_ROLES).optional().default("agent"),
  status: z.enum(LIVE_CHAT_AGENT_STATUSES).optional().default("offline"),
  userId: z.string().uuid()
});

export const liveChatAgentStatusSchema = z.object({
  status: z.enum(LIVE_CHAT_AGENT_STATUSES)
});

export const liveChatDepartmentSchema = z.object({
  description: nullableTrimmedString,
  isActive: z.boolean().optional().default(true),
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sortOrder: z.number().int().optional().default(0)
});

export const liveChatCannedResponseSchema = z.object({
  body: z.string().trim().min(1).max(6000),
  departmentId: z.string().uuid().nullable().optional().transform((value) => value ?? null),
  isActive: z.boolean().optional().default(true),
  shortcut: nullableTrimmedString,
  title: z.string().trim().min(1).max(140)
});

export const liveChatSettingsSchema = z.object({
  aiAutoReplyEnabled: z.boolean().optional(),
  aiEnabled: z.boolean().optional(),
  aiHandoffRequired: z.boolean().optional(),
  aiSuggestionsEnabled: z.boolean().optional(),
  allowAttachments: z.boolean().optional(),
  autoAssignmentEnabled: z.boolean().optional(),
  brandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  browserNotificationsEnabled: z.boolean().optional(),
  businessHoursEnabled: z.boolean().optional(),
  csatEnabled: z.boolean().optional(),
  dataRetentionDays: z.number().int().min(30).max(3650).optional(),
  defaultDepartmentId: z.string().uuid().nullable().optional(),
  maxAttachmentSizeMb: z.number().int().min(1).max(25).optional(),
  offlineMessage: optionalTrimmedString,
  proactiveChatEnabled: z.boolean().optional(),
  requirePrechatEmail: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  transcriptEnabled: z.boolean().optional(),
  typicalReplyMinutes: z.number().int().min(1).max(1440).optional(),
  welcomeMessage: optionalTrimmedString,
  widgetEnabled: z.boolean().optional(),
  widgetPosition: z.enum(["bottom-left", "bottom-right"]).optional()
});

export const liveChatAutomationRuleSchema = z.object({
  actions: z.record(z.string(), z.unknown()).optional().default({}),
  conditions: z.record(z.string(), z.unknown()).optional().default({}),
  isActive: z.boolean().optional().default(true),
  name: z.string().trim().min(1).max(140),
  priority: z.number().int().min(1).max(1000).optional().default(100),
  triggerType: z.enum([
    "page_visit",
    "new_conversation",
    "first_message",
    "offline",
    "no_agent_available",
    "keyword",
    "time_waiting"
  ])
});

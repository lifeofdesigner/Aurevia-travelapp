import "server-only";

import {createHash, randomBytes} from "crypto";

import {getServerEnv} from "@/lib/env/server";
import {
  type LiveChatAdminBootstrap,
  type LiveChatAgent,
  type LiveChatAgentRole,
  type LiveChatAgentStatus,
  type LiveChatAnalytics,
  type LiveChatAttachment,
  type LiveChatAutomationRule,
  type LiveChatCannedResponse,
  type LiveChatConversation,
  type LiveChatConversationDetail,
  type LiveChatDepartment,
  type LiveChatMessage,
  type LiveChatPriority,
  type LiveChatPublicConfig,
  type LiveChatSettings,
  type LiveChatStatus
} from "@/lib/live-chat/types";
import {type AdminStaffIdentity} from "@/features/admin/types";
import {createAdminAuditLog} from "@/server/admin/audit";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {type Json} from "@/types/supabase";

const TOKEN_MIN_LENGTH = 32;
const MAX_MESSAGE_BYTES = 32_000;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

type ProfileRow = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string | null;
  user_id: string;
};

type DepartmentRow = {
  description: string | null;
  id: string;
  is_active: boolean;
  name: string;
  slug: string;
  sort_order: number;
};

type SettingsRow = {
  ai_enabled: boolean;
  ai_suggestions_enabled: boolean;
  allow_attachments: boolean;
  auto_assignment_enabled: boolean;
  brand_color: string;
  browser_notifications_enabled: boolean;
  business_hours_enabled: boolean;
  csat_enabled: boolean;
  default_department_id: string | null;
  max_attachment_size_mb: number;
  offline_message: string;
  proactive_chat_enabled: boolean;
  require_prechat_email: boolean;
  sound_enabled: boolean;
  transcript_enabled: boolean;
  typical_reply_minutes: number;
  welcome_message: string;
  widget_enabled: boolean;
  widget_position: "bottom-left" | "bottom-right";
};

type VisitorRow = {
  city: string | null;
  company: string | null;
  country: string | null;
  email: string | null;
  id: string;
  last_seen_at: string;
  name: string | null;
  phone: string | null;
  user_agent: string | null;
  user_id: string | null;
};

type ConversationRow = {
  assigned_agent_id: string | null;
  closed_at: string | null;
  created_at: string;
  current_page_url: string | null;
  department_id: string | null;
  first_response_at: string | null;
  id: string;
  initial_page_url: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  priority: LiveChatPriority;
  referrer_url: string | null;
  resolved_at: string | null;
  source: string;
  status: LiveChatStatus;
  subject: string | null;
  tags: string[];
  unread_by_agents: number;
  unread_by_visitor: number;
  user_id: string | null;
  visitor_email: string | null;
  visitor_id: string;
  visitor_name: string | null;
  waiting_since: string | null;
};

type AgentRow = {
  avatar_url: string | null;
  can_manage_agents: boolean;
  can_manage_settings: boolean;
  can_view_all_chats: boolean;
  display_name: string;
  email: string;
  id: string;
  is_active: boolean;
  last_active_at: string | null;
  max_active_chats: number;
  role: LiveChatAgentRole;
  status: LiveChatAgentStatus;
  user_id: string;
};

type MessageRow = {
  attachments: Json;
  body: string | null;
  created_at: string;
  id: string;
  is_internal_note: boolean;
  message_type: LiveChatMessage["messageType"];
  sender_agent_id: string | null;
  sender_type: LiveChatMessage["sender"]["type"];
  sender_user_id: string | null;
  sender_visitor_id: string | null;
};

type RatingRow = {
  created_at: string;
  feedback: string | null;
  id: string;
  rating: number;
};

type CannedResponseRow = {
  body: string;
  department_id: string | null;
  id: string;
  is_active: boolean;
  shortcut: string | null;
  title: string;
  usage_count: number;
};

type AutomationRuleRow = {
  actions: Json;
  conditions: Json;
  id: string;
  is_active: boolean;
  name: string;
  priority: number;
  trigger_type: string;
};

type UploadRow = {
  bucket_name: string;
  byte_size: number;
  file_name: string;
  id: string;
  linked_entity_id: string | null;
  metadata: Json;
  mime_type: string;
  storage_path: string;
};

function toJson(value: unknown) {
  return value as Json;
}

function assertVisitorToken(token: string | null | undefined) {
  const normalized = token?.trim();

  if (!normalized || normalized.length < TOKEN_MIN_LENGTH) {
    throw new Error("A valid chat session token is required.");
  }

  return normalized;
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashOptionalValue(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? hashValue(normalized) : null;
}

function normalizeNullable(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildPersonName(profile: ProfileRow | null, fallback: string) {
  if (!profile) {
    return fallback;
  }

  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : profile.email;
}

function buildActorName(actor: AdminStaffIdentity) {
  return [actor.firstName, actor.lastName].filter(Boolean).join(" ") || actor.email;
}

function isLiveChatManager(actor: AdminStaffIdentity) {
  return actor.role === "owner" || actor.role === "admin";
}

function mapDepartment(row: DepartmentRow): LiveChatDepartment {
  return {
    description: row.description,
    id: row.id,
    isActive: row.is_active,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order
  };
}

function mapSettings(row: SettingsRow | null): LiveChatSettings {
  return {
    aiEnabled: row?.ai_enabled ?? false,
    aiSuggestionsEnabled: row?.ai_suggestions_enabled ?? false,
    allowAttachments: row?.allow_attachments ?? true,
    autoAssignmentEnabled: row?.auto_assignment_enabled ?? true,
    brandColor: row?.brand_color ?? "#1c3d2e",
    browserNotificationsEnabled: row?.browser_notifications_enabled ?? true,
    businessHoursEnabled: row?.business_hours_enabled ?? false,
    csatEnabled: row?.csat_enabled ?? true,
    defaultDepartmentId: row?.default_department_id ?? null,
    maxAttachmentSizeMb: row?.max_attachment_size_mb ?? 5,
    offlineMessage: row?.offline_message ?? "We are away right now, but send a message and we will reply soon.",
    proactiveChatEnabled: row?.proactive_chat_enabled ?? true,
    requirePrechatEmail: row?.require_prechat_email ?? true,
    soundEnabled: row?.sound_enabled ?? true,
    transcriptEnabled: row?.transcript_enabled ?? true,
    typicalReplyMinutes: row?.typical_reply_minutes ?? 15,
    welcomeMessage: row?.welcome_message ?? "Hi, how can we help with your trip today?",
    widgetEnabled: row?.widget_enabled ?? true,
    widgetPosition: row?.widget_position ?? "bottom-right"
  };
}

function mapAgent(row: AgentRow, departmentIds: string[] = []): LiveChatAgent {
  return {
    avatarUrl: row.avatar_url,
    canManageAgents: row.can_manage_agents,
    canManageSettings: row.can_manage_settings,
    canViewAllChats: row.can_view_all_chats,
    departmentIds,
    displayName: row.display_name,
    email: row.email,
    id: row.id,
    isActive: row.is_active,
    lastActiveAt: row.last_active_at,
    maxActiveChats: row.max_active_chats,
    role: row.role,
    status: row.status,
    userId: row.user_id
  };
}

function mapCannedResponse(row: CannedResponseRow): LiveChatCannedResponse {
  return {
    body: row.body,
    departmentId: row.department_id,
    id: row.id,
    isActive: row.is_active,
    shortcut: row.shortcut,
    title: row.title,
    usageCount: row.usage_count
  };
}

function mapAutomationRule(row: AutomationRuleRow): LiveChatAutomationRule {
  return {
    actions: row.actions,
    conditions: row.conditions,
    id: row.id,
    isActive: row.is_active,
    name: row.name,
    priority: row.priority,
    triggerType: row.trigger_type
  };
}

function attachmentArray(value: Json): LiveChatAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const record = entry as Record<string, Json | undefined>;
    const id = typeof record.id === "string" ? record.id : null;
    const fileName = typeof record.fileName === "string" ? record.fileName : null;
    const mimeType = typeof record.mimeType === "string" ? record.mimeType : null;
    const byteSize = typeof record.byteSize === "number" ? record.byteSize : null;

    if (!id || !fileName || !mimeType || byteSize === null) {
      return [];
    }

    return [{byteSize, fileName, id, mimeType}];
  });
}

function mapMessage(row: MessageRow, agentMap: Map<string, AgentRow>, visitor: VisitorRow | null): LiveChatMessage {
  const agent = row.sender_agent_id ? agentMap.get(row.sender_agent_id) ?? null : null;
  const visitorLabel = visitor?.name ?? visitor?.email ?? "Visitor";

  return {
    attachments: attachmentArray(row.attachments),
    body: row.body,
    createdAt: row.created_at,
    id: row.id,
    isInternalNote: row.is_internal_note,
    messageType: row.message_type,
    sender: {
      avatarUrl: agent?.avatar_url ?? null,
      id: row.sender_agent_id ?? row.sender_user_id ?? row.sender_visitor_id,
      label:
        row.sender_type === "agent"
          ? agent?.display_name ?? "Support"
          : row.sender_type === "system"
            ? "System"
            : row.sender_type === "bot"
              ? "Assistant"
              : visitorLabel,
      type: row.sender_type
    }
  };
}

function mapConversation({
  agents,
  conversation,
  departments,
  visitor
}: {
  agents: Map<string, AgentRow>;
  conversation: ConversationRow;
  departments: Map<string, DepartmentRow>;
  visitor: VisitorRow;
}): LiveChatConversation {
  const assignedAgent = conversation.assigned_agent_id
    ? agents.get(conversation.assigned_agent_id) ?? null
    : null;
  const department = conversation.department_id
    ? departments.get(conversation.department_id) ?? null
    : null;

  return {
    assignedAgentId: conversation.assigned_agent_id,
    assignedAgentName: assignedAgent?.display_name ?? null,
    closedAt: conversation.closed_at,
    createdAt: conversation.created_at,
    currentPageUrl: conversation.current_page_url,
    departmentId: conversation.department_id,
    departmentName: department?.name ?? null,
    firstResponseAt: conversation.first_response_at,
    id: conversation.id,
    initialPageUrl: conversation.initial_page_url,
    lastMessageAt: conversation.last_message_at,
    lastMessagePreview: conversation.last_message_preview,
    priority: conversation.priority,
    referrerUrl: conversation.referrer_url,
    resolvedAt: conversation.resolved_at,
    source: conversation.source,
    status: conversation.status,
    subject: conversation.subject,
    tags: conversation.tags ?? [],
    unreadByAgents: conversation.unread_by_agents,
    unreadByVisitor: conversation.unread_by_visitor,
    visitor: {
      city: visitor.city,
      company: visitor.company,
      country: visitor.country,
      email: visitor.email ?? conversation.visitor_email,
      id: visitor.id,
      lastSeenAt: visitor.last_seen_at,
      name: visitor.name ?? conversation.visitor_name,
      phone: visitor.phone,
      userAgent: visitor.user_agent,
      userId: visitor.user_id
    },
    waitingSince: conversation.waiting_since
  };
}

async function getProfile(userId: string | null | undefined) {
  if (!userId) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("profiles")
    .select("user_id, email, first_name, last_name, phone")
    .eq("user_id", userId)
    .maybeSingle();

  return (result.data as ProfileRow | null) ?? null;
}

async function getSettingsAndDepartments(admin: SupabaseAdmin) {
  const [settingsResult, departmentsResult] = await Promise.all([
    admin.from("live_chat_settings").select("*").eq("id", "default").maybeSingle(),
    admin
      .from("live_chat_departments")
      .select("id, name, slug, description, is_active, sort_order")
      .order("sort_order", {ascending: true})
      .order("name", {ascending: true})
  ]);

  return {
    departments: ((departmentsResult.data as DepartmentRow[] | null) ?? []).map(mapDepartment),
    settings: mapSettings((settingsResult.data as SettingsRow | null) ?? null)
  };
}

async function getAgentDepartmentIds(admin: SupabaseAdmin, agentIds: string[]) {
  if (agentIds.length === 0) {
    return new Map<string, string[]>();
  }

  const result = await admin
    .from("live_chat_agent_departments")
    .select("agent_id, department_id")
    .in("agent_id", agentIds);
  const map = new Map<string, string[]>();

  for (const row of ((result.data as Array<{agent_id: string; department_id: string}> | null) ?? [])) {
    const existing = map.get(row.agent_id) ?? [];
    existing.push(row.department_id);
    map.set(row.agent_id, existing);
  }

  return map;
}

async function listAgents(admin: SupabaseAdmin) {
  const result = await admin
    .from("live_chat_agents")
    .select("*")
    .order("display_name", {ascending: true});
  const rows = (result.data as AgentRow[] | null) ?? [];
  const departmentMap = await getAgentDepartmentIds(admin, rows.map((row) => row.id));

  return rows.map((row) => mapAgent(row, departmentMap.get(row.id) ?? []));
}

async function getAgentForActor(admin: SupabaseAdmin, actor: AdminStaffIdentity) {
  const lookup = await admin
    .from("live_chat_agents")
    .select("*")
    .eq("user_id", actor.userId)
    .maybeSingle();
  let agent = (lookup.data as AgentRow | null) ?? null;

  if (!agent) {
    const role: LiveChatAgentRole =
      actor.role === "owner" ? "owner" : actor.role === "admin" ? "admin" : "agent";
    const insert = await admin
      .from("live_chat_agents")
      .insert({
        can_manage_agents: actor.role === "owner" || actor.role === "admin",
        can_manage_settings: actor.role === "owner" || actor.role === "admin",
        can_view_all_chats: actor.role === "owner" || actor.role === "admin",
        display_name: buildActorName(actor),
        email: actor.email,
        is_active: true,
        max_active_chats: actor.role === "owner" || actor.role === "admin" ? 10 : 5,
        role,
        status: "online",
        user_id: actor.userId
      })
      .select("*")
      .maybeSingle();

    if (insert.error || !insert.data) {
      throw new Error(insert.error?.message ?? "Unable to prepare live chat agent access.");
    }

    agent = insert.data as AgentRow;

    const defaultDepartment = await admin
      .from("live_chat_departments")
      .select("id")
      .eq("slug", "general-support")
      .maybeSingle();
    const defaultDepartmentId = (defaultDepartment.data as {id?: string} | null)?.id;

    if (defaultDepartmentId) {
      await admin.from("live_chat_agent_departments").upsert(
        {
          agent_id: agent.id,
          department_id: defaultDepartmentId
        },
        {onConflict: "agent_id,department_id"}
      );
    }
  }

  await admin
    .from("live_chat_agents")
    .update({last_active_at: new Date().toISOString()})
    .eq("id", agent.id);

  return agent;
}

async function getVisitorForToken({
  admin,
  token,
  userId,
  profile,
  ip,
  userAgent,
  fields
}: {
  admin: SupabaseAdmin;
  fields?: {
    company?: string | null;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  };
  ip?: string | null;
  profile?: ProfileRow | null;
  token: string;
  userAgent?: string | null;
  userId?: string | null;
}) {
  const tokenHash = hashValue(assertVisitorToken(token));
  const byToken = await admin
    .from("live_chat_visitors")
    .select("*")
    .eq("anonymous_token_hash", tokenHash)
    .maybeSingle();
  let visitor = (byToken.data as VisitorRow | null) ?? null;
  const now = new Date().toISOString();
  const payload = {
    anonymous_token_hash: tokenHash,
    company: normalizeNullable(fields?.company) ?? visitor?.company ?? null,
    email: normalizeNullable(fields?.email) ?? profile?.email ?? visitor?.email ?? null,
    ip_hash: hashOptionalValue(ip),
    last_seen_at: now,
    metadata: toJson({}),
    name: normalizeNullable(fields?.name) ?? (profile ? buildPersonName(profile, profile.email) : visitor?.name ?? null),
    phone: normalizeNullable(fields?.phone) ?? profile?.phone ?? visitor?.phone ?? null,
    user_agent: normalizeNullable(userAgent) ?? visitor?.user_agent ?? null,
    user_id: userId ?? visitor?.user_id ?? null
  };

  if (!visitor && userId) {
    const byUser = await admin
      .from("live_chat_visitors")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    visitor = (byUser.data as VisitorRow | null) ?? null;
  }

  if (visitor) {
    const update = await admin
      .from("live_chat_visitors")
      .update(payload)
      .eq("id", visitor.id)
      .select("*")
      .maybeSingle();

    if (update.error || !update.data) {
      throw new Error(update.error?.message ?? "Unable to update visitor session.");
    }

    return update.data as VisitorRow;
  }

  const insert = await admin
    .from("live_chat_visitors")
    .insert({
      ...payload,
      first_seen_at: now
    })
    .select("*")
    .maybeSingle();

  if (insert.error || !insert.data) {
    throw new Error(insert.error?.message ?? "Unable to start visitor session.");
  }

  return insert.data as VisitorRow;
}

async function getVisitorConversationOrThrow({
  admin,
  conversationId,
  token,
  userId
}: {
  admin: SupabaseAdmin;
  conversationId: string;
  token: string;
  userId?: string | null;
}) {
  const tokenHash = hashValue(assertVisitorToken(token));
  const result = await admin
    .from("live_chat_conversations")
    .select("*, live_chat_visitors!inner(*)")
    .eq("id", conversationId)
    .maybeSingle();
  const row = result.data as (ConversationRow & {live_chat_visitors: VisitorRow}) | null;

  if (!row) {
    throw new Error("Conversation not found.");
  }

  const visitor = row.live_chat_visitors;
  const isTokenOwner = visitor && "anonymous_token_hash" in visitor
    ? (visitor as VisitorRow & {anonymous_token_hash?: string | null}).anonymous_token_hash === tokenHash
    : false;
  const isUserOwner = Boolean(userId && row.user_id === userId);

  if (!isTokenOwner && !isUserOwner) {
    throw new Error("Forbidden.");
  }

  return {
    conversation: row,
    visitor
  };
}

async function getConversationBundle(admin: SupabaseAdmin, conversationRows: ConversationRow[]) {
  const visitorIds = Array.from(new Set(conversationRows.map((row) => row.visitor_id)));
  const agentIds = Array.from(
    new Set(conversationRows.map((row) => row.assigned_agent_id).filter((value): value is string => Boolean(value)))
  );
  const departmentIds = Array.from(
    new Set(conversationRows.map((row) => row.department_id).filter((value): value is string => Boolean(value)))
  );

  const [visitorsResult, agentsResult, departmentsResult] = await Promise.all([
    visitorIds.length
      ? admin
          .from("live_chat_visitors")
          .select("id, user_id, name, email, phone, company, country, city, user_agent, last_seen_at")
          .in("id", visitorIds)
      : Promise.resolve({data: []}),
    agentIds.length
      ? admin.from("live_chat_agents").select("*").in("id", agentIds)
      : Promise.resolve({data: []}),
    departmentIds.length
      ? admin
          .from("live_chat_departments")
          .select("id, name, slug, description, is_active, sort_order")
          .in("id", departmentIds)
      : Promise.resolve({data: []})
  ]);

  return {
    agents: new Map(((agentsResult.data as AgentRow[] | null) ?? []).map((row) => [row.id, row])),
    departments: new Map(((departmentsResult.data as DepartmentRow[] | null) ?? []).map((row) => [row.id, row])),
    visitors: new Map(((visitorsResult.data as VisitorRow[] | null) ?? []).map((row) => [row.id, row]))
  };
}

async function mapConversations(admin: SupabaseAdmin, rows: ConversationRow[]) {
  const bundle = await getConversationBundle(admin, rows);

  return rows.flatMap((row) => {
    const visitor = bundle.visitors.get(row.visitor_id);

    if (!visitor) {
      return [];
    }

    return [mapConversation({
      agents: bundle.agents,
      conversation: row,
      departments: bundle.departments,
      visitor
    })];
  });
}

async function isBusinessHoursAvailable(admin: SupabaseAdmin, departmentId: string | null, settings: LiveChatSettings) {
  if (!settings.businessHoursEnabled) {
    return true;
  }

  let query = admin
    .from("live_chat_business_hours")
    .select("weekday, timezone, opens_at, closes_at, is_closed")
    .eq("weekday", getWeekdayInTimeZone("UTC"));

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  const result = await query.limit(1).maybeSingle();
  const row = (result.data as {closes_at: string; is_closed: boolean; opens_at: string; timezone: string; weekday: number} | null) ?? null;

  if (!row) {
    return true;
  }

  if (row.is_closed) {
    return false;
  }

  const now = getTimeInTimeZone(row.timezone);
  return now >= row.opens_at.slice(0, 5) && now <= row.closes_at.slice(0, 5);
}

function getWeekdayInTimeZone(timeZone: string) {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  }).format(new Date());
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };

  return map[value] ?? new Date().getUTCDay();
}

function getTimeInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

async function countOnlineAgents(admin: SupabaseAdmin, departmentId?: string | null) {
  let agents = await admin
    .from("live_chat_agents")
    .select("id")
    .eq("is_active", true)
    .eq("status", "online");
  let rows = (agents.data as Array<{id: string}> | null) ?? [];

  if (departmentId && rows.length > 0) {
    const departmentRows = await admin
      .from("live_chat_agent_departments")
      .select("agent_id")
      .eq("department_id", departmentId)
      .in("agent_id", rows.map((row) => row.id));
    const allowed = new Set(((departmentRows.data as Array<{agent_id: string}> | null) ?? []).map((row) => row.agent_id));
    rows = rows.filter((row) => allowed.has(row.id));
  }

  return rows.length;
}

async function selectAgentForConversation(admin: SupabaseAdmin, departmentId: string | null) {
  const agentsResult = await admin
    .from("live_chat_agents")
    .select("*")
    .eq("is_active", true)
    .eq("status", "online")
    .order("last_active_at", {ascending: true, nullsFirst: true});
  let agents = (agentsResult.data as AgentRow[] | null) ?? [];

  if (departmentId && agents.length > 0) {
    const departments = await admin
      .from("live_chat_agent_departments")
      .select("agent_id")
      .eq("department_id", departmentId)
      .in("agent_id", agents.map((agent) => agent.id));
    const allowed = new Set(((departments.data as Array<{agent_id: string}> | null) ?? []).map((row) => row.agent_id));
    agents = agents.filter((agent) => allowed.has(agent.id));
  }

  if (agents.length === 0) {
    return null;
  }

  const conversationResult = await admin
    .from("live_chat_conversations")
    .select("assigned_agent_id")
    .in("assigned_agent_id", agents.map((agent) => agent.id))
    .in("status", ["new", "open", "pending"]);
  const counts = new Map<string, number>();

  for (const row of ((conversationResult.data as Array<{assigned_agent_id: string | null}> | null) ?? [])) {
    if (row.assigned_agent_id) {
      counts.set(row.assigned_agent_id, (counts.get(row.assigned_agent_id) ?? 0) + 1);
    }
  }

  return agents
    .filter((agent) => (counts.get(agent.id) ?? 0) < agent.max_active_chats)
    .sort((left, right) => (counts.get(left.id) ?? 0) - (counts.get(right.id) ?? 0))[0] ?? null;
}

async function assertVisitorRateLimit(admin: SupabaseAdmin, visitorId: string, action: "conversation" | "message") {
  const now = Date.now();
  const since = new Date(now - (action === "conversation" ? 60 * 60 * 1000 : 60 * 1000)).toISOString();

  if (action === "conversation") {
    const result = await admin
      .from("live_chat_conversations")
      .select("id")
      .eq("visitor_id", visitorId)
      .gte("created_at", since);
    const count = ((result.data as Array<{id: string}> | null) ?? []).length;

    if (count >= 10) {
      throw new Error("Please wait before starting another chat.");
    }

    return;
  }

  const result = await admin
    .from("live_chat_messages")
    .select("id")
    .eq("sender_visitor_id", visitorId)
    .gte("created_at", since);
  const count = ((result.data as Array<{id: string}> | null) ?? []).length;

  if (count >= 20) {
    throw new Error("Please slow down before sending another message.");
  }
}

async function createSystemMessage(admin: SupabaseAdmin, conversationId: string, body: string) {
  await admin.from("live_chat_messages").insert({
    body,
    conversation_id: conversationId,
    message_type: "system",
    sender_type: "system"
  });
}

async function applyKeywordAutomation(admin: SupabaseAdmin, conversationId: string, message: string) {
  const rulesResult = await admin
    .from("live_chat_automation_rules")
    .select("*")
    .eq("is_active", true)
    .eq("trigger_type", "keyword")
    .order("priority", {ascending: true});
  const rules = (rulesResult.data as AutomationRuleRow[] | null) ?? [];
  const lowerMessage = message.toLowerCase();

  for (const rule of rules) {
    const conditions = rule.conditions as Record<string, Json | undefined>;
    const actions = rule.actions as Record<string, Json | undefined>;
    const keywords = Array.isArray(conditions.keywords)
      ? conditions.keywords.filter((entry): entry is string => typeof entry === "string")
      : [];

    if (keywords.length === 0 || !keywords.some((keyword) => lowerMessage.includes(keyword.toLowerCase()))) {
      continue;
    }

    const tags = Array.isArray(actions.tags)
      ? actions.tags.filter((entry): entry is string => typeof entry === "string")
      : [];

    if (tags.length > 0) {
      const current = await admin
        .from("live_chat_conversations")
        .select("tags")
        .eq("id", conversationId)
        .maybeSingle();
      const existing = ((current.data as {tags?: string[] | null} | null)?.tags ?? []);
      await admin
        .from("live_chat_conversations")
        .update({tags: Array.from(new Set([...existing, ...tags]))})
        .eq("id", conversationId);
    }
  }
}

export function createLiveChatVisitorToken() {
  return randomBytes(32).toString("hex");
}

export async function getLiveChatPublicConfig({
  ip,
  token,
  userAgent,
  userId
}: {
  ip?: string | null;
  token: string;
  userAgent?: string | null;
  userId?: string | null;
}): Promise<LiveChatPublicConfig> {
  const admin = createSupabaseAdminClient();
  const profile = await getProfile(userId);
  const visitor = await getVisitorForToken({
    admin,
    ip,
    profile,
    token,
    userAgent,
    userId
  });
  const {departments, settings} = await getSettingsAndDepartments(admin);
  const activeResult = await admin
    .from("live_chat_conversations")
    .select("id")
    .eq("visitor_id", visitor.id)
    .in("status", ["new", "open", "pending", "resolved"])
    .order("last_message_at", {ascending: false})
    .limit(1)
    .maybeSingle();
  const activeConversationId = (activeResult.data as {id?: string} | null)?.id ?? null;
  const departmentId = settings.defaultDepartmentId ?? departments[0]?.id ?? null;

  return {
    activeConversationId,
    businessHoursAvailable: await isBusinessHoursAvailable(admin, departmentId, settings),
    departments: departments.filter((department) => department.isActive),
    onlineAgentCount: await countOnlineAgents(admin, departmentId),
    settings,
    visitor: {
      email: visitor.email,
      name: visitor.name
    }
  };
}

export async function startLiveChatConversation({
  company,
  currentPageUrl,
  departmentId,
  email,
  initialPageUrl,
  ip,
  message,
  metadata,
  name,
  phone,
  referrerUrl,
  subject,
  token,
  userAgent,
  userId
}: {
  company?: string | null;
  currentPageUrl?: string | null;
  departmentId?: string | null;
  email?: string | null;
  initialPageUrl?: string | null;
  ip?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
  name?: string | null;
  phone?: string | null;
  referrerUrl?: string | null;
  subject?: string | null;
  token: string;
  userAgent?: string | null;
  userId?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const profile = await getProfile(userId);
  const visitor = await getVisitorForToken({
    admin,
    fields: {company, email, name, phone},
    ip,
    profile,
    token,
    userAgent,
    userId
  });
  await assertVisitorRateLimit(admin, visitor.id, "conversation");

  const {departments, settings} = await getSettingsAndDepartments(admin);
  const requestedDepartment = departmentId && departments.some((department) => department.id === departmentId)
    ? departmentId
    : settings.defaultDepartmentId ?? departments[0]?.id ?? null;
  const businessHoursAvailable = await isBusinessHoursAvailable(admin, requestedDepartment, settings);
  const assignedAgent = settings.autoAssignmentEnabled && businessHoursAvailable
    ? await selectAgentForConversation(admin, requestedDepartment)
    : null;
  const now = new Date().toISOString();
  const conversationResult = await admin
    .from("live_chat_conversations")
    .insert({
      assigned_agent_id: assignedAgent?.id ?? null,
      current_page_url: normalizeNullable(currentPageUrl),
      department_id: requestedDepartment,
      initial_page_url: normalizeNullable(initialPageUrl),
      last_message_at: now,
      metadata: toJson(metadata ?? {}),
      referrer_url: normalizeNullable(referrerUrl),
      source: "website_widget",
      status: assignedAgent ? "open" : "new",
      subject: normalizeNullable(subject) ?? "Website chat",
      user_id: userId ?? null,
      visitor_email: visitor.email,
      visitor_id: visitor.id,
      visitor_name: visitor.name,
      waiting_since: now
    })
    .select("*")
    .maybeSingle();

  if (conversationResult.error || !conversationResult.data) {
    throw new Error(conversationResult.error?.message ?? "Unable to start chat.");
  }

  const conversation = conversationResult.data as ConversationRow;

  if (assignedAgent) {
    await admin.from("live_chat_assignments").insert({
      agent_id: assignedAgent.id,
      assignment_type: "round_robin",
      conversation_id: conversation.id
    });
  }

  const messageInsert = await admin.from("live_chat_messages").insert({
    body: message,
    conversation_id: conversation.id,
    message_type: "text",
    sender_type: userId ? "user" : "visitor",
    sender_user_id: userId ?? null,
    sender_visitor_id: visitor.id
  });

  if (messageInsert.error) {
    throw new Error(messageInsert.error.message);
  }

  await applyKeywordAutomation(admin, conversation.id, message);

  if (!businessHoursAvailable || !assignedAgent) {
    await createSystemMessage(
      admin,
      conversation.id,
      !businessHoursAvailable
        ? settings.offlineMessage
        : "Thanks for your message. The team has it in the queue and will reply as soon as possible."
    );
  }

  return getVisitorLiveChatConversation({
    conversationId: conversation.id,
    token,
    userId
  });
}

export async function getVisitorLiveChatConversation({
  conversationId,
  token,
  userId
}: {
  conversationId: string;
  token: string;
  userId?: string | null;
}): Promise<LiveChatConversationDetail> {
  const admin = createSupabaseAdminClient();
  const {conversation, visitor} = await getVisitorConversationOrThrow({
    admin,
    conversationId,
    token,
    userId
  });
  const [messageResult, agentResult, departmentResult, historyResult, ratingResult] = await Promise.all([
    admin
      .from("live_chat_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .eq("is_internal_note", false)
      .order("created_at", {ascending: true})
      .limit(200),
    admin.from("live_chat_agents").select("*"),
    admin
      .from("live_chat_departments")
      .select("id, name, slug, description, is_active, sort_order"),
    admin
      .from("live_chat_conversations")
      .select("id, status, last_message_preview, created_at")
      .eq("visitor_id", visitor.id)
      .neq("id", conversation.id)
      .order("last_message_at", {ascending: false})
      .limit(8),
    admin
      .from("live_chat_ratings")
      .select("id, rating, feedback, created_at")
      .eq("conversation_id", conversation.id)
  ]);

  const agents = new Map(((agentResult.data as AgentRow[] | null) ?? []).map((row) => [row.id, row]));
  const departments = new Map(((departmentResult.data as DepartmentRow[] | null) ?? []).map((row) => [row.id, row]));
  const messages = ((messageResult.data as MessageRow[] | null) ?? []).map((row) =>
    mapMessage(row, agents, visitor)
  );

  return {
    ...mapConversation({
      agents,
      conversation,
      departments,
      visitor
    }),
    history: ((historyResult.data as Array<{
      created_at: string;
      id: string;
      last_message_preview: string | null;
      status: LiveChatStatus;
    }> | null) ?? []).map((row) => ({
      createdAt: row.created_at,
      id: row.id,
      lastMessagePreview: row.last_message_preview,
      status: row.status
    })),
    messages,
    ratings: ((ratingResult.data as RatingRow[] | null) ?? []).map((row) => ({
      createdAt: row.created_at,
      feedback: row.feedback,
      id: row.id,
      rating: row.rating
    }))
  };
}

export async function getVisitorLiveChatTranscript({
  conversationId,
  token,
  userId
}: {
  conversationId: string;
  token: string;
  userId?: string | null;
}) {
  const conversation = await getVisitorLiveChatConversation({
    conversationId,
    token,
    userId
  });
  const lines = [
    `Live chat transcript`,
    `Conversation: ${conversation.id}`,
    `Status: ${conversation.status}`,
    `Started: ${conversation.createdAt}`,
    `Visitor: ${conversation.visitor.name ?? conversation.visitor.email ?? "Visitor"}`,
    "",
    ...conversation.messages.map((message) => {
      const timestamp = new Date(message.createdAt).toISOString();
      const body = message.body ?? (message.attachments.length > 0 ? "[Attachment]" : "");
      return `[${timestamp}] ${message.sender.label}: ${body}`;
    })
  ];

  return lines.join("\n");
}

export async function sendVisitorLiveChatMessage({
  attachments,
  body,
  conversationId,
  currentPageUrl,
  token,
  userId
}: {
  attachments?: LiveChatAttachment[];
  body?: string | null;
  conversationId: string;
  currentPageUrl?: string | null;
  token: string;
  userId?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const {conversation, visitor} = await getVisitorConversationOrThrow({
    admin,
    conversationId,
    token,
    userId
  });
  await assertVisitorRateLimit(admin, visitor.id, "message");

  if (["closed", "spam"].includes(conversation.status)) {
    throw new Error("This chat is closed.");
  }

  const normalizedBody = normalizeNullable(body);

  if ((normalizedBody?.length ?? 0) > MAX_MESSAGE_BYTES) {
    throw new Error("Message is too large.");
  }

  const insert = await admin.from("live_chat_messages").insert({
    attachments: toJson(attachments ?? []),
    body: normalizedBody,
    conversation_id: conversation.id,
    message_type: attachments && attachments.length > 0 && !normalizedBody ? "file" : "text",
    sender_type: userId ? "user" : "visitor",
    sender_user_id: userId ?? null,
    sender_visitor_id: visitor.id
  });

  if (insert.error) {
    throw new Error(insert.error.message);
  }

  await admin
    .from("live_chat_conversations")
    .update({
      current_page_url: normalizeNullable(currentPageUrl) ?? conversation.current_page_url,
      status: conversation.status === "resolved" ? "open" : conversation.status
    })
    .eq("id", conversation.id);

  if (normalizedBody) {
    await applyKeywordAutomation(admin, conversation.id, normalizedBody);
  }

  return getVisitorLiveChatConversation({
    conversationId: conversation.id,
    token,
    userId
  });
}

export async function markVisitorConversationRead({
  conversationId,
  token,
  userId
}: {
  conversationId: string;
  token: string;
  userId?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const {conversation} = await getVisitorConversationOrThrow({
    admin,
    conversationId,
    token,
    userId
  });
  const now = new Date().toISOString();

  await Promise.all([
    admin
      .from("live_chat_conversations")
      .update({unread_by_visitor: 0})
      .eq("id", conversation.id),
    admin
      .from("live_chat_messages")
      .update({read_by_visitor_at: now})
      .eq("conversation_id", conversation.id)
      .in("sender_type", ["agent", "bot", "system"])
      .is("read_by_visitor_at", null)
  ]);
}

export async function submitLiveChatRating({
  conversationId,
  feedback,
  rating,
  token,
  userId
}: {
  conversationId: string;
  feedback?: string | null;
  rating: number;
  token: string;
  userId?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const {conversation, visitor} = await getVisitorConversationOrThrow({
    admin,
    conversationId,
    token,
    userId
  });
  const upsert = await admin.from("live_chat_ratings").upsert(
    {
      agent_id: conversation.assigned_agent_id,
      conversation_id: conversation.id,
      feedback: normalizeNullable(feedback),
      rating,
      visitor_id: visitor.id
    },
    {onConflict: "conversation_id,visitor_id"}
  );

  if (upsert.error) {
    throw new Error(upsert.error.message);
  }

  await admin.from("live_chat_events").insert({
    conversation_id: conversation.id,
    event_type: "rating_submitted",
    is_public: false,
    payload: toJson({rating}),
    visitor_id: visitor.id
  });
}

async function assertAgentCanAccessConversation({
  actor,
  agent,
  conversation
}: {
  actor: AdminStaffIdentity;
  agent: AgentRow;
  conversation: ConversationRow;
}) {
  if (isLiveChatManager(actor) || agent.can_view_all_chats || conversation.assigned_agent_id === agent.id || !conversation.assigned_agent_id) {
    return;
  }

  if (!conversation.department_id) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const departmentResult = await admin
    .from("live_chat_agent_departments")
    .select("id")
    .eq("agent_id", agent.id)
    .eq("department_id", conversation.department_id)
    .maybeSingle();

  if (!departmentResult.data) {
    throw new Error("Forbidden.");
  }
}

export async function getLiveChatAdminBootstrap(actor: AdminStaffIdentity): Promise<LiveChatAdminBootstrap> {
  const admin = createSupabaseAdminClient();
  await getAgentForActor(admin, actor);
  const [conversationResult, agents, settingsDepartments, cannedResult, tagResult] = await Promise.all([
    admin
      .from("live_chat_conversations")
      .select("*")
      .order("last_message_at", {ascending: false})
      .limit(25),
    listAgents(admin),
    getSettingsAndDepartments(admin),
    admin
      .from("live_chat_canned_responses")
      .select("*")
      .order("title", {ascending: true}),
    admin
      .from("live_chat_tags")
      .select("id, name, color")
      .order("name", {ascending: true})
  ]);
  let conversationRows = (conversationResult.data as ConversationRow[] | null) ?? [];

  if (!isLiveChatManager(actor)) {
    const currentAgent = await getAgentForActor(admin, actor);
    const departmentRows = await admin
      .from("live_chat_agent_departments")
      .select("department_id")
      .eq("agent_id", currentAgent.id);
    const departmentIds = new Set(((departmentRows.data as Array<{department_id: string}> | null) ?? []).map((row) => row.department_id));

    conversationRows = conversationRows.filter((conversation) =>
      conversation.assigned_agent_id === currentAgent.id ||
      !conversation.assigned_agent_id ||
      (conversation.department_id ? departmentIds.has(conversation.department_id) : false)
    );
  }

  return {
    agents,
    cannedResponses: ((cannedResult.data as CannedResponseRow[] | null) ?? []).map(mapCannedResponse),
    conversations: await mapConversations(admin, conversationRows),
    departments: settingsDepartments.departments,
    settings: settingsDepartments.settings,
    tags: ((tagResult.data as Array<{color: string | null; id: string; name: string}> | null) ?? [])
  };
}

export async function listLiveChatConversations({
  actor,
  assigned,
  departmentId,
  priority,
  query,
  status
}: {
  actor: AdminStaffIdentity;
  assigned?: "me" | "unassigned" | "all";
  departmentId?: string;
  priority?: string;
  query?: string;
  status?: string;
}) {
  const admin = createSupabaseAdminClient();
  const agent = await getAgentForActor(admin, actor);
  let request = admin
    .from("live_chat_conversations")
    .select("*")
    .order("last_message_at", {ascending: false})
    .limit(100);

  if (status) {
    request = request.eq("status", status);
  }

  if (priority) {
    request = request.eq("priority", priority);
  }

  if (departmentId) {
    request = request.eq("department_id", departmentId);
  }

  if (assigned === "me") {
    request = request.eq("assigned_agent_id", agent.id);
  } else if (assigned === "unassigned") {
    request = request.is("assigned_agent_id", null);
  }

  const result = await request;
  let rows = (result.data as ConversationRow[] | null) ?? [];

  if (!isLiveChatManager(actor)) {
    const departmentRows = await admin
      .from("live_chat_agent_departments")
      .select("department_id")
      .eq("agent_id", agent.id);
    const departmentIds = new Set(((departmentRows.data as Array<{department_id: string}> | null) ?? []).map((row) => row.department_id));
    rows = rows.filter((conversation) =>
      conversation.assigned_agent_id === agent.id ||
      !conversation.assigned_agent_id ||
      (conversation.department_id ? departmentIds.has(conversation.department_id) : false)
    );
  }

  if (query) {
    const needle = query.toLowerCase();
    rows = rows.filter((conversation) =>
      [
        conversation.subject,
        conversation.visitor_name,
        conversation.visitor_email,
        conversation.last_message_preview,
        conversation.tags.join(" ")
      ].some((value) => value?.toLowerCase().includes(needle))
    );
  }

  return mapConversations(admin, rows.slice(0, 25));
}

export async function getAdminLiveChatConversationDetail({
  actor,
  conversationId
}: {
  actor: AdminStaffIdentity;
  conversationId: string;
}): Promise<LiveChatConversationDetail> {
  const admin = createSupabaseAdminClient();
  const agent = await getAgentForActor(admin, actor);
  const conversationResult = await admin
    .from("live_chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  const conversation = (conversationResult.data as ConversationRow | null) ?? null;

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  await assertAgentCanAccessConversation({actor, agent, conversation});

  const [visitorResult, messagesResult, agentsResult, departmentsResult, historyResult, ratingsResult] =
    await Promise.all([
      admin
        .from("live_chat_visitors")
        .select("id, user_id, name, email, phone, company, country, city, user_agent, last_seen_at")
        .eq("id", conversation.visitor_id)
        .maybeSingle(),
      admin
        .from("live_chat_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", {ascending: true})
        .limit(300),
      admin.from("live_chat_agents").select("*"),
      admin
        .from("live_chat_departments")
        .select("id, name, slug, description, is_active, sort_order"),
      admin
        .from("live_chat_conversations")
        .select("id, status, last_message_preview, created_at")
        .eq("visitor_id", conversation.visitor_id)
        .neq("id", conversation.id)
        .order("last_message_at", {ascending: false})
        .limit(10),
      admin
        .from("live_chat_ratings")
        .select("id, rating, feedback, created_at")
        .eq("conversation_id", conversation.id)
    ]);
  const visitor = (visitorResult.data as VisitorRow | null) ?? null;

  if (!visitor) {
    throw new Error("Visitor not found.");
  }

  const agents = new Map(((agentsResult.data as AgentRow[] | null) ?? []).map((row) => [row.id, row]));
  const departments = new Map(((departmentsResult.data as DepartmentRow[] | null) ?? []).map((row) => [row.id, row]));

  await Promise.all([
    admin
      .from("live_chat_conversations")
      .update({unread_by_agents: 0})
      .eq("id", conversation.id),
    admin
      .from("live_chat_messages")
      .update({read_by_agent_at: new Date().toISOString()})
      .eq("conversation_id", conversation.id)
      .in("sender_type", ["visitor", "user"])
      .is("read_by_agent_at", null)
  ]);

  return {
    ...mapConversation({
      agents,
      conversation: {
        ...conversation,
        unread_by_agents: 0
      },
      departments,
      visitor
    }),
    history: ((historyResult.data as Array<{
      created_at: string;
      id: string;
      last_message_preview: string | null;
      status: LiveChatStatus;
    }> | null) ?? []).map((row) => ({
      createdAt: row.created_at,
      id: row.id,
      lastMessagePreview: row.last_message_preview,
      status: row.status
    })),
    messages: ((messagesResult.data as MessageRow[] | null) ?? []).map((row) =>
      mapMessage(row, agents, visitor)
    ),
    ratings: ((ratingsResult.data as RatingRow[] | null) ?? []).map((row) => ({
      createdAt: row.created_at,
      feedback: row.feedback,
      id: row.id,
      rating: row.rating
    }))
  };
}

export async function sendAgentLiveChatMessage({
  actor,
  attachments,
  body,
  conversationId,
  isInternalNote
}: {
  actor: AdminStaffIdentity;
  attachments?: LiveChatAttachment[];
  body?: string | null;
  conversationId: string;
  isInternalNote?: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const agent = await getAgentForActor(admin, actor);
  const conversationResult = await admin
    .from("live_chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  const conversation = (conversationResult.data as ConversationRow | null) ?? null;

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  await assertAgentCanAccessConversation({actor, agent, conversation});

  const normalizedBody = normalizeNullable(body);
  const insert = await admin.from("live_chat_messages").insert({
    attachments: toJson(attachments ?? []),
    body: normalizedBody,
    conversation_id: conversation.id,
    is_internal_note: Boolean(isInternalNote),
    message_type: isInternalNote ? "note" : attachments && attachments.length > 0 && !normalizedBody ? "file" : "text",
    sender_agent_id: agent.id,
    sender_type: "agent",
    sender_user_id: actor.userId
  });

  if (insert.error) {
    throw new Error(insert.error.message);
  }

  if (!conversation.assigned_agent_id && !isInternalNote) {
    await admin
      .from("live_chat_conversations")
      .update({
        assigned_agent_id: agent.id,
        status: "open"
      })
      .eq("id", conversation.id);
    await admin.from("live_chat_assignments").insert({
      agent_id: agent.id,
      assigned_by: actor.userId,
      assignment_type: "manual",
      conversation_id: conversation.id
    });
  }

  await createAdminAuditLog({
    action: isInternalNote ? "live_chat.internal_note_created" : "live_chat.reply_sent",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: conversation.id,
    entityType: "live_chat_conversation",
    targetUserId: conversation.user_id
  });
}

export async function updateLiveChatConversation({
  actor,
  assignedAgentId,
  conversationId,
  departmentId,
  priority,
  status,
  tags
}: {
  actor: AdminStaffIdentity;
  assignedAgentId?: string | null;
  conversationId: string;
  departmentId?: string | null;
  priority?: LiveChatPriority;
  status?: LiveChatStatus;
  tags?: string[];
}) {
  const admin = createSupabaseAdminClient();
  const agent = await getAgentForActor(admin, actor);
  const currentResult = await admin
    .from("live_chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  const current = (currentResult.data as ConversationRow | null) ?? null;

  if (!current) {
    throw new Error("Conversation not found.");
  }

  await assertAgentCanAccessConversation({actor, agent, conversation: current});

  if (assignedAgentId !== undefined && assignedAgentId !== current.assigned_agent_id) {
    if (!isLiveChatManager(actor) && agent.id !== assignedAgentId) {
      throw new Error("Only managers can assign conversations to another agent.");
    }
  }

  const now = new Date().toISOString();
  const payload: Record<string, Json | undefined> = {};

  if (assignedAgentId !== undefined) {
    payload.assigned_agent_id = assignedAgentId;
  }

  if (departmentId !== undefined) {
    payload.department_id = departmentId;
  }

  if (priority) {
    payload.priority = priority;
  }

  if (tags) {
    payload.tags = tags;
  }

  if (status) {
    payload.status = status;

    if (status === "resolved") {
      payload.resolved_at = now;
    }

    if (status === "closed" || status === "spam") {
      payload.closed_at = now;
    }
  }

  const update = await admin
    .from("live_chat_conversations")
    .update(payload)
    .eq("id", current.id);

  if (update.error) {
    throw new Error(update.error.message);
  }

  if (assignedAgentId && assignedAgentId !== current.assigned_agent_id) {
    await admin.from("live_chat_assignments").insert({
      agent_id: assignedAgentId,
      assigned_by: actor.userId,
      assignment_type: current.assigned_agent_id ? "transfer" : "manual",
      conversation_id: current.id
    });
  }

  await createAdminAuditLog({
    action: "live_chat.conversation_updated",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: current.id,
    entityType: "live_chat_conversation",
    metadata: payload,
    targetUserId: current.user_id
  });
}

export async function requestLiveChatRating({
  actor,
  conversationId
}: {
  actor: AdminStaffIdentity;
  conversationId: string;
}) {
  const admin = createSupabaseAdminClient();
  const agent = await getAgentForActor(admin, actor);
  const conversationResult = await admin
    .from("live_chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  const conversation = (conversationResult.data as ConversationRow | null) ?? null;

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  await assertAgentCanAccessConversation({actor, agent, conversation});
  await admin.from("live_chat_messages").insert({
    body: "How did we do? Please rate this chat.",
    conversation_id: conversation.id,
    message_type: "rating_request",
    sender_agent_id: agent.id,
    sender_type: "agent",
    sender_user_id: actor.userId
  });
  await admin.from("live_chat_events").insert({
    conversation_id: conversation.id,
    event_type: "rating_requested",
    is_public: true,
    payload: toJson({conversationId: conversation.id}),
    visitor_id: conversation.visitor_id
  });
}

export async function saveLiveChatAgent({
  actor,
  agentId,
  input
}: {
  actor: AdminStaffIdentity;
  agentId?: string;
  input: {
    avatarUrl?: string | null;
    canManageAgents: boolean;
    canManageSettings: boolean;
    canViewAllChats: boolean;
    departmentIds: string[];
    displayName: string;
    email: string;
    isActive: boolean;
    maxActiveChats: number;
    role: LiveChatAgentRole;
    status: LiveChatAgentStatus;
    userId: string;
  };
}) {
  if (!isLiveChatManager(actor)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    avatar_url: input.avatarUrl ?? null,
    can_manage_agents: input.canManageAgents,
    can_manage_settings: input.canManageSettings,
    can_view_all_chats: input.canViewAllChats,
    display_name: input.displayName,
    email: input.email,
    is_active: input.isActive,
    max_active_chats: input.maxActiveChats,
    role: input.role,
    status: input.status,
    user_id: input.userId
  };
  const result = agentId
    ? await admin.from("live_chat_agents").update(payload).eq("id", agentId).select("id").maybeSingle()
    : await admin.from("live_chat_agents").insert(payload).select("id").maybeSingle();

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Unable to save live chat agent.");
  }

  const id = (result.data as {id: string}).id;
  await admin.from("live_chat_agent_departments").delete().eq("agent_id", id);

  if (input.departmentIds.length > 0) {
    await admin.from("live_chat_agent_departments").insert(
      input.departmentIds.map((departmentId) => ({
        agent_id: id,
        department_id: departmentId
      }))
    );
  }

  await createAdminAuditLog({
    action: agentId ? "live_chat.agent_updated" : "live_chat.agent_created",
    actorRole: actor.role,
    actorUserId: actor.userId,
    entityId: id,
    entityType: "live_chat_agent",
    targetUserId: input.userId
  });
}

export async function updateLiveChatAgentStatus({
  actor,
  status
}: {
  actor: AdminStaffIdentity;
  status: LiveChatAgentStatus;
}) {
  const admin = createSupabaseAdminClient();
  const agent = await getAgentForActor(admin, actor);
  const update = await admin
    .from("live_chat_agents")
    .update({
      last_active_at: new Date().toISOString(),
      status
    })
    .eq("id", agent.id);

  if (update.error) {
    throw new Error(update.error.message);
  }
}

export async function saveLiveChatDepartment({
  actor,
  departmentId,
  input
}: {
  actor: AdminStaffIdentity;
  departmentId?: string;
  input: {
    description?: string | null;
    isActive: boolean;
    name: string;
    slug: string;
    sortOrder: number;
  };
}) {
  if (!isLiveChatManager(actor)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    description: input.description ?? null,
    is_active: input.isActive,
    name: input.name,
    slug: input.slug,
    sort_order: input.sortOrder
  };
  const result = departmentId
    ? await admin.from("live_chat_departments").update(payload).eq("id", departmentId)
    : await admin.from("live_chat_departments").insert(payload);

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function saveLiveChatCannedResponse({
  actor,
  cannedResponseId,
  input
}: {
  actor: AdminStaffIdentity;
  cannedResponseId?: string;
  input: {
    body: string;
    departmentId?: string | null;
    isActive: boolean;
    shortcut?: string | null;
    title: string;
  };
}) {
  if (!isLiveChatManager(actor)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    body: input.body,
    department_id: input.departmentId ?? null,
    is_active: input.isActive,
    shortcut: input.shortcut ?? null,
    title: input.title
  };
  const result = cannedResponseId
    ? await admin.from("live_chat_canned_responses").update(payload).eq("id", cannedResponseId)
    : await admin.from("live_chat_canned_responses").insert({
        ...payload,
        created_by: actor.userId
      });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function saveLiveChatSettings({
  actor,
  input
}: {
  actor: AdminStaffIdentity;
  input: Record<string, unknown>;
}) {
  if (!isLiveChatManager(actor)) {
    throw new Error("Forbidden.");
  }

  const keyMap: Record<string, string> = {
    aiAutoReplyEnabled: "ai_auto_reply_enabled",
    aiEnabled: "ai_enabled",
    aiHandoffRequired: "ai_handoff_required",
    aiSuggestionsEnabled: "ai_suggestions_enabled",
    allowAttachments: "allow_attachments",
    autoAssignmentEnabled: "auto_assignment_enabled",
    brandColor: "brand_color",
    browserNotificationsEnabled: "browser_notifications_enabled",
    businessHoursEnabled: "business_hours_enabled",
    csatEnabled: "csat_enabled",
    dataRetentionDays: "data_retention_days",
    defaultDepartmentId: "default_department_id",
    maxAttachmentSizeMb: "max_attachment_size_mb",
    offlineMessage: "offline_message",
    proactiveChatEnabled: "proactive_chat_enabled",
    requirePrechatEmail: "require_prechat_email",
    soundEnabled: "sound_enabled",
    transcriptEnabled: "transcript_enabled",
    typicalReplyMinutes: "typical_reply_minutes",
    welcomeMessage: "welcome_message",
    widgetEnabled: "widget_enabled",
    widgetPosition: "widget_position"
  };
  const payload: Record<string, Json | undefined> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      payload[keyMap[key] ?? key] = value as Json;
    }
  }
  const admin = createSupabaseAdminClient();
  const update = await admin
    .from("live_chat_settings")
    .update(payload)
    .eq("id", "default");

  if (update.error) {
    throw new Error(update.error.message);
  }
}

export async function saveLiveChatAutomationRule({
  actor,
  input,
  ruleId
}: {
  actor: AdminStaffIdentity;
  input: {
    actions: Record<string, unknown>;
    conditions: Record<string, unknown>;
    isActive: boolean;
    name: string;
    priority: number;
    triggerType: string;
  };
  ruleId?: string;
}) {
  if (!isLiveChatManager(actor)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    actions: toJson(input.actions),
    conditions: toJson(input.conditions),
    is_active: input.isActive,
    name: input.name,
    priority: input.priority,
    trigger_type: input.triggerType
  };
  const result = ruleId
    ? await admin.from("live_chat_automation_rules").update(payload).eq("id", ruleId)
    : await admin.from("live_chat_automation_rules").insert(payload);

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function listLiveChatAutomationRules(actor: AdminStaffIdentity) {
  if (!isLiveChatManager(actor)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("live_chat_automation_rules")
    .select("*")
    .order("priority", {ascending: true})
    .order("created_at", {ascending: false});

  return ((result.data as AutomationRuleRow[] | null) ?? []).map(mapAutomationRule);
}

export async function getLiveChatAnalytics(actor: AdminStaffIdentity): Promise<LiveChatAnalytics> {
  if (!isLiveChatManager(actor)) {
    throw new Error("Forbidden.");
  }

  const admin = createSupabaseAdminClient();
  const [conversationResult, ratingsResult, agentsResult, departmentsResult] = await Promise.all([
    admin.from("live_chat_conversations").select("*").order("created_at", {ascending: true}),
    admin.from("live_chat_ratings").select("rating"),
    admin.from("live_chat_agents").select("*"),
    admin.from("live_chat_departments").select("id, name, slug, description, is_active, sort_order")
  ]);
  const conversations = (conversationResult.data as ConversationRow[] | null) ?? [];
  const ratings = (ratingsResult.data as Array<{rating: number}> | null) ?? [];
  const agents = (agentsResult.data as AgentRow[] | null) ?? [];
  const departments = new Map(((departmentsResult.data as DepartmentRow[] | null) ?? []).map((row) => [row.id, row.name]));
  const statusCounts = new Map<LiveChatStatus, number>();

  for (const status of ["new", "open", "pending", "resolved", "closed", "spam"] as LiveChatStatus[]) {
    statusCounts.set(status, conversations.filter((conversation) => conversation.status === status).length);
  }

  const firstResponses = conversations
    .filter((conversation) => conversation.first_response_at)
    .map((conversation) => (new Date(conversation.first_response_at ?? "").getTime() - new Date(conversation.created_at).getTime()) / 60000)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const resolutions = conversations
    .filter((conversation) => conversation.resolved_at || conversation.closed_at)
    .map((conversation) => (new Date(conversation.resolved_at ?? conversation.closed_at ?? "").getTime() - new Date(conversation.created_at).getTime()) / 60000)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const dayCounts = new Map<string, number>();
  const departmentCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const visitorCounts = new Map<string, number>();

  for (const conversation of conversations) {
    const day = conversation.created_at.slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    const department = conversation.department_id
      ? departments.get(conversation.department_id) ?? "Unknown"
      : "Unassigned";
    departmentCounts.set(department, (departmentCounts.get(department) ?? 0) + 1);
    visitorCounts.set(conversation.visitor_id, (visitorCounts.get(conversation.visitor_id) ?? 0) + 1);

    for (const tag of conversation.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const average = (values: number[]) =>
    values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

  return {
    agentWorkload: agents.map((agent) => ({
      agent: agent.display_name,
      open: conversations.filter((conversation) =>
        conversation.assigned_agent_id === agent.id && ["new", "open", "pending"].includes(conversation.status)
      ).length,
      resolved: conversations.filter((conversation) =>
        conversation.assigned_agent_id === agent.id && ["resolved", "closed"].includes(conversation.status)
      ).length
    })),
    averageFirstResponseMinutes: average(firstResponses),
    averageResolutionMinutes: average(resolutions),
    conversationsByDay: [...dayCounts.entries()].slice(-30).map(([label, value]) => ({label, value})),
    conversationsByDepartment: [...departmentCounts.entries()].map(([label, value]) => ({label, value})),
    csatAverage:
      ratings.length === 0
        ? null
        : Math.round((ratings.reduce((sum, row) => sum + row.rating, 0) / ratings.length) * 10) / 10,
    missedChats: conversations.filter((conversation) => !conversation.first_response_at && ["resolved", "closed"].includes(conversation.status)).length,
    newVisitors: [...visitorCounts.values()].filter((count) => count === 1).length,
    offlineMessages: conversations.filter((conversation) => !conversation.assigned_agent_id).length,
    onlineAgents: agents.filter((agent) => agent.is_active && agent.status === "online").length,
    openConversations:
      (statusCounts.get("new") ?? 0) + (statusCounts.get("open") ?? 0) + (statusCounts.get("pending") ?? 0),
    resolvedConversations: (statusCounts.get("resolved") ?? 0) + (statusCounts.get("closed") ?? 0),
    returningVisitors: [...visitorCounts.values()].filter((count) => count > 1).length,
    topTags: [...tagCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([label, value]) => ({label, value})),
    totalConversations: conversations.length
  };
}

async function ensureLiveChatAttachmentBucket(settings: LiveChatSettings) {
  const admin = createSupabaseAdminClient();
  const bucketName = getServerEnv().SUPABASE_LIVE_CHAT_ATTACHMENTS_BUCKET;
  const result = await admin.storage.createBucket(bucketName, {
    allowedMimeTypes: Array.from(ALLOWED_ATTACHMENT_TYPES),
    fileSizeLimit: settings.maxAttachmentSizeMb * 1024 * 1024,
    public: false
  });

  if (result.error && !result.error.message.toLowerCase().includes("already exists")) {
    throw new Error(result.error.message);
  }

  return bucketName;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").toLowerCase();
}

export async function uploadLiveChatAttachmentForVisitor({
  conversationId,
  file,
  token,
  userId
}: {
  conversationId: string;
  file: File;
  token: string;
  userId?: string | null;
}): Promise<LiveChatAttachment> {
  const admin = createSupabaseAdminClient();
  const {conversation, visitor} = await getVisitorConversationOrThrow({
    admin,
    conversationId,
    token,
    userId
  });
  const {settings} = await getSettingsAndDepartments(admin);

  if (!settings.allowAttachments) {
    throw new Error("Attachments are not enabled for chat.");
  }

  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error("This file type is not allowed.");
  }

  if (file.size > settings.maxAttachmentSizeMb * 1024 * 1024) {
    throw new Error(`Files must be ${settings.maxAttachmentSizeMb}MB or smaller.`);
  }

  const bucketName = await ensureLiveChatAttachmentBucket(settings);
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeFileName = sanitizeFileName(file.name);
  const storagePath = ["live-chat", conversation.id, visitor.id, `${Date.now()}-${safeFileName}`].join("/");
  const upload = await admin.storage.from(bucketName).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false
  });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  const insert = await admin
    .from("uploads")
    .insert({
      bucket_name: bucketName,
      byte_size: file.size,
      checksum_sha256: hashValue(buffer.toString("base64")),
      document_category: "support_attachment",
      file_extension: safeFileName.includes(".") ? safeFileName.split(".").pop() : null,
      file_name: file.name,
      is_private: true,
      linked_entity_id: conversation.id,
      linked_entity_type: "live_chat_conversation",
      metadata: toJson({visitorId: visitor.id}),
      mime_type: file.type,
      owner_user_id: userId ?? null,
      storage_path: storagePath
    })
    .select("id")
    .maybeSingle();

  if (insert.error || !insert.data) {
    throw new Error(insert.error?.message ?? "Unable to store attachment metadata.");
  }

  return {
    byteSize: file.size,
    fileName: file.name,
    id: (insert.data as {id: string}).id,
    mimeType: file.type
  };
}

export async function uploadLiveChatAttachmentForAgent({
  actor,
  conversationId,
  file
}: {
  actor: AdminStaffIdentity;
  conversationId: string;
  file: File;
}): Promise<LiveChatAttachment> {
  const admin = createSupabaseAdminClient();
  const agent = await getAgentForActor(admin, actor);
  const conversationResult = await admin
    .from("live_chat_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  const conversation = (conversationResult.data as ConversationRow | null) ?? null;

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  await assertAgentCanAccessConversation({actor, agent, conversation});

  const {settings} = await getSettingsAndDepartments(admin);

  if (!settings.allowAttachments) {
    throw new Error("Attachments are not enabled for chat.");
  }

  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    throw new Error("This file type is not allowed.");
  }

  if (file.size > settings.maxAttachmentSizeMb * 1024 * 1024) {
    throw new Error(`Files must be ${settings.maxAttachmentSizeMb}MB or smaller.`);
  }

  const bucketName = await ensureLiveChatAttachmentBucket(settings);
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeFileName = sanitizeFileName(file.name);
  const storagePath = ["live-chat", conversation.id, agent.id, `${Date.now()}-${safeFileName}`].join("/");
  const upload = await admin.storage.from(bucketName).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false
  });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  const insert = await admin
    .from("uploads")
    .insert({
      bucket_name: bucketName,
      byte_size: file.size,
      checksum_sha256: hashValue(buffer.toString("base64")),
      document_category: "support_attachment",
      file_extension: safeFileName.includes(".") ? safeFileName.split(".").pop() : null,
      file_name: file.name,
      is_private: true,
      linked_entity_id: conversation.id,
      linked_entity_type: "live_chat_conversation",
      metadata: toJson({agentId: agent.id}),
      mime_type: file.type,
      owner_user_id: actor.userId,
      storage_path: storagePath
    })
    .select("id")
    .maybeSingle();

  if (insert.error || !insert.data) {
    throw new Error(insert.error?.message ?? "Unable to store attachment metadata.");
  }

  return {
    byteSize: file.size,
    fileName: file.name,
    id: (insert.data as {id: string}).id,
    mimeType: file.type
  };
}

export async function createLiveChatAttachmentAccessUrl({
  actor,
  token,
  uploadId,
  userId
}: {
  actor?: AdminStaffIdentity | null;
  token?: string | null;
  uploadId: string;
  userId?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const uploadResult = await admin
    .from("uploads")
    .select("id, bucket_name, storage_path, file_name, mime_type, byte_size, linked_entity_id, metadata")
    .eq("id", uploadId)
    .eq("linked_entity_type", "live_chat_conversation")
    .is("deleted_at", null)
    .maybeSingle();
  const upload = (uploadResult.data as UploadRow | null) ?? null;

  if (!upload?.linked_entity_id) {
    throw new Error("Attachment not found.");
  }

  if (actor) {
    const agent = await getAgentForActor(admin, actor);
    const conversationResult = await admin
      .from("live_chat_conversations")
      .select("*")
      .eq("id", upload.linked_entity_id)
      .maybeSingle();
    const conversation = (conversationResult.data as ConversationRow | null) ?? null;

    if (!conversation) {
      throw new Error("Conversation not found.");
    }

    await assertAgentCanAccessConversation({actor, agent, conversation});
  } else {
    await getVisitorConversationOrThrow({
      admin,
      conversationId: upload.linked_entity_id,
      token: assertVisitorToken(token),
      userId
    });
  }

  const signed = await admin.storage.from(upload.bucket_name).createSignedUrl(upload.storage_path, 120);

  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(signed.error?.message ?? "Unable to prepare attachment access.");
  }

  return signed.data.signedUrl;
}

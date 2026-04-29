import {type Json} from "@/types/supabase";

export const LIVE_CHAT_TOKEN_STORAGE_KEY = "aurevia_live_chat_token";

export const LIVE_CHAT_STATUSES = ["new", "open", "pending", "resolved", "closed", "spam"] as const;
export const LIVE_CHAT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const LIVE_CHAT_AGENT_ROLES = ["owner", "admin", "supervisor", "agent"] as const;
export const LIVE_CHAT_AGENT_STATUSES = ["online", "away", "offline", "busy"] as const;

export type LiveChatStatus = (typeof LIVE_CHAT_STATUSES)[number];
export type LiveChatPriority = (typeof LIVE_CHAT_PRIORITIES)[number];
export type LiveChatAgentRole = (typeof LIVE_CHAT_AGENT_ROLES)[number];
export type LiveChatAgentStatus = (typeof LIVE_CHAT_AGENT_STATUSES)[number];

export type LiveChatDepartment = {
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  slug: string;
  sortOrder: number;
};

export type LiveChatSettings = {
  aiEnabled: boolean;
  aiSuggestionsEnabled: boolean;
  allowAttachments: boolean;
  autoAssignmentEnabled: boolean;
  brandColor: string;
  browserNotificationsEnabled: boolean;
  businessHoursEnabled: boolean;
  csatEnabled: boolean;
  defaultDepartmentId: string | null;
  maxAttachmentSizeMb: number;
  offlineMessage: string;
  proactiveChatEnabled: boolean;
  requirePrechatEmail: boolean;
  soundEnabled: boolean;
  transcriptEnabled: boolean;
  typicalReplyMinutes: number;
  welcomeMessage: string;
  widgetEnabled: boolean;
  widgetPosition: "bottom-left" | "bottom-right";
};

export type LiveChatPublicConfig = {
  activeConversationId: string | null;
  businessHoursAvailable: boolean;
  departments: LiveChatDepartment[];
  onlineAgentCount: number;
  settings: LiveChatSettings;
  visitor: {
    email: string | null;
    name: string | null;
  };
};

export type LiveChatAttachment = {
  accessUrl?: string;
  byteSize: number;
  fileName: string;
  id: string;
  mimeType: string;
};

export type LiveChatMessage = {
  attachments: LiveChatAttachment[];
  body: string | null;
  createdAt: string;
  id: string;
  isInternalNote: boolean;
  messageType: "text" | "image" | "file" | "system" | "note" | "event" | "handoff" | "rating_request";
  sender: {
    avatarUrl: string | null;
    id: string | null;
    label: string;
    type: "visitor" | "user" | "agent" | "system" | "bot";
  };
};

export type LiveChatConversation = {
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  closedAt: string | null;
  createdAt: string;
  currentPageUrl: string | null;
  departmentId: string | null;
  departmentName: string | null;
  firstResponseAt: string | null;
  id: string;
  initialPageUrl: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  priority: LiveChatPriority;
  referrerUrl: string | null;
  resolvedAt: string | null;
  source: string;
  status: LiveChatStatus;
  subject: string | null;
  tags: string[];
  unreadByAgents: number;
  unreadByVisitor: number;
  visitor: {
    city: string | null;
    company: string | null;
    country: string | null;
    email: string | null;
    id: string;
    lastSeenAt: string;
    name: string | null;
    phone: string | null;
    userAgent: string | null;
    userId: string | null;
  };
  waitingSince: string | null;
};

export type LiveChatConversationDetail = LiveChatConversation & {
  history: Array<{
    createdAt: string;
    id: string;
    lastMessagePreview: string | null;
    status: LiveChatStatus;
  }>;
  messages: LiveChatMessage[];
  ratings: Array<{
    createdAt: string;
    feedback: string | null;
    id: string;
    rating: number;
  }>;
};

export type LiveChatAgent = {
  avatarUrl: string | null;
  canManageAgents: boolean;
  canManageSettings: boolean;
  canViewAllChats: boolean;
  departmentIds: string[];
  displayName: string;
  email: string;
  id: string;
  isActive: boolean;
  lastActiveAt: string | null;
  maxActiveChats: number;
  role: LiveChatAgentRole;
  status: LiveChatAgentStatus;
  userId: string;
};

export type LiveChatCannedResponse = {
  body: string;
  departmentId: string | null;
  id: string;
  isActive: boolean;
  shortcut: string | null;
  title: string;
  usageCount: number;
};

export type LiveChatAutomationRule = {
  actions: Json;
  conditions: Json;
  id: string;
  isActive: boolean;
  name: string;
  priority: number;
  triggerType: string;
};

export type LiveChatAnalytics = {
  agentWorkload: Array<{agent: string; open: number; resolved: number}>;
  averageFirstResponseMinutes: number | null;
  averageResolutionMinutes: number | null;
  conversationsByDay: Array<{label: string; value: number}>;
  conversationsByDepartment: Array<{label: string; value: number}>;
  csatAverage: number | null;
  missedChats: number;
  newVisitors: number;
  offlineMessages: number;
  onlineAgents: number;
  openConversations: number;
  resolvedConversations: number;
  returningVisitors: number;
  topTags: Array<{label: string; value: number}>;
  totalConversations: number;
};

export type LiveChatAdminBootstrap = {
  agents: LiveChatAgent[];
  cannedResponses: LiveChatCannedResponse[];
  conversations: LiveChatConversation[];
  departments: LiveChatDepartment[];
  settings: LiveChatSettings;
  tags: Array<{color: string | null; id: string; name: string}>;
};

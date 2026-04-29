"use client";

import {
  LIVE_CHAT_TOKEN_STORAGE_KEY,
  type LiveChatAttachment,
  type LiveChatConversationDetail,
  type LiveChatPublicConfig
} from "@/lib/live-chat/types";

function createBrowserToken() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getLiveChatToken() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(LIVE_CHAT_TOKEN_STORAGE_KEY);

  if (existing && existing.length >= 32) {
    return existing;
  }

  const token = createBrowserToken();
  window.localStorage.setItem(LIVE_CHAT_TOKEN_STORAGE_KEY, token);
  return token;
}

async function liveChatFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : {"Content-Type": "application/json"}),
      "X-Live-Chat-Token": getLiveChatToken(),
      ...init?.headers
    }
  });
  const contentType = response.headers.get("content-type");
  const payload = contentType?.includes("application/json")
    ? ((await response.json()) as {message?: string})
    : null;

  if (!response.ok) {
    throw new Error(payload?.message ?? "The live chat request failed.");
  }

  return payload as T;
}

export function getLiveChatConfig() {
  return liveChatFetch<LiveChatPublicConfig>("/api/live-chat/widget");
}

export function startLiveChatConversation(input: {
  company?: string | null;
  currentPageUrl?: string | null;
  departmentId?: string | null;
  email?: string | null;
  initialPageUrl?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
  name?: string | null;
  phone?: string | null;
  referrerUrl?: string | null;
  subject?: string | null;
}) {
  return liveChatFetch<LiveChatConversationDetail>("/api/live-chat/conversations", {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function getLiveChatConversation(conversationId: string) {
  return liveChatFetch<LiveChatConversationDetail>(`/api/live-chat/conversations/${conversationId}`);
}

export function sendLiveChatMessage(
  conversationId: string,
  input: {
    attachments?: LiveChatAttachment[];
    body?: string | null;
    currentPageUrl?: string | null;
  }
) {
  return liveChatFetch<LiveChatConversationDetail>(
    `/api/live-chat/conversations/${conversationId}/messages`,
    {
      body: JSON.stringify(input),
      method: "POST"
    }
  );
}

export function markLiveChatConversationRead(conversationId: string) {
  return liveChatFetch<{ok: true}>(`/api/live-chat/conversations/${conversationId}/read`, {
    method: "POST"
  });
}

export function submitLiveChatRating(
  conversationId: string,
  input: {feedback?: string | null; rating: number}
) {
  return liveChatFetch<{ok: true}>(`/api/live-chat/conversations/${conversationId}/rating`, {
    body: JSON.stringify(input),
    method: "POST"
  });
}

export async function uploadLiveChatAttachment(conversationId: string, file: File) {
  const formData = new FormData();
  formData.append("conversationId", conversationId);
  formData.append("file", file);

  return liveChatFetch<LiveChatAttachment>("/api/live-chat/attachments", {
    body: formData,
    method: "POST"
  });
}

export function getLiveChatAttachmentUrl(attachmentId: string) {
  return `/api/live-chat/attachments/${attachmentId}`;
}

export async function downloadLiveChatTranscript(conversationId: string) {
  const response = await fetch(`/api/live-chat/conversations/${conversationId}/transcript`, {
    headers: {
      "X-Live-Chat-Token": getLiveChatToken()
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {message?: string} | null;
    throw new Error(payload?.message ?? "Unable to export transcript.");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `live-chat-${conversationId}.txt`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

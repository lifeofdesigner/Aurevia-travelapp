"use client";

import {
  Bell,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquareText,
  NotebookPen,
  Paperclip,
  Search,
  SendHorizontal,
  ShieldAlert,
  Star,
  Tag,
  UserRoundCheck
} from "lucide-react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {useAdminSession} from "@/features/admin/components/admin-session-provider";
import {
  type LiveChatAdminBootstrap,
  type LiveChatAgentStatus,
  type LiveChatAttachment,
  type LiveChatConversation,
  type LiveChatConversationDetail,
  type LiveChatPriority,
  type LiveChatStatus
} from "@/lib/live-chat/types";
import {createSupabaseBrowserClient} from "@/lib/supabase/browser";
import {cn} from "@/lib/utils";

type AdminLiveChatInboxProps = {
  initialData: LiveChatAdminBootstrap;
};

type Filters = {
  assigned: "all" | "me" | "unassigned";
  departmentId: string;
  priority: string;
  query: string;
  status: string;
};

const statusOptions: LiveChatStatus[] = ["new", "open", "pending", "resolved", "closed", "spam"];
const priorityOptions: LiveChatPriority[] = ["low", "normal", "high", "urgent"];
const agentStatusOptions: LiveChatAgentStatus[] = ["online", "away", "busy", "offline"];

function formatTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString([], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  });
}

function minutesWaiting(value: string | null) {
  if (!value) {
    return "0m";
  }

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(diff / 60000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  return `${Math.round(minutes / 60)}h`;
}

function playAdminSound() {
  try {
    const audio = new Audio();
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    void audio;
    oscillator.frequency.value = 580;
    oscillator.type = "triangle";
    gain.gain.value = 0.04;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    window.setTimeout(() => {
      oscillator.stop();
      void context.close();
    }, 140);
  } catch {
    // Audio is best-effort after browser interaction.
  }
}

async function parseJsonResponse<T>(response: Response) {
  const payload = (await response.json()) as T & {message?: string};

  if (!response.ok) {
    throw new Error(payload.message ?? "The live chat request failed.");
  }

  return payload;
}

export function AdminLiveChatInbox({initialData}: AdminLiveChatInboxProps) {
  const session = useAdminSession();
  const [agents, setAgents] = useState(initialData.agents);
  const [cannedResponses] = useState(initialData.cannedResponses);
  const [conversations, setConversations] = useState(initialData.conversations);
  const [departments] = useState(initialData.departments);
  const [selectedId, setSelectedId] = useState(initialData.conversations[0]?.id ?? "");
  const [detail, setDetail] = useState<LiveChatConversationDetail | null>(null);
  const [filters, setFilters] = useState<Filters>({
    assigned: "all",
    departmentId: "",
    priority: "",
    query: "",
    status: ""
  });
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [attachments, setAttachments] = useState<LiveChatAttachment[]>([]);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const currentAgent = agents.find((agent) => agent.userId === session.userId);
  const selectedConversation = detail ?? conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const canManage = session.role === "super_admin" || session.role === "admin";

  const refreshConversations = useCallback(async () => {
    const params = new URLSearchParams();

    if (filters.status) {
      params.set("status", filters.status);
    }

    if (filters.priority) {
      params.set("priority", filters.priority);
    }

    if (filters.departmentId) {
      params.set("departmentId", filters.departmentId);
    }

    if (filters.assigned !== "all") {
      params.set("assigned", filters.assigned);
    }

    if (filters.query.trim()) {
      params.set("q", filters.query.trim());
    }

    const response = await fetch(`/api/admin/live-chat/conversations?${params}`);
    const payload = await parseJsonResponse<{conversations: LiveChatConversation[]}>(response);
    setConversations(payload.conversations);
  }, [filters]);

  const loadDetail = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      setDetail(null);
      return;
    }

    setIsDetailLoading(true);

    try {
      const response = await fetch(`/api/admin/live-chat/conversations/${conversationId}`);
      const payload = await parseJsonResponse<LiveChatConversationDetail>(response);
      setDetail(payload);
    } catch (error) {
      toast.error("Unable to load conversation", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
    }
  }, [loadDetail, selectedId]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("live-chat-admin-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_events"
        },
        (payload) => {
          const eventId = String(payload.new.id ?? "");

          if (eventId && eventId === lastEventId) {
            return;
          }

          setLastEventId(eventId);
          void refreshConversations();

          if (selectedId && payload.new.conversation_id === selectedId) {
            void loadDetail(selectedId);
          }

          if (payload.new.event_type === "message_created") {
            toast.message("New live chat message", {
              description: "The inbox has been updated."
            });
            playAdminSound();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [lastEventId, loadDetail, refreshConversations, selectedId]);

  const filteredCannedResponses = useMemo(() => {
    if (!detail?.departmentId) {
      return cannedResponses;
    }

    return cannedResponses.filter((response) => !response.departmentId || response.departmentId === detail.departmentId);
  }, [cannedResponses, detail?.departmentId]);

  async function updateConversation(input: Partial<{
    assignedAgentId: string | null;
    departmentId: string | null;
    priority: LiveChatPriority;
    status: LiveChatStatus;
    tags: string[];
  }>) {
    if (!selectedConversation) {
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(`/api/admin/live-chat/conversations/${selectedConversation.id}`, {
        body: JSON.stringify(input),
        headers: {"Content-Type": "application/json"},
        method: "PATCH"
      });
      await parseJsonResponse<{ok: true}>(response);
      await Promise.all([refreshConversations(), loadDetail(selectedConversation.id)]);
    } catch (error) {
      toast.error("Unable to update chat", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsPending(false);
    }
  }

  async function sendMessage(isInternalNote: boolean) {
    if (!selectedConversation) {
      return;
    }

    const body = isInternalNote ? note.trim() : reply.trim();

    if (!body && attachments.length === 0) {
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(`/api/admin/live-chat/conversations/${selectedConversation.id}/messages`, {
        body: JSON.stringify({
          attachments: isInternalNote ? [] : attachments,
          body,
          isInternalNote
        }),
        headers: {"Content-Type": "application/json"},
        method: "POST"
      });
      await parseJsonResponse<{ok: true}>(response);
      setReply("");
      setNote("");
      setAttachments([]);
      await Promise.all([refreshConversations(), loadDetail(selectedConversation.id)]);
    } catch (error) {
      toast.error(isInternalNote ? "Unable to save note" : "Unable to send reply", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsPending(false);
    }
  }

  async function uploadAttachment(file: File) {
    if (!selectedConversation) {
      return;
    }

    const formData = new FormData();
    formData.append("conversationId", selectedConversation.id);
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/live-chat/attachments", {
        body: formData,
        method: "POST"
      });
      const attachment = await parseJsonResponse<LiveChatAttachment>(response);
      setAttachments((current) => [...current, attachment]);
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Please try another file."
      });
    }
  }

  async function requestRating() {
    if (!selectedConversation) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/live-chat/conversations/${selectedConversation.id}/rating-request`,
        {method: "POST"}
      );
      await parseJsonResponse<{ok: true}>(response);
      toast.success("Rating requested");
      await loadDetail(selectedConversation.id);
    } catch (error) {
      toast.error("Unable to request rating", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  }

  async function updateAgentStatus(status: LiveChatAgentStatus) {
    try {
      const response = await fetch("/api/admin/live-chat/agents/status", {
        body: JSON.stringify({status}),
        headers: {"Content-Type": "application/json"},
        method: "PATCH"
      });
      await parseJsonResponse<{ok: true}>(response);
      setAgents((current) =>
        current.map((agent) => agent.userId === session.userId ? {...agent, status} : agent)
      );
    } catch (error) {
      toast.error("Unable to update status", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge
            label={`${conversations.filter((item) => item.unreadByAgents > 0).length} unread`}
            status="open"
          />
          <StatusBadge
            label={`${agents.filter((agent) => agent.status === "online").length} online`}
            status="active"
          />
          {currentAgent ? (
            <Select
              aria-label="Agent status"
              className="w-36"
              onChange={(event) => void updateAgentStatus(event.target.value as LiveChatAgentStatus)}
              value={currentAgent.status}
            >
              {agentStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
        <Button
          onClick={() => {
            if ("Notification" in window && Notification.permission === "default") {
              void Notification.requestPermission();
            }
            toast.message("Live chat notifications are active");
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <Bell aria-hidden="true" className="h-4 w-4" />
          Notifications
        </Button>
      </div>

      <div className="grid min-h-[760px] gap-4 xl:grid-cols-[19rem_minmax(0,1fr)_20rem]">
        <section className="rounded-lg border border-border/80 bg-card shadow-soft">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="pl-9"
                onChange={(event) => setFilters((current) => ({...current, query: event.target.value}))}
                placeholder="Search chats"
                value={filters.query}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Select
                aria-label="Status"
                onChange={(event) => setFilters((current) => ({...current, status: event.target.value}))}
                value={filters.status}
              >
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Assigned"
                onChange={(event) => setFilters((current) => ({...current, assigned: event.target.value as Filters["assigned"]}))}
                value={filters.assigned}
              >
                <option value="all">All</option>
                <option value="me">Mine</option>
                <option value="unassigned">Unassigned</option>
              </Select>
              <Select
                aria-label="Department"
                onChange={(event) => setFilters((current) => ({...current, departmentId: event.target.value}))}
                value={filters.departmentId}
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Priority"
                onChange={(event) => setFilters((current) => ({...current, priority: event.target.value}))}
                value={filters.priority}
              >
                <option value="">All priority</option>
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="max-h-[640px] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">No conversations match these filters.</div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={cn(
                    "block w-full border-b border-border/70 p-4 text-left transition-colors hover:bg-muted/60",
                    selectedId === conversation.id && "bg-muted"
                  )}
                  onClick={() => setSelectedId(conversation.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {conversation.visitor.name ?? conversation.visitor.email ?? "Visitor"}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {conversation.lastMessagePreview ?? "No messages yet"}
                      </p>
                    </div>
                    {conversation.unreadByAgents > 0 ? (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                        {conversation.unreadByAgents}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge label={conversation.status} status={conversation.status} />
                    <StatusBadge label={conversation.priority} status={conversation.priority} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {conversation.assignedAgentName ?? "Unassigned"} | waiting {minutesWaiting(conversation.waitingSince)}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-border/80 bg-card shadow-soft">
          {isDetailLoading ? (
            <div className="flex h-full min-h-[560px] items-center justify-center text-muted-foreground">
              <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
              Loading conversation
            </div>
          ) : detail ? (
            <div className="flex h-full min-h-[760px] flex-col">
              <div className="border-b border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {detail.visitor.name ?? detail.visitor.email ?? "Visitor"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detail.departmentName ?? "No department"} | {detail.assignedAgentName ?? "Unassigned"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={isPending}
                      onClick={() => void updateConversation({status: "resolved"})}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                      Resolve
                    </Button>
                    <Button
                      disabled={isPending}
                      onClick={() => void updateConversation({status: "spam"})}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <ShieldAlert aria-hidden="true" className="h-4 w-4" />
                      Spam
                    </Button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-background/60 p-4">
                {detail.messages.map((message) => {
                  const isAgent = message.sender.type === "agent";

                  return (
                    <div
                      key={message.id}
                      className={cn("flex", isAgent ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[78%] rounded-lg border px-4 py-3 text-sm shadow-sm",
                          message.isInternalNote
                            ? "border-amber-200 bg-amber-50 text-amber-900"
                            : isAgent
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-card-foreground"
                        )}
                      >
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-3 text-xs opacity-75">
                          <span className="font-semibold">{message.sender.label}</span>
                          <span>{formatTime(message.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words leading-6">{message.body}</p>
                        {message.attachments.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {message.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground"
                                href={`/api/admin/live-chat/attachments/${attachment.id}`}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
                                {attachment.fileName}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border p-4">
                <div className="mb-3 grid gap-2 md:grid-cols-4">
                  <Select
                    aria-label="Assignee"
                    disabled={isPending}
                    onChange={(event) => void updateConversation({assignedAgentId: event.target.value || null})}
                    value={detail.assignedAgentId ?? ""}
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.displayName}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Department"
                    disabled={isPending}
                    onChange={(event) => void updateConversation({departmentId: event.target.value || null})}
                    value={detail.departmentId ?? ""}
                  >
                    <option value="">No department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Status"
                    disabled={isPending}
                    onChange={(event) => void updateConversation({status: event.target.value as LiveChatStatus})}
                    value={detail.status}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Priority"
                    disabled={isPending}
                    onChange={(event) => void updateConversation({priority: event.target.value as LiveChatPriority})}
                    value={detail.priority}
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  {initialData.tags.map((tag) => {
                    const active = detail.tags.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"
                        )}
                        onClick={() => {
                          const nextTags = active
                            ? detail.tags.filter((name) => name !== tag.name)
                            : [...detail.tags, tag.name];
                          void updateConversation({tags: nextTags});
                        }}
                        type="button"
                      >
                        <Tag aria-hidden="true" className="h-3 w-3" />
                        {tag.name}
                      </button>
                    );
                  })}
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  {filteredCannedResponses.slice(0, 6).map((response) => (
                    <Button
                      key={response.id}
                      onClick={() => setReply((current) => current ? `${current}\n${response.body}` : response.body)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <FileText aria-hidden="true" className="h-4 w-4" />
                      {response.shortcut ?? response.title}
                    </Button>
                  ))}
                </div>

                {attachments.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <span key={attachment.id} className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                        {attachment.fileName}
                      </span>
                    ))}
                  </div>
                ) : null}

                <input
                  ref={fileRef}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void uploadAttachment(file);
                    }
                    event.target.value = "";
                  }}
                  type="file"
                />
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <Textarea
                    className="min-h-[92px]"
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Reply to visitor"
                    value={reply}
                  />
                  <div className="flex gap-2 lg:flex-col">
                    <Button
                      aria-label="Attach file"
                      onClick={() => fileRef.current?.click()}
                      size="icon"
                      type="button"
                      variant="outline"
                    >
                      <Paperclip aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label="Send reply"
                      disabled={isPending}
                      onClick={() => void sendMessage(false)}
                      size="icon"
                      type="button"
                    >
                      <SendHorizontal aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                  <Textarea
                    className="min-h-[72px] border-amber-200 bg-amber-50"
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Internal note"
                    value={note}
                  />
                  <Button
                    disabled={isPending || !note.trim()}
                    onClick={() => void sendMessage(true)}
                    type="button"
                    variant="outline"
                  >
                    <NotebookPen aria-hidden="true" className="h-4 w-4" />
                    Add note
                  </Button>
                  <Button onClick={() => void requestRating()} type="button" variant="outline">
                    <Star aria-hidden="true" className="h-4 w-4" />
                    Rating
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[560px] items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Select a conversation from the inbox.
            </div>
          )}
        </section>

        <aside className="rounded-lg border border-border/80 bg-card p-5 shadow-soft">
          {selectedConversation ? (
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserRoundCheck aria-hidden="true" className="h-5 w-5 text-accent" />
                  <h3 className="text-base font-semibold text-foreground">Customer</h3>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>{selectedConversation.visitor.name ?? "Unnamed visitor"}</p>
                  <p>{selectedConversation.visitor.email ?? "No email"}</p>
                  <p>{selectedConversation.visitor.phone ?? "No phone"}</p>
                  <p>{selectedConversation.visitor.company ?? "No company"}</p>
                </div>
              </section>
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText aria-hidden="true" className="h-5 w-5 text-accent" />
                  <h3 className="text-base font-semibold text-foreground">Context</h3>
                </div>
                <div className="space-y-2 break-words text-sm text-muted-foreground">
                  <p>Current: {selectedConversation.currentPageUrl ?? "Unknown"}</p>
                  <p>Initial: {selectedConversation.initialPageUrl ?? "Unknown"}</p>
                  <p>Referrer: {selectedConversation.referrerUrl ?? "Direct"}</p>
                  <p>First seen: {formatTime(selectedConversation.createdAt)}</p>
                  <p>Last seen: {formatTime(selectedConversation.visitor.lastSeenAt)}</p>
                  <p>Browser: {selectedConversation.visitor.userAgent ?? "Unknown"}</p>
                </div>
              </section>
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">History</h3>
                {detail?.history.length ? (
                  <div className="space-y-2">
                    {detail.history.map((item) => (
                      <div key={item.id} className="rounded-md border border-border bg-background p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge label={item.status} status={item.status} />
                          <span className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-muted-foreground">{item.lastMessagePreview ?? "No preview"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No previous conversations.</p>
                )}
              </section>
              <section className="space-y-3">
                <h3 className="text-base font-semibold text-foreground">Ratings</h3>
                {detail?.ratings.length ? (
                  detail.ratings.map((rating) => (
                    <div key={rating.id} className="rounded-md border border-border bg-background p-3 text-sm">
                      <p className="font-semibold text-foreground">{rating.rating}/5</p>
                      <p className="mt-1 text-muted-foreground">{rating.feedback ?? "No feedback"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No ratings yet.</p>
                )}
              </section>
              {!canManage ? (
                <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  Support agents can reply, note, assign available chats, and manage their own status.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Conversation context appears here.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

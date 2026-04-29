"use client";

import {Download, WifiOff} from "lucide-react";

import {ChatInput} from "@/components/live-chat/ChatInput";
import {ChatMessages} from "@/components/live-chat/ChatMessages";
import {PreChatForm} from "@/components/live-chat/PreChatForm";
import {RatingPrompt} from "@/components/live-chat/RatingPrompt";
import {
  type LiveChatAttachment,
  type LiveChatConversationDetail,
  type LiveChatPublicConfig
} from "@/lib/live-chat/types";
import {downloadLiveChatTranscript} from "@/lib/live-chat/client";

type ChatWindowProps = {
  config: LiveChatPublicConfig | null;
  conversation: LiveChatConversationDetail | null;
  error: string | null;
  isLoading: boolean;
  isOffline: boolean;
  isSending: boolean;
  onRate: (rating: number, feedback?: string | null) => Promise<void>;
  onSend: (body: string, attachments: LiveChatAttachment[]) => Promise<void>;
  onStart: (input: {
    departmentId?: string | null;
    email?: string | null;
    message: string;
    name?: string | null;
  }) => Promise<void>;
  onUpload: (file: File) => Promise<LiveChatAttachment>;
};

function replyText(minutes: number) {
  if (minutes < 60) {
    return `Typically replies in ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  return `Typically replies in ${hours} hr`;
}

export function ChatWindow({
  config,
  conversation,
  error,
  isLoading,
  isOffline,
  isSending,
  onRate,
  onSend,
  onStart,
  onUpload
}: ChatWindowProps) {
  const settings = config?.settings;
  const showRating =
    Boolean(settings?.csatEnabled) &&
    conversation &&
    ["resolved", "closed"].includes(conversation.status) &&
    conversation.ratings.length === 0;

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[0_24px_70px_rgba(17,29,21,0.24)]">
      <header className="bg-primary px-4 py-4 text-primary-foreground">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Travel support</p>
            <p className="mt-1 text-xs text-primary-foreground/75">
              {settings ? replyText(settings.typicalReplyMinutes) : "Loading..."}
            </p>
          </div>
          {isOffline ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/12 px-2.5 py-1 text-xs">
              <WifiOff aria-hidden="true" className="h-3.5 w-3.5" />
              Offline
            </span>
          ) : (
            <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-xs text-emerald-50">
              Online
            </span>
          )}
        </div>
        {conversation && settings?.transcriptEnabled ? (
          <button
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
            onClick={() => void downloadLiveChatTranscript(conversation.id)}
            type="button"
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5" />
            Transcript
          </button>
        ) : null}
      </header>

      {error ? (
        <div className="border-b border-border bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted/80" />
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : conversation ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto bg-background/70">
            <ChatMessages messages={conversation.messages} />
          </div>
          {showRating ? (
            <RatingPrompt onRate={onRate} />
          ) : (
            <ChatInput
              allowAttachments={Boolean(settings?.allowAttachments)}
              disabled={["closed", "spam"].includes(conversation.status)}
              isSending={isSending}
              onSend={onSend}
              onUpload={onUpload}
            />
          )}
        </>
      ) : settings && config ? (
        <PreChatForm
          departments={config.departments}
          initialEmail={config.visitor.email}
          initialName={config.visitor.name}
          isOffline={isOffline}
          isSending={isSending}
          onStart={onStart}
          requireEmail={settings.requirePrechatEmail}
          welcomeMessage={isOffline ? settings.offlineMessage : settings.welcomeMessage}
        />
      ) : null}
    </section>
  );
}

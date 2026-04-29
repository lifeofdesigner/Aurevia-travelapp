"use client";

import {useEffect, useRef} from "react";
import {Paperclip} from "lucide-react";

import {getLiveChatAttachmentUrl} from "@/lib/live-chat/client";
import {type LiveChatMessage} from "@/lib/live-chat/types";
import {cn} from "@/lib/utils";

type ChatMessagesProps = {
  messages: LiveChatMessage[];
};

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
}

export function ChatMessages({messages}: ChatMessagesProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({block: "end", behavior: "smooth"});
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Start the conversation when you are ready.
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-5">
      {messages.map((message) => {
        const isVisitor = message.sender.type === "visitor" || message.sender.type === "user";
        const isSystem = message.sender.type === "system" || message.messageType === "rating_request";

        if (isSystem) {
          return (
            <div key={message.id} className="mx-auto max-w-[88%] rounded-md bg-muted px-3 py-2 text-center text-xs leading-5 text-muted-foreground">
              {message.body}
            </div>
          );
        }

        return (
          <div
            key={message.id}
            className={cn("flex", isVisitor ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[82%] rounded-lg px-4 py-3 text-sm shadow-sm",
                isVisitor
                  ? "bg-primary text-primary-foreground"
                  : message.isInternalNote
                    ? "border border-amber-200 bg-amber-50 text-amber-900"
                    : "border border-border/80 bg-card text-card-foreground"
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-4 text-[11px] opacity-75">
                <span className="font-semibold">{message.sender.label}</span>
                <span>{formatTime(message.createdAt)}</span>
              </div>
              {message.body ? (
                <p className="whitespace-pre-wrap break-words leading-6">{message.body}</p>
              ) : null}
              {message.attachments.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium",
                        isVisitor
                          ? "border-primary-foreground/30 bg-primary-foreground/10"
                          : "border-border bg-background"
                      )}
                      href={getLiveChatAttachmentUrl(attachment.id)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
                      <span className="truncate">{attachment.fileName}</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

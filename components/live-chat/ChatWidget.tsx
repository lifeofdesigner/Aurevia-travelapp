"use client";

import {useEffect, useState} from "react";
import {usePathname} from "next/navigation";

import {ChatLauncher} from "@/components/live-chat/ChatLauncher";
import {ChatWindow} from "@/components/live-chat/ChatWindow";
import {useLiveChatWidget} from "@/hooks/useLiveChatWidget";
import {cn} from "@/lib/utils";

const HIDDEN_PATH_PARTS = [
  "/admin",
  "/admin-login",
  "/dashboard",
  "/checkout",
  "/payments",
  "/setup",
  "/auth"
];

function isHiddenPath(pathname: string | null) {
  if (!pathname) {
    return false;
  }

  return HIDDEN_PATH_PARTS.some((part) => pathname.includes(part));
}

export function ChatWidget() {
  const pathname = usePathname();

  if (isHiddenPath(pathname)) {
    return null;
  }

  return <ChatWidgetInner />;
}

function ChatWidgetInner() {
  const [isOpen, setIsOpen] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const chat = useLiveChatWidget();
  const position = chat.config?.settings.widgetPosition ?? "bottom-right";
  const hidden = chat.config?.settings.widgetEnabled === false;

  useEffect(() => {
    if (!chat.config?.settings.proactiveChatEnabled || chat.conversation || hidden) {
      return;
    }

    const timer = window.setTimeout(() => setInviteVisible(true), 18_000);

    function handleMouseOut(event: MouseEvent) {
      if (event.clientY <= 0) {
        setInviteVisible(true);
      }
    }

    window.addEventListener("mouseout", handleMouseOut);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, [chat.config?.settings.proactiveChatEnabled, chat.conversation, hidden]);

  if (hidden) {
    return null;
  }

  return (
    <>
      {inviteVisible && !isOpen ? (
        <button
          className={cn(
            "fixed bottom-24 z-40 max-w-[18rem] rounded-lg border border-border bg-card p-4 text-left text-sm text-card-foreground shadow-soft",
            position === "bottom-left" ? "left-5" : "right-5"
          )}
          onClick={() => {
            setIsOpen(true);
            setInviteVisible(false);
            chat.setHasInteracted(true);
          }}
          type="button"
        >
          <span className="block font-semibold">Need travel help?</span>
          <span className="mt-1 block text-muted-foreground">
            {chat.config?.settings.welcomeMessage ?? "Our team is here."}
          </span>
        </button>
      ) : null}

      {isOpen ? (
        <div
          className={cn(
            "fixed inset-x-3 bottom-24 z-50 h-[min(680px,calc(100dvh-7rem))] sm:inset-x-auto sm:w-[390px]",
            position === "bottom-left" ? "sm:left-5" : "sm:right-5"
          )}
        >
          <ChatWindow
            config={chat.config}
            conversation={chat.conversation}
            error={chat.error}
            isLoading={chat.isLoading}
            isOffline={chat.isOffline}
            isSending={chat.isSending}
            onRate={chat.rate}
            onSend={chat.send}
            onStart={chat.start}
            onUpload={chat.uploadAttachment}
          />
        </div>
      ) : null}

      <ChatLauncher
        isOpen={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
          setInviteVisible(false);
          chat.setHasInteracted(true);
        }}
        position={position}
        unreadCount={chat.unreadCount}
      />
    </>
  );
}

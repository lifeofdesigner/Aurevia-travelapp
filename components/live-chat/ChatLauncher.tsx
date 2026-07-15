"use client";

import {MessageCircle, X} from "lucide-react";

import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

type ChatLauncherProps = {
  isOpen: boolean;
  onClick: () => void;
  position: "bottom-left" | "bottom-right";
  unreadCount: number;
};

export function ChatLauncher({
  isOpen,
  onClick,
  position,
  unreadCount
}: ChatLauncherProps) {
  return (
    <Button
      aria-label={isOpen ? "Close chat" : "Open chat"}
      className={cn(
        "fixed bottom-5 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-soft hover:bg-primary-light",
        position === "bottom-left" ? "left-5" : "right-5"
      )}
      onClick={onClick}
      size="icon"
      type="button"
    >
      {isOpen ? (
        <X aria-hidden="true" className="h-6 w-6" />
      ) : (
        <MessageCircle aria-hidden="true" className="h-6 w-6" />
      )}
      {unreadCount > 0 && !isOpen ? (
        <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Button>
  );
}

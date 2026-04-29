"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {toast} from "sonner";

import {
  getLiveChatConfig,
  getLiveChatConversation,
  markLiveChatConversationRead,
  sendLiveChatMessage,
  startLiveChatConversation,
  submitLiveChatRating,
  uploadLiveChatAttachment
} from "@/lib/live-chat/client";
import {
  type LiveChatAttachment,
  type LiveChatConversationDetail,
  type LiveChatPublicConfig
} from "@/lib/live-chat/types";
import {createSupabaseBrowserClient} from "@/lib/supabase/browser";

type StartInput = {
  company?: string | null;
  departmentId?: string | null;
  email?: string | null;
  message: string;
  name?: string | null;
  phone?: string | null;
};

function pageContext() {
  if (typeof window === "undefined") {
    return {
      currentPageUrl: null,
      initialPageUrl: null,
      referrerUrl: null
    };
  }

  return {
    currentPageUrl: window.location.href,
    initialPageUrl: window.location.href,
    referrerUrl: document.referrer || null
  };
}

function playSoftNotification() {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 720;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    window.setTimeout(() => {
      oscillator.stop();
      void audioContext.close();
    }, 120);
  } catch {
    // Browsers can block audio until user interaction; that is expected.
  }
}

export function useLiveChatWidget() {
  const [config, setConfig] = useState<LiveChatPublicConfig | null>(null);
  const [conversation, setConversation] = useState<LiveChatConversationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  const unreadCount = conversation?.unreadByVisitor ?? 0;
  const isOffline = Boolean(config && (!config.businessHoursAvailable || config.onlineAgentCount === 0));
  const latestMessage = conversation?.messages[conversation.messages.length - 1] ?? null;

  const refreshConversation = useCallback(async (conversationId: string, notify = false) => {
    const next = await getLiveChatConversation(conversationId);
    const lastMessageId = next.messages[next.messages.length - 1]?.id ?? null;
    const currentLastMessageId = lastMessageIdRef.current;

    setConversation(next);

    if (
      notify &&
      lastMessageId &&
      currentLastMessageId &&
      lastMessageId !== currentLastMessageId &&
      next.messages[next.messages.length - 1]?.sender.type === "agent"
    ) {
      if (hasInteracted && config?.settings.soundEnabled) {
        playSoftNotification();
      }

      toast.message("New support reply", {
        description: next.messages[next.messages.length - 1]?.body ?? "A new chat update arrived."
      });

      if (
        hasInteracted &&
        config?.settings.browserNotificationsEnabled &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("New support reply", {
          body: next.messages[next.messages.length - 1]?.body ?? "A new chat update arrived."
        });
      }
    }

    lastMessageIdRef.current = lastMessageId;
    return next;
  }, [config?.settings.browserNotificationsEnabled, config?.settings.soundEnabled, hasInteracted]);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const nextConfig = await getLiveChatConfig();

        if (!mounted) {
          return;
        }

        setConfig(nextConfig);

        if (nextConfig.activeConversationId) {
          const nextConversation = await getLiveChatConversation(nextConfig.activeConversationId);

          if (mounted) {
            setConversation(nextConversation);
            lastMessageIdRef.current = nextConversation.messages[nextConversation.messages.length - 1]?.id ?? null;
          }
        }
      } catch (bootError) {
        if (mounted) {
          setError(bootError instanceof Error ? bootError.message : "Unable to load live chat.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void boot();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!conversation?.id) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`live-chat-events-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `conversation_id=eq.${conversation.id}`,
          schema: "public",
          table: "live_chat_events"
        },
        () => {
          void refreshConversation(conversation.id, true);
        }
      )
      .subscribe();

    pollingRef.current = window.setInterval(() => {
      void refreshConversation(conversation.id, true);
    }, 12000);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }

      void supabase.removeChannel(channel);
    };
  }, [conversation?.id, refreshConversation]);

  useEffect(() => {
    if (!conversation?.id || unreadCount === 0) {
      return;
    }

    void markLiveChatConversationRead(conversation.id);
  }, [conversation?.id, unreadCount]);

  const start = useCallback(async (input: StartInput) => {
    setHasInteracted(true);
    setIsSending(true);
    setError(null);

    try {
      const nextConversation = await startLiveChatConversation({
        ...input,
        ...pageContext()
      });
      setConversation(nextConversation);
      lastMessageIdRef.current = nextConversation.messages[nextConversation.messages.length - 1]?.id ?? null;

      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Unable to start chat.");
      throw startError;
    } finally {
      setIsSending(false);
    }
  }, []);

  const send = useCallback(async (body: string, attachments: LiveChatAttachment[] = []) => {
    if (!conversation?.id) {
      return;
    }

    setHasInteracted(true);
    setIsSending(true);
    setError(null);

    try {
      const nextConversation = await sendLiveChatMessage(conversation.id, {
        attachments,
        body,
        currentPageUrl: pageContext().currentPageUrl
      });
      setConversation(nextConversation);
      lastMessageIdRef.current = nextConversation.messages[nextConversation.messages.length - 1]?.id ?? null;
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
      throw sendError;
    } finally {
      setIsSending(false);
    }
  }, [conversation?.id]);

  const uploadAttachment = useCallback(async (file: File) => {
    if (!conversation?.id) {
      throw new Error("Start a conversation before uploading an attachment.");
    }

    setHasInteracted(true);
    return uploadLiveChatAttachment(conversation.id, file);
  }, [conversation?.id]);

  const rate = useCallback(async (rating: number, feedback?: string | null) => {
    if (!conversation?.id) {
      return;
    }

    await submitLiveChatRating(conversation.id, {feedback, rating});
    await refreshConversation(conversation.id);
  }, [conversation?.id, refreshConversation]);

  const value = useMemo(() => ({
    config,
    conversation,
    error,
    hasInteracted,
    isLoading,
    isOffline,
    isSending,
    isTyping,
    latestMessage,
    rate,
    send,
    setHasInteracted,
    setIsTyping,
    start,
    unreadCount,
    uploadAttachment
  }), [
    config,
    conversation,
    error,
    hasInteracted,
    isLoading,
    isOffline,
    isSending,
    isTyping,
    latestMessage,
    rate,
    send,
    start,
    unreadCount,
    uploadAttachment
  ]);

  return value;
}

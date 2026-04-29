"use client";

import {Paperclip, SendHorizontal, X} from "lucide-react";
import {useRef, useState} from "react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {type LiveChatAttachment} from "@/lib/live-chat/types";

type ChatInputProps = {
  allowAttachments: boolean;
  disabled?: boolean;
  isSending: boolean;
  onSend: (body: string, attachments: LiveChatAttachment[]) => Promise<void>;
  onUpload: (file: File) => Promise<LiveChatAttachment>;
};

export function ChatInput({
  allowAttachments,
  disabled,
  isSending,
  onSend,
  onUpload
}: ChatInputProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<LiveChatAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  async function submit() {
    const nextBody = body.trim();

    if (!nextBody && attachments.length === 0) {
      return;
    }

    await onSend(nextBody, attachments);
    setBody("");
    setAttachments([]);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      const attachment = await onUpload(file);
      setAttachments((current) => [...current, attachment]);
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Please try another file."
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="border-t border-border bg-card p-3">
      <input
        ref={fileRef}
        className="sr-only"
        disabled={disabled || isUploading || !allowAttachments}
        onChange={handleFileChange}
        type="file"
      />
      {attachments.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <span
              key={attachment.id}
              className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
            >
              <span className="truncate">{attachment.fileName}</span>
              <button
                aria-label={`Remove ${attachment.fileName}`}
                className="text-foreground"
                onClick={() =>
                  setAttachments((current) => current.filter((item) => item.id !== attachment.id))
                }
                type="button"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <Button
          aria-label="Attach file"
          disabled={disabled || isUploading || !allowAttachments}
          onClick={() => fileRef.current?.click()}
          size="icon"
          type="button"
          variant="outline"
        >
          <Paperclip aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Textarea
          className="max-h-32 min-h-[44px] resize-none rounded-md px-3 py-2"
          disabled={disabled || isSending}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Write a message"
          value={body}
        />
        <Button
          aria-label="Send message"
          disabled={disabled || isSending || (!body.trim() && attachments.length === 0)}
          onClick={() => void submit()}
          size="icon"
          type="button"
        >
          <SendHorizontal aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

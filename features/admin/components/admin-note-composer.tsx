"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";

type AdminNoteComposerProps = {
  entityId: string;
  entityType: string;
};

export function AdminNoteComposer({entityId, entityType}: AdminNoteComposerProps) {
  const router = useRouter();
  const t = useTranslations("Admin.notes");
  const [isPending, setIsPending] = useState(false);
  const [title, setTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [isVisibleToCustomer, setIsVisibleToCustomer] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);

    try {
      const response = await fetch("/api/admin/notes", {
        body: JSON.stringify({
          entityId,
          entityType,
          isVisibleToCustomer,
          noteBody,
          title
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? t("saveErrorDescription"));
      }

      toast.success(t("saveSuccessTitle"), {
        description: t("saveSuccessDescription")
      });
      setTitle("");
      setNoteBody("");
      setIsVisibleToCustomer(false);
      router.refresh();
    } catch (error) {
      toast.error(t("saveErrorTitle"), {
        description:
          error instanceof Error ? error.message : t("saveErrorDescription")
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="note-title">{t("titleLabel")}</Label>
        <Input
          id="note-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("titlePlaceholder")}
          value={title}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="note-body">{t("bodyLabel")}</Label>
        <Textarea
          id="note-body"
          onChange={(event) => setNoteBody(event.target.value)}
          placeholder={t("bodyPlaceholder")}
          required
          value={noteBody}
        />
      </div>
      <label className="flex items-center gap-3 text-sm text-muted-foreground">
        <input
          checked={isVisibleToCustomer}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          onChange={(event) => setIsVisibleToCustomer(event.target.checked)}
          type="checkbox"
        />
        <span>{t("visibleToCustomerLabel")}</span>
      </label>
      <Button disabled={isPending} type="submit">
        {isPending ? t("saving") : t("saveAction")}
      </Button>
    </form>
  );
}

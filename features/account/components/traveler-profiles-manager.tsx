"use client";

import {Pencil, Plus, Star, Trash2} from "lucide-react";
import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {ConfirmDialog} from "@/components/shared/feedback/confirm-dialog";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

import {type CountryOption, type TravelerProfileRecord} from "../types";
import {TravelerProfileForm} from "./traveler-profile-form";

type TravelerProfilesManagerProps = {
  countries: CountryOption[];
  travelers: TravelerProfileRecord[];
};

export function TravelerProfilesManager({
  countries,
  travelers
}: TravelerProfilesManagerProps) {
  const t = useTranslations("Dashboard.travelers");
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTravelerId, setEditingTravelerId] = useState<string | null>(null);
  const [deletingTravelerId, setDeletingTravelerId] = useState<string | null>(null);
  const [isDeletePending, setIsDeletePending] = useState(false);

  async function handleDelete(travelerId: string) {
    setIsDeletePending(true);

    try {
      const response = await fetch(`/api/account/travelers/${travelerId}`, {
        method: "DELETE"
      });
      const result = (await response.json()) as {message?: string};

      if (!response.ok) {
        toast.error(t("deleteErrorTitle"), {
          description: result.message ?? t("deleteErrorDescription")
        });
        return;
      }

      setDeletingTravelerId(null);
      toast.success(t("deleteSuccessTitle"), {
        description: t("deleteSuccessDescription")
      });
      router.refresh();
    } finally {
      setIsDeletePending(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-display text-3xl text-foreground">{t("title")}</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{t("body")}</p>
        </div>
        <Button
          type="button"
          className="rounded-lg px-5"
          onClick={() => {
            setEditingTravelerId(null);
            setIsCreateOpen((current) => !current);
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t("addAction")}
        </Button>
      </div>

      {isCreateOpen ? (
        <Card className="border-border/80 bg-card/92 shadow-soft">
          <CardHeader>
            <CardTitle>{t("createCardTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TravelerProfileForm
              countries={countries}
              onCancel={() => setIsCreateOpen(false)}
              onSuccess={() => setIsCreateOpen(false)}
            />
          </CardContent>
        </Card>
      ) : null}

      {travelers.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-background/70">
          <CardContent className="space-y-3 p-6">
            <p className="font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="text-sm leading-7 text-muted-foreground">{t("emptyBody")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {travelers.map((traveler) => {
            const isEditing = editingTravelerId === traveler.id;

            return (
              <Card key={traveler.id} className="border-border/80 bg-card/92 shadow-soft">
                <CardHeader className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-2xl">
                          {traveler.firstName} {traveler.lastName}
                        </CardTitle>
                        {traveler.isPrimary ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                            <Star aria-hidden="true" className="h-3.5 w-3.5" />
                            {t("primaryBadge")}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-7 text-muted-foreground">
                        {traveler.relationshipLabel || t("relationshipFallback")} |{" "}
                        {t(`travelerTypeOptions.${traveler.travelerType}`)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg px-4"
                        onClick={() =>
                          setEditingTravelerId((current) =>
                            current === traveler.id ? null : traveler.id
                          )
                        }
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                        {t("editAction")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-lg px-4 text-destructive hover:text-destructive"
                        onClick={() => setDeletingTravelerId(traveler.id)}
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                        {t("deleteAction")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {t("emailLabel")}
                      </p>
                      <p className="mt-2 font-medium text-foreground">
                        {traveler.email || t("emptyValue")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {t("phoneLabel")}
                      </p>
                      <p className="mt-2 font-medium text-foreground">
                        {traveler.phone || t("emptyValue")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {t("nationalityLabel")}
                      </p>
                      <p className="mt-2 font-medium text-foreground">
                        {traveler.nationalityCountryCode || t("emptyValue")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {t("documentTitle")}
                      </p>
                      <p className="mt-2 font-medium text-foreground">
                        {traveler.primaryDocument
                          ? t(`documentTypeOptions.${traveler.primaryDocument.documentType}`)
                          : t("documentEmpty")}
                      </p>
                    </div>
                  </div>

                  {traveler.specialAssistanceNotes ? (
                    <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {t("specialAssistanceNotesLabel")}
                      </p>
                      <p className="mt-2 leading-7 text-foreground">
                        {traveler.specialAssistanceNotes}
                      </p>
                    </div>
                  ) : null}

                  {isEditing ? (
                    <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                      <TravelerProfileForm
                        countries={countries}
                        initialValues={traveler}
                        onCancel={() => setEditingTravelerId(null)}
                        onSuccess={() => setEditingTravelerId(null)}
                        travelerId={traveler.id}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>

      {deletingTravelerId ? (
        <ConfirmDialog
          cancelLabel={t("cancelAction")}
          confirmLabel={t("deleteAction")}
          description={t("deleteConfirm")}
          isPending={isDeletePending}
          onCancel={() => setDeletingTravelerId(null)}
          onConfirm={() => void handleDelete(deletingTravelerId)}
          pendingLabel={t("deletingAction")}
          title={t("deleteAction")}
        />
      ) : null}
    </>
  );
}

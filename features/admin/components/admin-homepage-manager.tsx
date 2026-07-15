"use client";

import {useEffect, useMemo, useState} from "react";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  GripVertical,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2
} from "lucide-react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {ImageUpload} from "@/components/admin/image-upload";
import {Button} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import type {
  AdminHomepageBannerRecord,
  AdminHomepageData,
  AdminHomepageDealRecord,
  AdminHomepageDestinationRecord,
  AdminHomepageHeroRecord,
  AdminHomepageSettingsRecord
} from "@/features/admin/lib/homepage-types";
import {cn} from "@/lib/utils";
import type {SupportedCurrency} from "@/lib/money";

type HomepageTab = "banners" | "deals" | "destinations" | "hero" | "settings";
type ManagedSection = "banners" | "deals" | "destinations";
type SortableRecord = {id: string; sortOrder: number};

type DeleteState = {
  id: string;
  label: string;
  section: ManagedSection;
} | null;

type AdminHomepageManagerProps = {
  initialData: AdminHomepageData;
};

const tabs: Array<{id: HomepageTab; label: string}> = [
  {id: "hero", label: "Hero"},
  {id: "banners", label: "Promotional Banners"},
  {id: "destinations", label: "Featured Destinations"},
  {id: "deals", label: "Flight Deals"},
  {id: "settings", label: "General Settings"}
];

const currencyOptions: SupportedCurrency[] = ["EUR", "USD", "GBP", "AED", "NGN"];

function sortByOrder<T extends SortableRecord>(items: T[]) {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

function withSequentialSortOrder<T extends SortableRecord>(items: T[]) {
  return items.map((item, index) => ({
    ...item,
    sortOrder: index
  }));
}

function moveByIds<T extends SortableRecord>(items: T[], sourceId: string, targetId: string) {
  const ordered = sortByOrder(items);
  const sourceIndex = ordered.findIndex((item) => item.id === sourceId);
  const targetIndex = ordered.findIndex((item) => item.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return ordered;
  }

  const next = [...ordered];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return withSequentialSortOrder(next);
}

function moveByOffset<T extends SortableRecord>(items: T[], sourceId: string, offset: -1 | 1) {
  const ordered = sortByOrder(items);
  const sourceIndex = ordered.findIndex((item) => item.id === sourceId);
  const targetIndex = sourceIndex + offset;

  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
    return ordered;
  }

  const next = [...ordered];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return withSequentialSortOrder(next);
}

function upsertRecord<T extends SortableRecord>(items: T[], record: T) {
  const nextItems = items.some((item) => item.id === record.id)
    ? items.map((item) => (item.id === record.id ? record : item))
    : [...items, record];

  return sortByOrder(nextItems);
}

function removeRecord<T extends SortableRecord>(items: T[], id: string) {
  return withSequentialSortOrder(items.filter((item) => item.id !== id));
}

function toNullableString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function toNullableNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateTimeInputValue(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

function createBannerDraft(sortOrder: number): Omit<AdminHomepageBannerRecord, "id"> {
  return {
    ctaLink: null,
    ctaText: null,
    endsAt: null,
    imageUrl: null,
    isActive: true,
    sortOrder,
    startsAt: null,
    subtitle: null,
    title: ""
  };
}

function createDestinationDraft(sortOrder: number): Omit<AdminHomepageDestinationRecord, "id"> {
  return {
    city: "",
    country: "",
    hotelsCount: null,
    imageUrl: null,
    isActive: true,
    link: null,
    priceLabel: null,
    sortOrder
  };
}

function createDealDraft(sortOrder: number): Omit<AdminHomepageDealRecord, "id"> {
  return {
    airlineName: "",
    currency: "EUR",
    destinationCity: "",
    destinationCode: "",
    expiresAt: null,
    fareType: null,
    imageUrl: null,
    isActive: true,
    originCity: "",
    originCode: "",
    price: 0,
    sortOrder
  };
}

function getRecordImageUrl(record: {
  imageUrl: string | null;
}) {
  return record.imageUrl
    ? {backgroundImage: `linear-gradient(rgba(17, 29, 21, 0.12), rgba(17, 29, 21, 0.18)), url(${record.imageUrl})`}
    : undefined;
}

function ConfirmDeleteDialog({
  deleteState,
  isPending,
  onCancel,
  onConfirm
}: {
  deleteState: DeleteState;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!deleteState) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/55 px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Delete item
          </p>
          <h2 className="font-display text-[28px] italic text-card-foreground">
            Remove this entry?
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            This will permanently delete <span className="font-semibold text-foreground">{deleteState.label}</span> from the homepage manager.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            {isPending ? "Deleting..." : "Delete item"}
          </Button>
          <Button disabled={isPending} onClick={onCancel} type="button" variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminHomepageManager({initialData}: AdminHomepageManagerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HomepageTab>("hero");
  const [hero, setHero] = useState(initialData.hero);
  const [settings, setSettings] = useState(initialData.settings);
  const [banners, setBanners] = useState(sortByOrder(initialData.banners));
  const [destinations, setDestinations] = useState(sortByOrder(initialData.destinations));
  const [deals, setDeals] = useState(sortByOrder(initialData.deals));
  const [editingBanner, setEditingBanner] = useState<
    (Omit<AdminHomepageBannerRecord, "id"> & {id?: string}) | null
  >(null);
  const [editingDestination, setEditingDestination] = useState<
    (Omit<AdminHomepageDestinationRecord, "id"> & {id?: string}) | null
  >(null);
  const [editingDeal, setEditingDeal] = useState<
    (Omit<AdminHomepageDealRecord, "id"> & {id?: string}) | null
  >(null);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [isHeroSaving, setIsHeroSaving] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [isBannerSaving, setIsBannerSaving] = useState(false);
  const [isDestinationSaving, setIsDestinationSaving] = useState(false);
  const [isDealSaving, setIsDealSaving] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  useEffect(() => {
    setHero(initialData.hero);
    setSettings(initialData.settings);
    setBanners(sortByOrder(initialData.banners));
    setDestinations(sortByOrder(initialData.destinations));
    setDeals(sortByOrder(initialData.deals));
  }, [initialData]);

  const orderedBanners = useMemo(() => sortByOrder(banners), [banners]);
  const orderedDestinations = useMemo(() => sortByOrder(destinations), [destinations]);
  const orderedDeals = useMemo(() => sortByOrder(deals), [deals]);

  async function postMutation(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/homepage", {
      body: JSON.stringify(body),
      headers: {"Content-Type": "application/json"},
      method: "POST"
    });
    const payload = (await response.json()) as Record<string, unknown> & {message?: string};

    if (!response.ok) {
      throw new Error(payload.message ?? "Unable to save homepage content.");
    }

    return payload;
  }

  async function handleSaveHero() {
    setIsHeroSaving(true);

    try {
      const payload = await postMutation({
        action: "save",
        payload: {
          ...hero,
          bgImageUrl: toNullableString(hero.bgImageUrl),
          ctaLink: hero.ctaLink.trim(),
          ctaText: hero.ctaText.trim(),
          headline: hero.headline.trim(),
          subheadline: hero.subheadline.trim()
        },
        section: "hero"
      });

      const nextHero = payload.hero as AdminHomepageHeroRecord;
      setHero(nextHero);
      toast.success("Hero updated", {
        description: "The homepage hero now reflects the latest content."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to save hero", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsHeroSaving(false);
    }
  }

  async function handleSaveSettings() {
    setIsSettingsSaving(true);

    try {
      const payload = await postMutation({
        action: "save",
        payload: {
          ctaDescription: settings.ctaDescription.trim(),
          ctaHeadline: settings.ctaHeadline.trim(),
          footerTagline: settings.footerTagline.trim(),
          stats: settings.stats.map((stat) => ({
            label: stat.label.trim(),
            value: stat.value.trim()
          })),
          trustItems: settings.trustItems.map((item) => item.trim()),
          whyDescription: settings.whyDescription.trim(),
          whyHeadline: settings.whyHeadline.trim()
        },
        section: "settings"
      });

      const nextSettings = payload.settings as AdminHomepageSettingsRecord;
      setSettings(nextSettings);
      toast.success("General settings saved", {
        description: "Homepage trust, stats, CTA, and footer copy have been updated."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to save general settings", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsSettingsSaving(false);
    }
  }

  async function handleSaveBanner() {
    if (!editingBanner) {
      return;
    }

    setIsBannerSaving(true);

    try {
      const payload = await postMutation({
        action: "save",
        payload: {
          ...editingBanner,
          ctaLink: toNullableString(editingBanner.ctaLink),
          ctaText: toNullableString(editingBanner.ctaText),
          endsAt: toNullableString(editingBanner.endsAt),
          imageUrl: toNullableString(editingBanner.imageUrl),
          startsAt: toNullableString(editingBanner.startsAt),
          subtitle: toNullableString(editingBanner.subtitle),
          title: editingBanner.title.trim()
        },
        section: "banners"
      });

      const savedBanner = payload.banner as AdminHomepageBannerRecord;
      setBanners((current) => upsertRecord(current, savedBanner));
      setEditingBanner(null);
      toast.success(editingBanner.id ? "Banner updated" : "Banner created", {
        description: "The promotional banner is now live in the homepage manager."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to save banner", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsBannerSaving(false);
    }
  }

  async function handleSaveDestination() {
    if (!editingDestination) {
      return;
    }

    setIsDestinationSaving(true);

    try {
      const payload = await postMutation({
        action: "save",
        payload: {
          ...editingDestination,
          city: editingDestination.city.trim(),
          country: editingDestination.country.trim(),
          hotelsCount: editingDestination.hotelsCount,
          imageUrl: toNullableString(editingDestination.imageUrl),
          link: toNullableString(editingDestination.link),
          priceLabel: toNullableString(editingDestination.priceLabel)
        },
        section: "destinations"
      });

      const savedDestination = payload.destination as AdminHomepageDestinationRecord;
      setDestinations((current) => upsertRecord(current, savedDestination));
      setEditingDestination(null);
      toast.success(
        editingDestination.id ? "Destination updated" : "Destination created",
        {
          description: "The homepage destination grid has been refreshed."
        }
      );
      router.refresh();
    } catch (error) {
      toast.error("Unable to save destination", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsDestinationSaving(false);
    }
  }

  async function handleSaveDeal() {
    if (!editingDeal) {
      return;
    }

    setIsDealSaving(true);

    try {
      const payload = await postMutation({
        action: "save",
        payload: {
          ...editingDeal,
          airlineName: editingDeal.airlineName.trim(),
          destinationCity: editingDeal.destinationCity.trim(),
          destinationCode: editingDeal.destinationCode.trim().toUpperCase(),
          expiresAt: toNullableString(editingDeal.expiresAt),
          fareType: toNullableString(editingDeal.fareType),
          imageUrl: toNullableString(editingDeal.imageUrl),
          originCity: editingDeal.originCity.trim(),
          originCode: editingDeal.originCode.trim().toUpperCase(),
          price: editingDeal.price
        },
        section: "deals"
      });

      const savedDeal = payload.deal as AdminHomepageDealRecord;
      setDeals((current) => upsertRecord(current, savedDeal));
      setEditingDeal(null);
      toast.success(editingDeal.id ? "Deal updated" : "Deal created", {
        description: "The homepage deal rail now uses the latest fare card."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to save deal", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsDealSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteState) {
      return;
    }

    setIsDeletePending(true);

    try {
      await postMutation({
        action: "delete",
        id: deleteState.id,
        section: deleteState.section
      });

      if (deleteState.section === "banners") {
        setBanners((current) => removeRecord(current, deleteState.id));
      } else if (deleteState.section === "destinations") {
        setDestinations((current) => removeRecord(current, deleteState.id));
      } else {
        setDeals((current) => removeRecord(current, deleteState.id));
      }

      setDeleteState(null);
      toast.success("Item deleted", {
        description: "The selected homepage record has been removed."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to delete item", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setIsDeletePending(false);
    }
  }

  async function saveReorderedItems<T extends SortableRecord>(
    section: ManagedSection,
    nextItems: T[],
    applyState: React.Dispatch<React.SetStateAction<T[]>>
  ) {
    const previousItems = nextItems;

    try {
      await postMutation({
        action: "reorder",
        items: nextItems.map((item) => ({
          id: item.id,
          sortOrder: item.sortOrder
        })),
        section
      });
      toast.success("Order saved", {
        description: "Homepage ordering has been updated."
      });
      router.refresh();
    } catch (error) {
      applyState(previousItems);
      toast.error("Unable to save order", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  }

  async function handleReorderByDrag(section: ManagedSection, sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      return;
    }

    if (section === "banners") {
      const previousItems = orderedBanners;
      const nextItems = moveByIds(previousItems, sourceId, targetId);
      setBanners(nextItems);
      await saveReorderedItems(section, nextItems, () => setBanners(previousItems));
      return;
    }

    if (section === "destinations") {
      const previousItems = orderedDestinations;
      const nextItems = moveByIds(previousItems, sourceId, targetId);
      setDestinations(nextItems);
      await saveReorderedItems(section, nextItems, () => setDestinations(previousItems));
      return;
    }

    const previousItems = orderedDeals;
    const nextItems = moveByIds(previousItems, sourceId, targetId);
    setDeals(nextItems);
    await saveReorderedItems(section, nextItems, () => setDeals(previousItems));
  }

  async function handleReorderByStep(section: ManagedSection, id: string, offset: -1 | 1) {
    if (section === "banners") {
      const previousItems = orderedBanners;
      const nextItems = moveByOffset(previousItems, id, offset);
      setBanners(nextItems);
      await saveReorderedItems(section, nextItems, () => setBanners(previousItems));
      return;
    }

    if (section === "destinations") {
      const previousItems = orderedDestinations;
      const nextItems = moveByOffset(previousItems, id, offset);
      setDestinations(nextItems);
      await saveReorderedItems(section, nextItems, () => setDestinations(previousItems));
      return;
    }

    const previousItems = orderedDeals;
    const nextItems = moveByOffset(previousItems, id, offset);
    setDeals(nextItems);
    await saveReorderedItems(section, nextItems, () => setDeals(previousItems));
  }

  async function toggleBannerActive(record: AdminHomepageBannerRecord, isActive: boolean) {
    try {
      const payload = await postMutation({
        action: "save",
        payload: {...record, isActive},
        section: "banners"
      });
      setBanners((current) =>
        upsertRecord(current, payload.banner as AdminHomepageBannerRecord)
      );
      toast.success("Banner updated", {
        description: `The banner is now ${isActive ? "active" : "inactive"}.`
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to update banner", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  }

  async function toggleDestinationActive(
    record: AdminHomepageDestinationRecord,
    isActive: boolean
  ) {
    try {
      const payload = await postMutation({
        action: "save",
        payload: {...record, isActive},
        section: "destinations"
      });
      setDestinations((current) =>
        upsertRecord(current, payload.destination as AdminHomepageDestinationRecord)
      );
      toast.success("Destination updated", {
        description: `The destination is now ${isActive ? "active" : "inactive"}.`
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to update destination", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  }

  async function toggleDealActive(record: AdminHomepageDealRecord, isActive: boolean) {
    try {
      const payload = await postMutation({
        action: "save",
        payload: {...record, isActive},
        section: "deals"
      });
      setDeals((current) => upsertRecord(current, payload.deal as AdminHomepageDealRecord));
      toast.success("Deal updated", {
        description: `The deal is now ${isActive ? "active" : "inactive"}.`
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to update deal", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  }

  function renderTabButton(tab: {id: HomepageTab; label: string}) {
    const isActive = activeTab === tab.id;

    return (
      <button
        key={tab.id}
        className={cn(
          "inline-flex min-h-[44px] items-center rounded-md border px-4 py-2 text-sm font-semibold transition-colors",
          isActive
            ? "border-[#1c3d2e] bg-[#1c3d2e] text-white"
            : "border-[#e8e0d0] bg-white text-[#1c3d2e] hover:border-[#c9a84c]"
        )}
        onClick={() => setActiveTab(tab.id)}
        type="button"
      >
        {tab.label}
      </button>
    );
  }

  return (
    <>
      <ConfirmDeleteDialog
        deleteState={deleteState}
        isPending={isDeletePending}
        onCancel={() => setDeleteState(null)}
        onConfirm={handleDelete}
      />

      <div className="space-y-6">
        <Card className="border-[#e8e0d0] bg-white shadow-none">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-wrap gap-3">{tabs.map(renderTabButton)}</div>
          </CardContent>
        </Card>

        {activeTab === "hero" ? (
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <Card className="border-[#e8e0d0] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="font-display text-[30px] italic text-[#1c3d2e]">
                  Homepage hero
                </CardTitle>
                <CardDescription className="text-sm leading-7 text-[#56705f]">
                  Update the hero headline, introduction, CTA, and background image.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="homepage-hero-headline">Headline</Label>
                  <Input
                    id="homepage-hero-headline"
                    onChange={(event) =>
                      setHero((current) => ({
                        ...current,
                        headline: event.target.value
                      }))
                    }
                    value={hero.headline}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homepage-hero-subheadline">Subheadline</Label>
                  <Textarea
                    id="homepage-hero-subheadline"
                    onChange={(event) =>
                      setHero((current) => ({
                        ...current,
                        subheadline: event.target.value
                      }))
                    }
                    value={hero.subheadline}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="homepage-hero-cta-text">CTA text</Label>
                    <Input
                      id="homepage-hero-cta-text"
                      onChange={(event) =>
                        setHero((current) => ({
                          ...current,
                          ctaText: event.target.value
                        }))
                      }
                      value={hero.ctaText}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homepage-hero-cta-link">CTA link</Label>
                    <Input
                      id="homepage-hero-cta-link"
                      onChange={(event) =>
                        setHero((current) => ({
                          ...current,
                          ctaLink: event.target.value
                        }))
                      }
                      value={hero.ctaLink}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Hero background image</Label>
                  <ImageUpload
                    onUploaded={(url) =>
                      setHero((current) => ({
                        ...current,
                        bgImageUrl: url
                      }))
                    }
                    value={hero.bgImageUrl}
                  />
                </div>
                <Button
                  className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                  disabled={isHeroSaving}
                  onClick={handleSaveHero}
                  type="button"
                >
                  {isHeroSaving ? (
                    <>
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                      Saving hero...
                    </>
                  ) : (
                    <>
                      <Save aria-hidden="true" className="h-4 w-4" />
                      Save hero
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-[#e8e0d0] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="font-display text-[30px] italic text-[#1c3d2e]">
                  Hero preview
                </CardTitle>
                <CardDescription className="text-sm leading-7 text-[#56705f]">
                  This is a simplified preview of the marketing hero block.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="overflow-hidden rounded-lg bg-primary"
                  style={
                    hero.bgImageUrl
                      ? {
                          backgroundImage: `linear-gradient(rgba(10, 22, 60, 0.72), rgba(10, 22, 60, 0.8)), url(${hero.bgImageUrl})`,
                          backgroundPosition: "center",
                          backgroundSize: "cover"
                        }
                      : undefined
                  }
                >
                  <div className="space-y-5 px-6 py-8 text-primary-foreground">
                    <span className="inline-flex rounded-[10px] border border-primary-foreground/40 px-4 py-2 text-[11px] tracking-[0.22em]">
                      Location-based concierge
                    </span>
                    <div className="space-y-3">
                      <h2 className="font-display text-[38px] italic leading-[0.96]">
                        {hero.headline || "Your headline preview"}
                      </h2>
                      <p className="max-w-[30rem] text-[13px] leading-6 text-primary-foreground/75">
                        {hero.subheadline || "Your supporting copy preview appears here."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-background px-5 text-[12px] font-semibold text-foreground">
                        {hero.ctaText || "Primary CTA"}
                      </span>
                      <span className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-primary-foreground/25 px-5 text-[12px] font-semibold text-primary-foreground">
                        View Destinations
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "banners" ? (
          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <Card className="border-[#e8e0d0] bg-white shadow-none">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="font-display text-[30px] italic text-[#1c3d2e]">
                    Promotional banners
                  </CardTitle>
                  <CardDescription className="text-sm leading-7 text-[#56705f]">
                    Reorder by dragging the handle or use the arrows for precise placement.
                  </CardDescription>
                </div>
                <Button
                  className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                  onClick={() => setEditingBanner(createBannerDraft(orderedBanners.length))}
                  type="button"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add banner
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderedBanners.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#e8e0d0] bg-[#f7f3ec] p-6 text-center">
                    <p className="font-display text-[24px] italic text-[#1c3d2e]">
                      No banners yet
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#56705f]">
                      Add a promotional banner to surface campaigns or editorial highlights.
                    </p>
                  </div>
                ) : (
                  orderedBanners.map((banner, index) => (
                    <article
                      key={banner.id}
                      className="rounded-lg border border-[#e8e0d0] bg-[#f7f3ec]"
                      draggable
                      onDragStart={() => setDraggedItemId(banner.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={async () => {
                        if (!draggedItemId) {
                          return;
                        }

                        await handleReorderByDrag("banners", draggedItemId, banner.id);
                        setDraggedItemId(null);
                      }}
                    >
                      <div className="grid gap-4 p-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                        <div
                          className="flex h-[120px] items-center justify-center rounded-md border border-[#e8e0d0] bg-white bg-cover bg-center"
                          style={getRecordImageUrl(banner)}
                        >
                          {!banner.imageUrl ? (
                            <ImageIcon aria-hidden="true" className="h-6 w-6 text-[#7a9a85]" />
                          ) : null}
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <GripVertical
                                  aria-hidden="true"
                                  className="h-4 w-4 text-[#c9a84c]"
                                />
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a9a85]">
                                  Drag handle
                                </p>
                              </div>
                              <h3 className="font-display text-[24px] italic text-[#1c3d2e]">
                                {banner.title}
                              </h3>
                              {banner.subtitle ? (
                                <p className="text-sm leading-6 text-[#56705f]">
                                  {banner.subtitle}
                                </p>
                              ) : null}
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#1c3d2e]">
                              <input
                                checked={banner.isActive}
                                className="h-4 w-4 rounded border-[#e8e0d0]"
                                onChange={(event) =>
                                  void toggleBannerActive(banner, event.target.checked)
                                }
                                type="checkbox"
                              />
                              Active
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() =>
                                setEditingBanner({
                                  ...banner
                                })
                              }
                              type="button"
                              variant="outline"
                            >
                              <Pencil aria-hidden="true" className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              onClick={() =>
                                void handleReorderByStep(
                                  "banners",
                                  banner.id,
                                  -1
                                )
                              }
                              type="button"
                              variant="outline"
                            >
                              <ArrowUp aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() =>
                                void handleReorderByStep(
                                  "banners",
                                  banner.id,
                                  1
                                )
                              }
                              type="button"
                              variant="outline"
                            >
                              <ArrowDown aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <Button
                              className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
                              onClick={() =>
                                setDeleteState({
                                  id: banner.id,
                                  label: banner.title,
                                  section: "banners"
                                })
                              }
                              type="button"
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-[#e8e0d0] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="font-display text-[30px] italic text-[#1c3d2e]">
                  {editingBanner?.id ? "Edit banner" : "Create banner"}
                </CardTitle>
                <CardDescription className="text-sm leading-7 text-[#56705f]">
                  Add imagery, schedule, and CTA details for homepage promotion cards.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {editingBanner ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="homepage-banner-title">Title</Label>
                      <Input
                        id="homepage-banner-title"
                        onChange={(event) =>
                          setEditingBanner((current) =>
                            current
                              ? {
                                  ...current,
                                  title: event.target.value
                                }
                              : current
                          )
                        }
                        value={editingBanner.title}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="homepage-banner-subtitle">Subtitle</Label>
                      <Textarea
                        id="homepage-banner-subtitle"
                        onChange={(event) =>
                          setEditingBanner((current) =>
                            current
                              ? {
                                  ...current,
                                  subtitle: event.target.value
                                }
                              : current
                          )
                        }
                        value={editingBanner.subtitle ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Banner image</Label>
                      <ImageUpload
                        onUploaded={(url) =>
                          setEditingBanner((current) =>
                            current
                              ? {
                                  ...current,
                                  imageUrl: url
                                }
                              : current
                          )
                        }
                        value={editingBanner.imageUrl}
                      />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="homepage-banner-cta-text">CTA text</Label>
                        <Input
                          id="homepage-banner-cta-text"
                          onChange={(event) =>
                            setEditingBanner((current) =>
                              current
                                ? {
                                    ...current,
                                    ctaText: event.target.value
                                  }
                                : current
                            )
                          }
                          value={editingBanner.ctaText ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="homepage-banner-cta-link">CTA link</Label>
                        <Input
                          id="homepage-banner-cta-link"
                          onChange={(event) =>
                            setEditingBanner((current) =>
                              current
                                ? {
                                    ...current,
                                    ctaLink: event.target.value
                                  }
                                : current
                            )
                          }
                          value={editingBanner.ctaLink ?? ""}
                        />
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="homepage-banner-starts-at">Start date</Label>
                        <Input
                          id="homepage-banner-starts-at"
                          onChange={(event) =>
                            setEditingBanner((current) =>
                              current
                                ? {
                                    ...current,
                                    startsAt: event.target.value
                                  }
                                : current
                            )
                          }
                          type="datetime-local"
                          value={toDateTimeInputValue(editingBanner.startsAt)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="homepage-banner-ends-at">End date</Label>
                        <Input
                          id="homepage-banner-ends-at"
                          onChange={(event) =>
                            setEditingBanner((current) =>
                              current
                                ? {
                                    ...current,
                                    endsAt: event.target.value
                                  }
                                : current
                            )
                          }
                          type="datetime-local"
                          value={toDateTimeInputValue(editingBanner.endsAt)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        checked={editingBanner.isActive}
                        className="h-4 w-4 rounded border-[#e8e0d0]"
                        onChange={(event) =>
                          setEditingBanner((current) =>
                            current
                              ? {
                                  ...current,
                                  isActive: event.target.checked
                                }
                              : current
                          )
                        }
                        id="homepage-banner-active"
                        type="checkbox"
                      />
                      <Label htmlFor="homepage-banner-active">Banner is active</Label>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                        disabled={isBannerSaving}
                        onClick={handleSaveBanner}
                        type="button"
                      >
                        {isBannerSaving ? "Saving..." : editingBanner.id ? "Save banner" : "Create banner"}
                      </Button>
                      <Button
                        disabled={isBannerSaving}
                        onClick={() => setEditingBanner(null)}
                        type="button"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#e8e0d0] bg-[#f7f3ec] p-6">
                    <p className="font-display text-[24px] italic text-[#1c3d2e]">
                      Select a banner to edit
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#56705f]">
                      Choose an existing item or create a new banner from the records panel.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "destinations" ? (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-[#e8e0d0] bg-white shadow-none">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="font-display text-[30px] italic text-[#1c3d2e]">
                    Featured destinations
                  </CardTitle>
                  <CardDescription className="text-sm leading-7 text-[#56705f]">
                    Highlight cities, imagery, hotel counts, and destination links for the homepage grid.
                  </CardDescription>
                </div>
                <Button
                  className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                  onClick={() =>
                    setEditingDestination(createDestinationDraft(orderedDestinations.length))
                  }
                  type="button"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add destination
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {orderedDestinations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#e8e0d0] bg-[#f7f3ec] p-6 text-center md:col-span-2">
                    <p className="font-display text-[24px] italic text-[#1c3d2e]">
                      No destinations yet
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#56705f]">
                      Add featured cities to shape the discovery section on the homepage.
                    </p>
                  </div>
                ) : (
                  orderedDestinations.map((destination) => (
                    <article
                      key={destination.id}
                      className="rounded-lg border border-[#e8e0d0] bg-[#f7f3ec]"
                      draggable
                      onDragStart={() => setDraggedItemId(destination.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={async () => {
                        if (!draggedItemId) {
                          return;
                        }

                        await handleReorderByDrag(
                          "destinations",
                          draggedItemId,
                          destination.id
                        );
                        setDraggedItemId(null);
                      }}
                    >
                      <div
                        className="h-[180px] rounded-t-lg border-b border-[#e8e0d0] bg-white bg-cover bg-center"
                        style={getRecordImageUrl(destination)}
                      />
                      <div className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <GripVertical
                                aria-hidden="true"
                                className="h-4 w-4 text-[#c9a84c]"
                              />
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a9a85]">
                                Drag handle
                              </p>
                            </div>
                            <h3 className="font-display text-[24px] italic text-[#1c3d2e]">
                              {destination.city}
                            </h3>
                            <p className="text-[12px] uppercase tracking-[0.18em] text-[#7a9a85]">
                              {destination.country}
                            </p>
                          </div>
                          <label className="inline-flex items-center gap-2 text-sm font-medium text-[#1c3d2e]">
                            <input
                              checked={destination.isActive}
                              className="h-4 w-4 rounded border-[#e8e0d0]"
                              onChange={(event) =>
                                void toggleDestinationActive(
                                  destination,
                                  event.target.checked
                                )
                              }
                              type="checkbox"
                            />
                            Active
                          </label>
                        </div>
                        <div className="space-y-1 text-sm text-[#56705f]">
                          <p>{destination.priceLabel || "No price label yet"}</p>
                          <p>
                            {destination.hotelsCount ? `${destination.hotelsCount}+ hotels` : "Hotels count pending"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() =>
                              setEditingDestination({
                                ...destination
                              })
                            }
                            type="button"
                            variant="outline"
                          >
                            <Pencil aria-hidden="true" className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            onClick={() =>
                              void handleReorderByStep(
                                "destinations",
                                destination.id,
                                -1
                              )
                            }
                            type="button"
                            variant="outline"
                          >
                            <ArrowUp aria-hidden="true" className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() =>
                              void handleReorderByStep(
                                "destinations",
                                destination.id,
                                1
                              )
                            }
                            type="button"
                            variant="outline"
                          >
                            <ArrowDown aria-hidden="true" className="h-4 w-4" />
                          </Button>
                          <Button
                            className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
                            onClick={() =>
                              setDeleteState({
                                id: destination.id,
                                label: `${destination.city}, ${destination.country}`,
                                section: "destinations"
                              })
                            }
                            type="button"
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-[#e8e0d0] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="font-display text-[30px] italic text-[#1c3d2e]">
                  {editingDestination?.id ? "Edit destination" : "Create destination"}
                </CardTitle>
                <CardDescription className="text-sm leading-7 text-[#56705f]">
                  Set the city details, image, hotel count, price label, and destination link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {editingDestination ? (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="homepage-destination-city">City</Label>
                        <Input
                          id="homepage-destination-city"
                          onChange={(event) =>
                            setEditingDestination((current) =>
                              current
                                ? {
                                    ...current,
                                    city: event.target.value
                                  }
                                : current
                            )
                          }
                          value={editingDestination.city}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="homepage-destination-country">Country</Label>
                        <Input
                          id="homepage-destination-country"
                          onChange={(event) =>
                            setEditingDestination((current) =>
                              current
                                ? {
                                    ...current,
                                    country: event.target.value
                                  }
                                : current
                            )
                          }
                          value={editingDestination.country}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Destination image</Label>
                      <ImageUpload
                        onUploaded={(url) =>
                          setEditingDestination((current) =>
                            current
                              ? {
                                  ...current,
                                  imageUrl: url
                                }
                              : current
                          )
                        }
                        value={editingDestination.imageUrl}
                      />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="homepage-destination-price">Price label</Label>
                        <Input
                          id="homepage-destination-price"
                          onChange={(event) =>
                            setEditingDestination((current) =>
                              current
                                ? {
                                    ...current,
                                    priceLabel: event.target.value
                                  }
                                : current
                            )
                          }
                          placeholder="From EUR 320"
                          value={editingDestination.priceLabel ?? ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="homepage-destination-hotels-count">Hotels count</Label>
                        <Input
                          id="homepage-destination-hotels-count"
                          onChange={(event) =>
                            setEditingDestination((current) =>
                              current
                                ? {
                                    ...current,
                                    hotelsCount: toNullableNumber(event.target.value)
                                  }
                                : current
                            )
                          }
                          type="number"
                          value={editingDestination.hotelsCount ?? ""}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="homepage-destination-link">Destination link</Label>
                      <Input
                        id="homepage-destination-link"
                        onChange={(event) =>
                          setEditingDestination((current) =>
                            current
                              ? {
                                  ...current,
                                  link: event.target.value
                                }
                              : current
                          )
                        }
                        placeholder="/en/hotels"
                        value={editingDestination.link ?? ""}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        checked={editingDestination.isActive}
                        className="h-4 w-4 rounded border-[#e8e0d0]"
                        id="homepage-destination-active"
                        onChange={(event) =>
                          setEditingDestination((current) =>
                            current
                              ? {
                                  ...current,
                                  isActive: event.target.checked
                                }
                              : current
                          )
                        }
                        type="checkbox"
                      />
                      <Label htmlFor="homepage-destination-active">Destination is active</Label>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                        disabled={isDestinationSaving}
                        onClick={handleSaveDestination}
                        type="button"
                      >
                        {isDestinationSaving
                          ? "Saving..."
                          : editingDestination.id
                            ? "Save destination"
                            : "Create destination"}
                      </Button>
                      <Button
                        disabled={isDestinationSaving}
                        onClick={() => setEditingDestination(null)}
                        type="button"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#e8e0d0] bg-[#f7f3ec] p-6">
                    <p className="font-display text-[24px] italic text-[#1c3d2e]">
                      Select a destination to edit
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#56705f]">
                      Choose an existing destination or create a new record from the grid.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "deals" ? (
          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <Card className="border-[#e8e0d0] bg-white shadow-none">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="font-display text-[30px] italic text-[#1c3d2e]">
                    Flight deals
                  </CardTitle>
                  <CardDescription className="text-sm leading-7 text-[#56705f]">
                    Feature route cards with airline, pricing, fare type, imagery, and expiry details.
                  </CardDescription>
                </div>
                <Button
                  className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                  onClick={() => setEditingDeal(createDealDraft(orderedDeals.length))}
                  type="button"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add deal
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderedDeals.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#e8e0d0] bg-[#f7f3ec] p-6 text-center">
                    <p className="font-display text-[24px] italic text-[#1c3d2e]">
                      No deal cards yet
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#56705f]">
                      Add a fare card to spotlight a route in the homepage deals section.
                    </p>
                  </div>
                ) : (
                  orderedDeals.map((deal) => (
                    <article
                      key={deal.id}
                      className="rounded-lg border border-[#e8e0d0] bg-[#f7f3ec]"
                      draggable
                      onDragStart={() => setDraggedItemId(deal.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={async () => {
                        if (!draggedItemId) {
                          return;
                        }

                        await handleReorderByDrag("deals", draggedItemId, deal.id);
                        setDraggedItemId(null);
                      }}
                    >
                      <div className="grid gap-4 p-4 sm:grid-cols-[140px_minmax(0,1fr)]">
                        <div
                          className="flex h-[140px] items-center justify-center rounded-md border border-[#e8e0d0] bg-white bg-cover bg-center"
                          style={getRecordImageUrl(deal)}
                        >
                          {!deal.imageUrl ? (
                            <ImageIcon aria-hidden="true" className="h-6 w-6 text-[#7a9a85]" />
                          ) : null}
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <GripVertical
                                  aria-hidden="true"
                                  className="h-4 w-4 text-[#c9a84c]"
                                />
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a9a85]">
                                  Drag handle
                                </p>
                              </div>
                              <h3 className="font-display text-[24px] italic text-[#1c3d2e]">
                                {deal.originCode} to {deal.destinationCode}
                              </h3>
                              <p className="text-sm text-[#56705f]">
                                {deal.originCity} to {deal.destinationCity}
                              </p>
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#1c3d2e]">
                              <input
                                checked={deal.isActive}
                                className="h-4 w-4 rounded border-[#e8e0d0]"
                                onChange={(event) =>
                                  void toggleDealActive(deal, event.target.checked)
                                }
                                type="checkbox"
                              />
                              Active
                            </label>
                          </div>
                          <div className="grid gap-2 text-sm text-[#56705f] sm:grid-cols-2">
                            <p>{deal.airlineName}</p>
                            <p>
                              {deal.currency} {deal.price.toLocaleString()}
                            </p>
                            <p>{deal.fareType || "Fare type pending"}</p>
                            <p>{deal.expiresAt ? `Expires ${deal.expiresAt.slice(0, 10)}` : "No expiry date"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() =>
                                setEditingDeal({
                                  ...deal
                                })
                              }
                              type="button"
                              variant="outline"
                            >
                              <Pencil aria-hidden="true" className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              onClick={() =>
                                void handleReorderByStep("deals", deal.id, -1)
                              }
                              type="button"
                              variant="outline"
                            >
                              <ArrowUp aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() =>
                                void handleReorderByStep("deals", deal.id, 1)
                              }
                              type="button"
                              variant="outline"
                            >
                              <ArrowDown aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <Button
                              className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
                              onClick={() =>
                                setDeleteState({
                                  id: deal.id,
                                  label: `${deal.originCode}-${deal.destinationCode}`,
                                  section: "deals"
                                })
                              }
                              type="button"
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-[#e8e0d0] bg-white shadow-none">
              <CardHeader>
                <CardTitle className="font-display text-[30px] italic text-[#1c3d2e]">
                  {editingDeal?.id ? "Edit flight deal" : "Create flight deal"}
                </CardTitle>
                <CardDescription className="text-sm leading-7 text-[#56705f]">
                  Capture the route, fare, airline, expiry, and image used on the homepage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {editingDeal ? (
                  <>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="homepage-deal-origin-code">Origin airport code</Label>
                        <Input
                          id="homepage-deal-origin-code"
                          maxLength={3}
                          onChange={(event) =>
                            setEditingDeal((current) =>
                              current
                                ? {
                                    ...current,
                                    originCode: event.target.value.toUpperCase()
                                  }
                                : current
                            )
                          }
                          value={editingDeal.originCode}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="homepage-deal-destination-code">Destination airport code</Label>
                        <Input
                          id="homepage-deal-destination-code"
                          maxLength={3}
                          onChange={(event) =>
                            setEditingDeal((current) =>
                              current
                                ? {
                                    ...current,
                                    destinationCode: event.target.value.toUpperCase()
                                  }
                                : current
                            )
                          }
                          value={editingDeal.destinationCode}
                        />
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="homepage-deal-origin-city">Origin city</Label>
                        <Input
                          id="homepage-deal-origin-city"
                          onChange={(event) =>
                            setEditingDeal((current) =>
                              current
                                ? {
                                    ...current,
                                    originCity: event.target.value
                                  }
                                : current
                            )
                          }
                          value={editingDeal.originCity}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="homepage-deal-destination-city">Destination city</Label>
                        <Input
                          id="homepage-deal-destination-city"
                          onChange={(event) =>
                            setEditingDeal((current) =>
                              current
                                ? {
                                    ...current,
                                    destinationCity: event.target.value
                                  }
                                : current
                            )
                          }
                          value={editingDeal.destinationCity}
                        />
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="homepage-deal-airline-name">Airline</Label>
                        <Input
                          id="homepage-deal-airline-name"
                          onChange={(event) =>
                            setEditingDeal((current) =>
                              current
                                ? {
                                    ...current,
                                    airlineName: event.target.value
                                  }
                                : current
                            )
                          }
                          value={editingDeal.airlineName}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="homepage-deal-fare-type">Fare type</Label>
                        <Input
                          id="homepage-deal-fare-type"
                          onChange={(event) =>
                            setEditingDeal((current) =>
                              current
                                ? {
                                    ...current,
                                    fareType: event.target.value
                                  }
                                : current
                            )
                          }
                          placeholder="Economy"
                          value={editingDeal.fareType ?? ""}
                        />
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="homepage-deal-price">Price</Label>
                        <Input
                          id="homepage-deal-price"
                          min={0}
                          onChange={(event) =>
                            setEditingDeal((current) =>
                              current
                                ? {
                                    ...current,
                                    price: Number(event.target.value || 0)
                                  }
                                : current
                            )
                          }
                          type="number"
                          value={editingDeal.price}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="homepage-deal-currency">Currency</Label>
                        <Select
                          id="homepage-deal-currency"
                          onChange={(event) =>
                            setEditingDeal((current) =>
                              current
                                ? {
                                    ...current,
                                    currency: event.target.value as SupportedCurrency
                                  }
                                : current
                            )
                          }
                          value={editingDeal.currency}
                        >
                          {currencyOptions.map((currency) => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Deal image</Label>
                      <ImageUpload
                        onUploaded={(url) =>
                          setEditingDeal((current) =>
                            current
                              ? {
                                  ...current,
                                  imageUrl: url
                                }
                              : current
                          )
                        }
                        value={editingDeal.imageUrl}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="homepage-deal-expiry">Expiry date</Label>
                      <Input
                        id="homepage-deal-expiry"
                        onChange={(event) =>
                          setEditingDeal((current) =>
                            current
                              ? {
                                  ...current,
                                  expiresAt: event.target.value
                                }
                              : current
                          )
                        }
                        type="datetime-local"
                        value={toDateTimeInputValue(editingDeal.expiresAt)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        checked={editingDeal.isActive}
                        className="h-4 w-4 rounded border-[#e8e0d0]"
                        id="homepage-deal-active"
                        onChange={(event) =>
                          setEditingDeal((current) =>
                            current
                              ? {
                                  ...current,
                                  isActive: event.target.checked
                                }
                              : current
                          )
                        }
                        type="checkbox"
                      />
                      <Label htmlFor="homepage-deal-active">Deal is active</Label>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                        disabled={isDealSaving}
                        onClick={handleSaveDeal}
                        type="button"
                      >
                        {isDealSaving ? "Saving..." : editingDeal.id ? "Save deal" : "Create deal"}
                      </Button>
                      <Button
                        disabled={isDealSaving}
                        onClick={() => setEditingDeal(null)}
                        type="button"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#e8e0d0] bg-[#f7f3ec] p-6">
                    <p className="font-display text-[24px] italic text-[#1c3d2e]">
                      Select a flight deal to edit
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[#56705f]">
                      Choose a deal from the list or create a new fare card.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "settings" ? (
          <Card className="border-[#e8e0d0] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="font-display text-[30px] italic text-[#1c3d2e]">
                General homepage settings
              </CardTitle>
              <CardDescription className="text-sm leading-7 text-[#56705f]">
                Manage trust items, brand story content, CTA banner copy, and the footer tagline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a9a85]">
                    Trust strip
                  </h2>
                  <p className="text-sm leading-7 text-[#56705f]">
                    Five short items shown beneath the hero search area.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {settings.trustItems.map((item, index) => (
                    <div key={`trust-item-${index}`} className="space-y-2">
                      <Label htmlFor={`homepage-trust-item-${index}`}>Item {index + 1}</Label>
                      <Input
                        id={`homepage-trust-item-${index}`}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            trustItems: current.trustItems.map((entry, entryIndex) =>
                              entryIndex === index ? event.target.value : entry
                            )
                          }))
                        }
                        value={item}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a9a85]">
                    Brand story
                  </h2>
                  <p className="text-sm leading-7 text-[#56705f]">
                    Edit the supporting headline, description, and the three headline stats.
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="homepage-why-headline">Headline</Label>
                    <Input
                      id="homepage-why-headline"
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          whyHeadline: event.target.value
                        }))
                      }
                      value={settings.whyHeadline}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homepage-footer-tagline">Footer tagline</Label>
                    <Input
                      id="homepage-footer-tagline"
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          footerTagline: event.target.value
                        }))
                      }
                      value={settings.footerTagline}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homepage-why-description">Description</Label>
                  <Textarea
                    id="homepage-why-description"
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        whyDescription: event.target.value
                      }))
                    }
                    value={settings.whyDescription}
                  />
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {settings.stats.map((stat, index) => (
                    <div
                      key={`stat-${index}`}
                      className="rounded-lg border border-[#e8e0d0] bg-[#f7f3ec] p-4"
                    >
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor={`homepage-stat-value-${index}`}>Stat value</Label>
                          <Input
                            id={`homepage-stat-value-${index}`}
                            onChange={(event) =>
                              setSettings((current) => ({
                                ...current,
                                stats: current.stats.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? {
                                        ...entry,
                                        value: event.target.value
                                      }
                                    : entry
                                )
                              }))
                            }
                            value={stat.value}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`homepage-stat-label-${index}`}>Stat label</Label>
                          <Input
                            id={`homepage-stat-label-${index}`}
                            onChange={(event) =>
                              setSettings((current) => ({
                                ...current,
                                stats: current.stats.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? {
                                        ...entry,
                                        label: event.target.value
                                      }
                                    : entry
                                )
                              }))
                            }
                            value={stat.label}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a9a85]">
                    CTA banner
                  </h2>
                  <p className="text-sm leading-7 text-[#56705f]">
                    These values power the closing call-to-action block on the homepage.
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="homepage-cta-headline">Headline</Label>
                    <Input
                      id="homepage-cta-headline"
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          ctaHeadline: event.target.value
                        }))
                      }
                      value={settings.ctaHeadline}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homepage-cta-description">Description</Label>
                  <Textarea
                    id="homepage-cta-description"
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        ctaDescription: event.target.value
                      }))
                    }
                    value={settings.ctaDescription}
                  />
                </div>
              </section>

              <Button
                className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
                disabled={isSettingsSaving}
                onClick={handleSaveSettings}
                type="button"
              >
                {isSettingsSaving ? "Saving settings..." : "Save general settings"}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}

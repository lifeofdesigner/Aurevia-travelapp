"use client";

import {useState} from "react";
import {Loader2, Plus, Save, Trash2} from "lucide-react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

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
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {
  type AdminFeaturedHotelProperty,
  type AdminHiddenHotelProperty,
  type AdminHotelMarkupRule,
  type AdminHotelsManagerData
} from "@/features/admin/lib/hotels-manager-types";
import {formatDateTime} from "@/lib/dates";

type AdminHotelsManagerProps = {
  initialData: AdminHotelsManagerData;
  locale: string;
};

function createFeaturedProperty(): AdminFeaturedHotelProperty {
  return {
    cityName: null,
    id: crypto.randomUUID(),
    isActive: true,
    label: "",
    propertyName: ""
  };
}

function createMarkupRule(): AdminHotelMarkupRule {
  return {
    cityName: null,
    id: crypto.randomUUID(),
    isActive: true,
    markupPercent: 5,
    propertyName: null,
    scope: "city"
  };
}

function createHiddenProperty(): AdminHiddenHotelProperty {
  return {
    cityName: null,
    id: crypto.randomUUID(),
    isHidden: true,
    propertyName: ""
  };
}

function toNullableString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function AdminHotelsManager({
  initialData,
  locale
}: AdminHotelsManagerProps) {
  const router = useRouter();
  const [featuredProperties, setFeaturedProperties] = useState(
    initialData.featuredProperties
  );
  const [markupRules, setMarkupRules] = useState(initialData.markupRules);
  const [hiddenProperties, setHiddenProperties] = useState(initialData.hiddenProperties);
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  async function saveSection(
    section: "featuredProperties" | "hiddenProperties" | "markupRules",
    items: unknown[]
  ) {
    setPendingSection(section);

    try {
      const response = await fetch("/api/admin/hotels", {
        body: JSON.stringify({
          items,
          section
        }),
        headers: {"Content-Type": "application/json"},
        method: "POST"
      });
      const payload = (await response.json()) as {message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save hotel manager data.");
      }

      toast.success("Hotels manager updated", {
        description: "The selected hotel admin settings were saved successfully."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to save hotels manager", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setPendingSection(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-[#e8e0d0] bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
              Hotel searches
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Latest hotel searches captured from the public booking flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialData.searches.length === 0 ? (
              <p className="text-sm text-[#56705f]">No hotel searches have been logged yet.</p>
            ) : (
              initialData.searches.map((search) => (
                <div
                  key={search.id}
                  className="rounded-lg border border-[#e8e0d0] bg-[#f7f3ec] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1c3d2e]">
                        {search.destinationQuery ?? "Unknown destination"}
                      </p>
                      <p className="mt-1 text-sm text-[#56705f]">
                        {search.checkInDate ?? "No check-in"} | {search.checkOutDate ?? "No check-out"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[#1c3d2e]">
                      {search.resultCount} results
                    </p>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#7a9a85]">
                    {formatDateTime(search.createdAt, locale)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-[#e8e0d0] bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
              Hotel bookings
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Latest hotel bookings and their operational status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialData.bookings.length === 0 ? (
              <p className="text-sm text-[#56705f]">No hotel bookings have been created yet.</p>
            ) : (
              initialData.bookings.map((booking) => (
                <div
                  key={booking.bookingId}
                  className="rounded-lg border border-[#e8e0d0] bg-[#f7f3ec] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-[#1c3d2e]">
                        {booking.bookingReference}
                      </p>
                      <p className="text-sm text-[#56705f]">{booking.propertyName}</p>
                      <p className="text-sm text-[#56705f]">
                        {booking.customerName} | {booking.customerEmail}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge label={booking.status} status={booking.status} />
                      <StatusBadge
                        label={booking.paymentStatus}
                        status={booking.paymentStatus}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#7a9a85]">
                    {booking.checkInDate} | {booking.checkOutDate} |{" "}
                    {formatDateTime(booking.createdAt, locale)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#e8e0d0] bg-white shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
              Featured properties
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Pin hotels that should rise to the top of managed merchandising lists.
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              setFeaturedProperties((current) => [...current, createFeaturedProperty()])
            }
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add property
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {featuredProperties.map((property, index) => (
            <div
              key={property.id}
              className="grid gap-4 rounded-lg border border-[#e8e0d0] bg-[#f7f3ec] p-4 lg:grid-cols-[1.4fr_1fr_1.4fr_auto_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor={`featured-property-name-${property.id}`}>Property name</Label>
                <Input
                  id={`featured-property-name-${property.id}`}
                  onChange={(event) =>
                    setFeaturedProperties((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, propertyName: event.target.value}
                          : item
                      )
                    )
                  }
                  value={property.propertyName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`featured-property-city-${property.id}`}>City</Label>
                <Input
                  id={`featured-property-city-${property.id}`}
                  onChange={(event) =>
                    setFeaturedProperties((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, cityName: event.target.value}
                          : item
                      )
                    )
                  }
                  value={property.cityName ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`featured-property-label-${property.id}`}>Label</Label>
                <Input
                  id={`featured-property-label-${property.id}`}
                  onChange={(event) =>
                    setFeaturedProperties((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? {...item, label: event.target.value} : item
                      )
                    )
                  }
                  value={property.label}
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm font-medium text-[#1c3d2e]">
                <input
                  checked={property.isActive}
                  className="h-4 w-4 rounded border-[#e8e0d0]"
                  onChange={(event) =>
                    setFeaturedProperties((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, isActive: event.target.checked}
                          : item
                      )
                    )
                  }
                  type="checkbox"
                />
                Active
              </label>
              <div className="flex items-end">
                <Button
                  className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
                  onClick={() =>
                    setFeaturedProperties((current) =>
                      current.filter((item) => item.id !== property.id)
                    )
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
            disabled={pendingSection === "featuredProperties"}
            onClick={() =>
              void saveSection(
                "featuredProperties",
                featuredProperties.map((property) => ({
                  ...property,
                  cityName: toNullableString(property.cityName),
                  label: property.label.trim(),
                  propertyName: property.propertyName.trim()
                }))
              )
            }
            type="button"
          >
            {pendingSection === "featuredProperties" ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save aria-hidden="true" className="h-4 w-4" />
                Save featured properties
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[#e8e0d0] bg-white shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
              Markup rules
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Apply markup percentages by city or individual property.
            </CardDescription>
          </div>
          <Button
            onClick={() => setMarkupRules((current) => [...current, createMarkupRule()])}
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {markupRules.map((rule, index) => (
            <div
              key={rule.id}
              className="grid gap-4 rounded-lg border border-[#e8e0d0] bg-[#f7f3ec] p-4 lg:grid-cols-[0.9fr_1.4fr_1.4fr_1fr_auto_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor={`hotel-markup-scope-${rule.id}`}>Scope</Label>
                <Select
                  id={`hotel-markup-scope-${rule.id}`}
                  onChange={(event) =>
                    setMarkupRules((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              cityName:
                                event.target.value === "city" ? item.cityName : null,
                              propertyName:
                                event.target.value === "property"
                                  ? item.propertyName
                                  : null,
                              scope: event.target.value as "city" | "property"
                            }
                          : item
                      )
                    )
                  }
                  value={rule.scope}
                >
                  <option value="city">City</option>
                  <option value="property">Property</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hotel-markup-city-${rule.id}`}>City</Label>
                <Input
                  disabled={rule.scope !== "city"}
                  id={`hotel-markup-city-${rule.id}`}
                  onChange={(event) =>
                    setMarkupRules((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? {...item, cityName: event.target.value} : item
                      )
                    )
                  }
                  value={rule.cityName ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hotel-markup-property-${rule.id}`}>Property name</Label>
                <Input
                  disabled={rule.scope !== "property"}
                  id={`hotel-markup-property-${rule.id}`}
                  onChange={(event) =>
                    setMarkupRules((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, propertyName: event.target.value}
                          : item
                      )
                    )
                  }
                  value={rule.propertyName ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hotel-markup-percent-${rule.id}`}>Markup %</Label>
                <Input
                  id={`hotel-markup-percent-${rule.id}`}
                  min={0}
                  onChange={(event) =>
                    setMarkupRules((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              markupPercent: Number(event.target.value || 0)
                            }
                          : item
                      )
                    )
                  }
                  type="number"
                  value={rule.markupPercent}
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm font-medium text-[#1c3d2e]">
                <input
                  checked={rule.isActive}
                  className="h-4 w-4 rounded border-[#e8e0d0]"
                  onChange={(event) =>
                    setMarkupRules((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, isActive: event.target.checked}
                          : item
                      )
                    )
                  }
                  type="checkbox"
                />
                Active
              </label>
              <div className="flex items-end">
                <Button
                  className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
                  onClick={() =>
                    setMarkupRules((current) => current.filter((item) => item.id !== rule.id))
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
            disabled={pendingSection === "markupRules"}
            onClick={() =>
              void saveSection(
                "markupRules",
                markupRules.map((rule) => ({
                  ...rule,
                  cityName: toNullableString(rule.cityName),
                  propertyName: toNullableString(rule.propertyName)
                }))
              )
            }
            type="button"
          >
            {pendingSection === "markupRules" ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save aria-hidden="true" className="h-4 w-4" />
                Save markup rules
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[#e8e0d0] bg-white shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
              Hidden properties
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Keep specific hotels out of the customer-facing results list.
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              setHiddenProperties((current) => [...current, createHiddenProperty()])
            }
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add property
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {hiddenProperties.map((property, index) => (
            <div
              key={property.id}
              className="grid gap-4 rounded-lg border border-[#e8e0d0] bg-[#f7f3ec] p-4 lg:grid-cols-[1.4fr_1fr_auto_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor={`hidden-property-name-${property.id}`}>Property name</Label>
                <Input
                  id={`hidden-property-name-${property.id}`}
                  onChange={(event) =>
                    setHiddenProperties((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, propertyName: event.target.value}
                          : item
                      )
                    )
                  }
                  value={property.propertyName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`hidden-property-city-${property.id}`}>City</Label>
                <Input
                  id={`hidden-property-city-${property.id}`}
                  onChange={(event) =>
                    setHiddenProperties((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, cityName: event.target.value}
                          : item
                      )
                    )
                  }
                  value={property.cityName ?? ""}
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm font-medium text-[#1c3d2e]">
                <input
                  checked={property.isHidden}
                  className="h-4 w-4 rounded border-[#e8e0d0]"
                  onChange={(event) =>
                    setHiddenProperties((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, isHidden: event.target.checked}
                          : item
                      )
                    )
                  }
                  type="checkbox"
                />
                Hidden
              </label>
              <div className="flex items-end">
                <Button
                  className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
                  onClick={() =>
                    setHiddenProperties((current) =>
                      current.filter((item) => item.id !== property.id)
                    )
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
            disabled={pendingSection === "hiddenProperties"}
            onClick={() =>
              void saveSection(
                "hiddenProperties",
                hiddenProperties.map((property) => ({
                  ...property,
                  cityName: toNullableString(property.cityName),
                  propertyName: property.propertyName.trim()
                }))
              )
            }
            type="button"
          >
            {pendingSection === "hiddenProperties" ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save aria-hidden="true" className="h-4 w-4" />
                Save hidden properties
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

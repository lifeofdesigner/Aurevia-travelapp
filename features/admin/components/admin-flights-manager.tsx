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
import {Textarea} from "@/components/ui/textarea";
import {StatusBadge} from "@/components/shared/feedback/status-badge";
import {
  type AdminFeaturedFlightRoute,
  type AdminFlightAirlineVisibility,
  type AdminFlightBaggageOverride,
  type AdminFlightMarkupRule,
  type AdminFlightsManagerData
} from "@/features/admin/lib/flights-manager-types";
import {formatDateTime} from "@/lib/dates";

type AdminFlightsManagerProps = {
  initialData: AdminFlightsManagerData;
  locale: string;
};

function createFeaturedRoute(): AdminFeaturedFlightRoute {
  return {
    destinationCode: "",
    id: crypto.randomUUID(),
    isActive: true,
    label: "",
    originCode: ""
  };
}

function createMarkupRule(): AdminFlightMarkupRule {
  return {
    airlineCode: null,
    airlineName: null,
    destinationCode: null,
    id: crypto.randomUUID(),
    isActive: true,
    markupPercent: 5,
    originCode: null,
    scope: "route"
  };
}

function createAirlineVisibility(): AdminFlightAirlineVisibility {
  return {
    airlineCode: "",
    airlineName: "",
    id: crypto.randomUUID(),
    isHidden: false
  };
}

function createBaggageOverride(): AdminFlightBaggageOverride {
  return {
    airlineCode: null,
    airlineName: null,
    destinationCode: null,
    id: crypto.randomUUID(),
    isActive: true,
    message: "",
    originCode: null,
    scope: "route"
  };
}

function toNullableString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function AdminFlightsManager({
  initialData,
  locale
}: AdminFlightsManagerProps) {
  const router = useRouter();
  const [featuredRoutes, setFeaturedRoutes] = useState(initialData.featuredRoutes);
  const [markupRules, setMarkupRules] = useState(initialData.markupRules);
  const [airlineVisibility, setAirlineVisibility] = useState(initialData.airlineVisibility);
  const [baggageOverrides, setBaggageOverrides] = useState(initialData.baggageOverrides);
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  async function saveSection(
    section:
      | "airlineVisibility"
      | "baggageOverrides"
      | "featuredRoutes"
      | "markupRules",
    items: unknown[]
  ) {
    setPendingSection(section);

    try {
      const response = await fetch("/api/admin/flights", {
        body: JSON.stringify({
          items,
          section
        }),
        headers: {"Content-Type": "application/json"},
        method: "POST"
      });
      const payload = (await response.json()) as {items?: unknown[]; message?: string};

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save flight manager data.");
      }

      toast.success("Flights manager updated", {
        description: "The selected admin flight settings were saved successfully."
      });
      router.refresh();
    } catch (error) {
      toast.error("Unable to save flights manager", {
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
              Flight searches
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Latest flight searches captured from the public booking flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialData.searches.length === 0 ? (
              <p className="text-sm text-[#56705f]">No flight searches have been logged yet.</p>
            ) : (
              initialData.searches.map((search) => (
                <div
                  key={search.id}
                  className="rounded-lg border border-[#e8e0d0] bg-[#f7f3ec] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#1c3d2e]">
                        {(search.originQuery ?? "Unknown").toUpperCase()} to{" "}
                        {(search.destinationQuery ?? "Unknown").toUpperCase()}
                      </p>
                      <p className="mt-1 text-sm text-[#56705f]">
                        {search.departureDate ?? "No departure date"}{" "}
                        {search.returnDate ? `| ${search.returnDate}` : ""}
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
              Flight bookings
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Latest flight bookings and their operational status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialData.bookings.length === 0 ? (
              <p className="text-sm text-[#56705f]">No flight bookings have been created yet.</p>
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
                      <p className="text-sm text-[#56705f]">
                        {booking.originCode} to {booking.destinationCode}
                      </p>
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
                    {booking.departureDate}
                    {booking.returnDate ? ` | ${booking.returnDate}` : ""} |{" "}
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
              Featured routes
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Pin popular routes that should be highlighted to customers.
            </CardDescription>
          </div>
          <Button
            onClick={() => setFeaturedRoutes((current) => [...current, createFeaturedRoute()])}
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add route
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {featuredRoutes.map((route, index) => (
            <div
              key={route.id}
              className="grid gap-4 rounded-lg border border-[#e8e0d0] bg-[#f7f3ec] p-4 lg:grid-cols-[1fr_1fr_1.5fr_auto_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor={`featured-route-origin-${route.id}`}>Origin</Label>
                <Input
                  id={`featured-route-origin-${route.id}`}
                  maxLength={3}
                  onChange={(event) =>
                    setFeaturedRoutes((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, originCode: event.target.value.toUpperCase()}
                          : item
                      )
                    )
                  }
                  value={route.originCode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`featured-route-destination-${route.id}`}>Destination</Label>
                <Input
                  id={`featured-route-destination-${route.id}`}
                  maxLength={3}
                  onChange={(event) =>
                    setFeaturedRoutes((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, destinationCode: event.target.value.toUpperCase()}
                          : item
                      )
                    )
                  }
                  value={route.destinationCode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`featured-route-label-${route.id}`}>Route label</Label>
                <Input
                  id={`featured-route-label-${route.id}`}
                  onChange={(event) =>
                    setFeaturedRoutes((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? {...item, label: event.target.value} : item
                      )
                    )
                  }
                  value={route.label}
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm font-medium text-[#1c3d2e]">
                <input
                  checked={route.isActive}
                  className="h-4 w-4 rounded border-[#e8e0d0]"
                  onChange={(event) =>
                    setFeaturedRoutes((current) =>
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
                    setFeaturedRoutes((current) =>
                      current.filter((item) => item.id !== route.id)
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
            disabled={pendingSection === "featuredRoutes"}
            onClick={() =>
              void saveSection(
                "featuredRoutes",
                featuredRoutes.map((route) => ({
                  ...route,
                  destinationCode: route.destinationCode.trim().toUpperCase(),
                  label: route.label.trim(),
                  originCode: route.originCode.trim().toUpperCase()
                }))
              )
            }
            type="button"
          >
            {pendingSection === "featuredRoutes" ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save aria-hidden="true" className="h-4 w-4" />
                Save featured routes
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
              Apply percentage markup rules by route or airline.
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
              className="space-y-4 rounded-lg border border-[#e8e0d0] bg-[#f7f3ec] p-4"
            >
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1fr_1fr_1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor={`markup-scope-${rule.id}`}>Scope</Label>
                  <Select
                    id={`markup-scope-${rule.id}`}
                    onChange={(event) =>
                      setMarkupRules((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                airlineCode:
                                  event.target.value === "airline" ? item.airlineCode : null,
                                airlineName:
                                  event.target.value === "airline" ? item.airlineName : null,
                                destinationCode:
                                  event.target.value === "route"
                                    ? item.destinationCode
                                    : null,
                                originCode:
                                  event.target.value === "route" ? item.originCode : null,
                                scope: event.target.value as "airline" | "route"
                              }
                            : item
                        )
                      )
                    }
                    value={rule.scope}
                  >
                    <option value="route">Route</option>
                    <option value="airline">Airline</option>
                  </Select>
                </div>
                {rule.scope === "route" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={`markup-origin-${rule.id}`}>Origin</Label>
                      <Input
                        id={`markup-origin-${rule.id}`}
                        maxLength={3}
                        onChange={(event) =>
                          setMarkupRules((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {...item, originCode: event.target.value.toUpperCase()}
                                : item
                            )
                          )
                        }
                        value={rule.originCode ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`markup-destination-${rule.id}`}>Destination</Label>
                      <Input
                        id={`markup-destination-${rule.id}`}
                        maxLength={3}
                        onChange={(event) =>
                          setMarkupRules((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {...item, destinationCode: event.target.value.toUpperCase()}
                                : item
                            )
                          )
                        }
                        value={rule.destinationCode ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`markup-percent-${rule.id}`}>Markup %</Label>
                      <Input
                        id={`markup-percent-${rule.id}`}
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
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={`markup-airline-code-${rule.id}`}>Airline code</Label>
                      <Input
                        id={`markup-airline-code-${rule.id}`}
                        maxLength={2}
                        onChange={(event) =>
                          setMarkupRules((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {...item, airlineCode: event.target.value.toUpperCase()}
                                : item
                            )
                          )
                        }
                        value={rule.airlineCode ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`markup-airline-name-${rule.id}`}>Airline name</Label>
                      <Input
                        id={`markup-airline-name-${rule.id}`}
                        onChange={(event) =>
                          setMarkupRules((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {...item, airlineName: event.target.value}
                                : item
                            )
                          )
                        }
                        value={rule.airlineName ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`markup-airline-percent-${rule.id}`}>Markup %</Label>
                      <Input
                        id={`markup-airline-percent-${rule.id}`}
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
                  </>
                )}
                <div className="flex items-end gap-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-[#1c3d2e]">
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
                  <Button
                    className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
                    onClick={() =>
                      setMarkupRules((current) =>
                        current.filter((item) => item.id !== rule.id)
                      )
                    }
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
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
                  airlineCode: toNullableString(rule.airlineCode)?.toUpperCase() ?? null,
                  airlineName: toNullableString(rule.airlineName),
                  destinationCode:
                    toNullableString(rule.destinationCode)?.toUpperCase() ?? null,
                  originCode: toNullableString(rule.originCode)?.toUpperCase() ?? null
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
              Airline visibility
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Control which airlines are hidden from the customer-facing results.
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              setAirlineVisibility((current) => [...current, createAirlineVisibility()])
            }
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add airline
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {airlineVisibility.map((rule, index) => (
            <div
              key={rule.id}
              className="grid gap-4 rounded-lg border border-[#e8e0d0] bg-[#f7f3ec] p-4 lg:grid-cols-[1fr_1.5fr_auto_auto]"
            >
              <div className="space-y-2">
                <Label htmlFor={`airline-visibility-code-${rule.id}`}>Airline code</Label>
                <Input
                  id={`airline-visibility-code-${rule.id}`}
                  maxLength={2}
                  onChange={(event) =>
                    setAirlineVisibility((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, airlineCode: event.target.value.toUpperCase()}
                          : item
                      )
                    )
                  }
                  value={rule.airlineCode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`airline-visibility-name-${rule.id}`}>Airline name</Label>
                <Input
                  id={`airline-visibility-name-${rule.id}`}
                  onChange={(event) =>
                    setAirlineVisibility((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, airlineName: event.target.value}
                          : item
                      )
                    )
                  }
                  value={rule.airlineName}
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm font-medium text-[#1c3d2e]">
                <input
                  checked={rule.isHidden}
                  className="h-4 w-4 rounded border-[#e8e0d0]"
                  onChange={(event) =>
                    setAirlineVisibility((current) =>
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
                    setAirlineVisibility((current) =>
                      current.filter((item) => item.id !== rule.id)
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
            disabled={pendingSection === "airlineVisibility"}
            onClick={() =>
              void saveSection(
                "airlineVisibility",
                airlineVisibility.map((rule) => ({
                  ...rule,
                  airlineCode: rule.airlineCode.trim().toUpperCase(),
                  airlineName: rule.airlineName.trim()
                }))
              )
            }
            type="button"
          >
            {pendingSection === "airlineVisibility" ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save aria-hidden="true" className="h-4 w-4" />
                Save airline visibility
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[#e8e0d0] bg-white shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="font-display text-[28px] italic text-[#1c3d2e]">
              Baggage override messages
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-[#56705f]">
              Add route-specific or airline-specific baggage guidance shown to customers.
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              setBaggageOverrides((current) => [...current, createBaggageOverride()])
            }
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add override
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {baggageOverrides.map((override, index) => (
            <div
              key={override.id}
              className="space-y-4 rounded-lg border border-[#e8e0d0] bg-[#f7f3ec] p-4"
            >
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1fr_1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor={`baggage-scope-${override.id}`}>Scope</Label>
                  <Select
                    id={`baggage-scope-${override.id}`}
                    onChange={(event) =>
                      setBaggageOverrides((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                airlineCode:
                                  event.target.value === "airline" ? item.airlineCode : null,
                                airlineName:
                                  event.target.value === "airline" ? item.airlineName : null,
                                destinationCode:
                                  event.target.value === "route"
                                    ? item.destinationCode
                                    : null,
                                originCode:
                                  event.target.value === "route" ? item.originCode : null,
                                scope: event.target.value as "airline" | "route"
                              }
                            : item
                        )
                      )
                    }
                    value={override.scope}
                  >
                    <option value="route">Route</option>
                    <option value="airline">Airline</option>
                  </Select>
                </div>
                {override.scope === "route" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={`baggage-origin-${override.id}`}>Origin</Label>
                      <Input
                        id={`baggage-origin-${override.id}`}
                        maxLength={3}
                        onChange={(event) =>
                          setBaggageOverrides((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {...item, originCode: event.target.value.toUpperCase()}
                                : item
                            )
                          )
                        }
                        value={override.originCode ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`baggage-destination-${override.id}`}>Destination</Label>
                      <Input
                        id={`baggage-destination-${override.id}`}
                        maxLength={3}
                        onChange={(event) =>
                          setBaggageOverrides((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    destinationCode: event.target.value.toUpperCase()
                                  }
                                : item
                            )
                          )
                        }
                        value={override.destinationCode ?? ""}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor={`baggage-airline-code-${override.id}`}>Airline code</Label>
                      <Input
                        id={`baggage-airline-code-${override.id}`}
                        maxLength={2}
                        onChange={(event) =>
                          setBaggageOverrides((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {...item, airlineCode: event.target.value.toUpperCase()}
                                : item
                            )
                          )
                        }
                        value={override.airlineCode ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`baggage-airline-name-${override.id}`}>Airline name</Label>
                      <Input
                        id={`baggage-airline-name-${override.id}`}
                        onChange={(event) =>
                          setBaggageOverrides((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {...item, airlineName: event.target.value}
                                : item
                            )
                          )
                        }
                        value={override.airlineName ?? ""}
                      />
                    </div>
                  </>
                )}
                <div className="flex items-end gap-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-[#1c3d2e]">
                    <input
                      checked={override.isActive}
                      className="h-4 w-4 rounded border-[#e8e0d0]"
                      onChange={(event) =>
                        setBaggageOverrides((current) =>
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
                  <Button
                    className="bg-[#d32222] text-white hover:bg-[#b11b1b]"
                    onClick={() =>
                      setBaggageOverrides((current) =>
                        current.filter((item) => item.id !== override.id)
                      )
                    }
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`baggage-message-${override.id}`}>Override message</Label>
                <Textarea
                  id={`baggage-message-${override.id}`}
                  onChange={(event) =>
                    setBaggageOverrides((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {...item, message: event.target.value}
                          : item
                      )
                    )
                  }
                  value={override.message}
                />
              </div>
            </div>
          ))}
          <Button
            className="bg-[#1c3d2e] text-white hover:bg-[#111d15]"
            disabled={pendingSection === "baggageOverrides"}
            onClick={() =>
              void saveSection(
                "baggageOverrides",
                baggageOverrides.map((override) => ({
                  ...override,
                  airlineCode: toNullableString(override.airlineCode)?.toUpperCase() ?? null,
                  airlineName: toNullableString(override.airlineName),
                  destinationCode:
                    toNullableString(override.destinationCode)?.toUpperCase() ?? null,
                  message: override.message.trim(),
                  originCode: toNullableString(override.originCode)?.toUpperCase() ?? null
                }))
              )
            }
            type="button"
          >
            {pendingSection === "baggageOverrides" ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save aria-hidden="true" className="h-4 w-4" />
                Save baggage overrides
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

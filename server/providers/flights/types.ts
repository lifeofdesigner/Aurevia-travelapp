import {type CabinClass} from "@/types/database-enums";

import {
  type FlightPassengerCounts,
  type FlightSearchCriteria,
  type SupportedFlightTripType
} from "@/features/flights/types";
import {type SupportedCurrency} from "@/lib/money";

import {
  type FlightAirlineCatalogEntry,
  type FlightAirportCatalogEntry
} from "./catalog";

export type ProviderFlightSegment = {
  aircraftCode?: string;
  arrivalAt: string;
  baggageAllowance?: {
    cabin?: string;
    checked?: string;
  };
  cabinClass: CabinClass;
  departureAt: string;
  destination: FlightAirportCatalogEntry;
  durationMinutes: number;
  fareClassCode?: string;
  flightNumber: string;
  marketingAirline: FlightAirlineCatalogEntry;
  operatingAirline?: FlightAirlineCatalogEntry;
  origin: FlightAirportCatalogEntry;
};

export type ProviderFlightLeg = {
  arrivalAt: string;
  departureAt: string;
  destination: FlightAirportCatalogEntry;
  durationMinutes: number;
  legIndex: number;
  origin: FlightAirportCatalogEntry;
  segments: ProviderFlightSegment[];
};

export type ProviderFareConditions = {
  cancellationSummary: string;
  changeSummary: string;
  changeable: boolean;
  refundable: boolean;
  ticketingDeadlineAt?: string;
};

export type ProviderFlightOffer = {
  baggageIncluded: boolean;
  baggageSummary: {
    cabin: string;
    checked: string;
    notes?: string;
  };
  baseAmountMinor: number;
  cabinClass: CabinClass;
  currency: SupportedCurrency;
  expiresAt: string;
  fareConditions: ProviderFareConditions;
  legs: ProviderFlightLeg[];
  metadata: Record<string, unknown>;
  passengerCounts: FlightPassengerCounts;
  searchHash: string;
  stopCount: number;
  supplierOfferId: string;
  taxAmountMinor: number;
  totalAmountMinor: number;
  totalDurationMinutes: number;
  tripType: SupportedFlightTripType;
};

export type ProviderFlightSearchContext = {
  destination: FlightAirportCatalogEntry;
  origin: FlightAirportCatalogEntry;
  searchHash: string;
};

export interface FlightOfferProvider {
  code: string;
  requiresCatalogLocations?: boolean;
  search: (
    criteria: FlightSearchCriteria,
    context: ProviderFlightSearchContext
  ) => Promise<ProviderFlightOffer[]>;
}

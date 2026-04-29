import {type NextRequest, NextResponse} from "next/server";

import {
  FLIGHT_AIRPORT_OPTIONS,
  getFlightAirportByCode,
  getFlightAirportSearchText,
  type FlightAirportOption
} from "@/features/flights/lib/airports-data";
import {createSupabaseAdminClient} from "@/server/supabase/admin";
import {duffel, hasDuffelAccessToken} from "@/server/providers/flights/duffel-client";

type AirportSearchSuggestion = {
  city: string;
  code: string;
  country: string;
  countryCode?: string;
  name: string;
  type: string;
};

function normalizeAirportQuery(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function mapLocalAirport(airport: FlightAirportOption): AirportSearchSuggestion {
  return {
    city: airport.cityName,
    code: airport.iataCode,
    country: airport.countryName,
    countryCode: airport.countryCode,
    name: airport.airportName,
    type: "airport"
  };
}

function getAirportSearchScore(airport: AirportSearchSuggestion, normalizedQuery: string) {
  const code = airport.code.toLowerCase();
  const city = airport.city.toLowerCase();
  const name = airport.name.toLowerCase();
  const country = airport.country.toLowerCase();
  const fullText = normalizeAirportQuery(
    [airport.city, airport.name, airport.code, airport.country].join(" ")
  );

  if (code === normalizedQuery) {
    return 0;
  }

  if (city === normalizedQuery) {
    return 1;
  }

  if (name === normalizedQuery) {
    return 2;
  }

  if (code.startsWith(normalizedQuery)) {
    return 3;
  }

  if (city.startsWith(normalizedQuery)) {
    return 4;
  }

  if (name.startsWith(normalizedQuery)) {
    return 5;
  }

  if (country.startsWith(normalizedQuery)) {
    return 6;
  }

  if (fullText.includes(normalizedQuery)) {
    return 7;
  }

  return Number.POSITIVE_INFINITY;
}

function isPopularGlobalAirport(airport: FlightAirportOption) {
  return ["VIE", "LHR", "JFK", "DXB", "CDG", "AMS", "SIN", "HKG"].includes(
    airport.iataCode
  );
}

function buildLocalSuggestions(query: string) {
  const normalizedQuery = normalizeAirportQuery(query);
  const airports = normalizedQuery
    ? FLIGHT_AIRPORT_OPTIONS.filter((airport) =>
        getFlightAirportSearchText(airport).includes(normalizedQuery)
      )
    : FLIGHT_AIRPORT_OPTIONS.filter(isPopularGlobalAirport);

  return airports
    .map(mapLocalAirport)
    .sort((left, right) => {
      if (!normalizedQuery) {
        return 0;
      }

      return (
        getAirportSearchScore(left, normalizedQuery) -
          getAirportSearchScore(right, normalizedQuery) ||
        left.city.localeCompare(right.city)
      );
    })
    .slice(0, 10);
}

async function buildDatabaseSuggestions(query: string) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const result = await admin
    .from("airports")
    .select("iata_code, name, country_code, cities(name), countries(name)")
    .eq("is_active", true)
    .or(
      `iata_code.ilike.${normalizedQuery}%,name.ilike.%${normalizedQuery}%`
    )
    .limit(12);

  if (result.error) {
    return [];
  }

  return ((result.data as Array<{
    cities: {name: string} | null;
    countries: {name: string} | null;
    country_code: string;
    iata_code: string;
    name: string;
  }> | null) ?? []).map((airport) => ({
    city: airport.cities?.name ?? airport.iata_code,
    code: airport.iata_code,
    country: airport.countries?.name ?? airport.country_code,
    countryCode: airport.country_code,
    name: airport.name,
    type: "airport"
  } satisfies AirportSearchSuggestion));
}

function dedupeSuggestions(suggestions: AirportSearchSuggestion[]) {
  return Array.from(
    new Map(
      suggestions
        .filter((suggestion) => suggestion.code.trim().length > 0)
        .map((suggestion) => [suggestion.code, suggestion] as const)
    ).values()
  );
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const [localSuggestions, databaseSuggestions] = await Promise.all([
    Promise.resolve(buildLocalSuggestions(query)),
    buildDatabaseSuggestions(query)
  ]);
  const baseSuggestions = dedupeSuggestions([
    ...localSuggestions,
    ...databaseSuggestions
  ]);

  if (!hasDuffelAccessToken()) {
    return NextResponse.json(baseSuggestions);
  }

  if (query.length < 2) {
    return NextResponse.json(baseSuggestions);
  }

  try {
    const response = await duffel.suggestions.list({
      name: query
    });
    const suggestions = dedupeSuggestions([
      ...baseSuggestions,
      ...response.data.map((place) => {
        const localAirport = getFlightAirportByCode(place.iata_code);

        return {
          city: place.city_name ?? place.name,
          code: place.iata_code,
          country: place.country_name ?? "Unknown",
          countryCode: localAirport?.countryCode ?? place.iata_country_code,
          name: place.name,
          type: place.type
        } satisfies AirportSearchSuggestion;
      })
    ]).slice(0, 15);

    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json(baseSuggestions);
  }
}

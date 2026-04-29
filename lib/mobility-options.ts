export type MobilityLocationOption = {
  airportCode?: string;
  cityId: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  defaultLabel: string;
  isAirport: boolean;
  slug: string;
};

export const MOBILITY_LOCATION_OPTIONS: MobilityLocationOption[] = [
  {
    cityId: "11111111-1111-1111-1111-111111111111",
    cityName: "Vienna",
    countryCode: "AT",
    countryName: "Austria",
    defaultLabel: "Vienna city center",
    isAirport: false,
    slug: "vienna-city"
  },
  {
    airportCode: "VIE",
    cityId: "11111111-1111-1111-1111-111111111111",
    cityName: "Vienna",
    countryCode: "AT",
    countryName: "Austria",
    defaultLabel: "Vienna International Airport (VIE)",
    isAirport: true,
    slug: "vienna-airport"
  },
  {
    cityId: "22222222-2222-2222-2222-222222222222",
    cityName: "Dubai",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    defaultLabel: "Dubai city",
    isAirport: false,
    slug: "dubai-city"
  },
  {
    airportCode: "DXB",
    cityId: "22222222-2222-2222-2222-222222222222",
    cityName: "Dubai",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    defaultLabel: "Dubai International Airport (DXB)",
    isAirport: true,
    slug: "dubai-airport"
  },
  {
    cityId: "33333333-3333-3333-3333-333333333333",
    cityName: "London",
    countryCode: "GB",
    countryName: "United Kingdom",
    defaultLabel: "Central London",
    isAirport: false,
    slug: "london-city"
  },
  {
    airportCode: "LHR",
    cityId: "33333333-3333-3333-3333-333333333333",
    cityName: "London",
    countryCode: "GB",
    countryName: "United Kingdom",
    defaultLabel: "Heathrow Airport (LHR)",
    isAirport: true,
    slug: "london-airport"
  },
  {
    cityId: "44444444-4444-4444-4444-444444444444",
    cityName: "Lagos",
    countryCode: "NG",
    countryName: "Nigeria",
    defaultLabel: "Lagos city",
    isAirport: false,
    slug: "lagos-city"
  },
  {
    airportCode: "LOS",
    cityId: "44444444-4444-4444-4444-444444444444",
    cityName: "Lagos",
    countryCode: "NG",
    countryName: "Nigeria",
    defaultLabel: "Murtala Muhammed Airport (LOS)",
    isAirport: true,
    slug: "lagos-airport"
  },
  {
    cityId: "55555555-5555-5555-5555-555555555555",
    cityName: "New York",
    countryCode: "US",
    countryName: "United States",
    defaultLabel: "Midtown Manhattan",
    isAirport: false,
    slug: "new-york-city"
  },
  {
    airportCode: "JFK",
    cityId: "55555555-5555-5555-5555-555555555555",
    cityName: "New York",
    countryCode: "US",
    countryName: "United States",
    defaultLabel: "John F. Kennedy Airport (JFK)",
    isAirport: true,
    slug: "new-york-airport"
  }
];

export const MOBILITY_AIRPORT_OPTIONS = MOBILITY_LOCATION_OPTIONS.filter(
  (option) => option.isAirport
);

export const MOBILITY_CITY_OPTIONS = MOBILITY_LOCATION_OPTIONS.filter(
  (option) => !option.isAirport
);

export function getMobilityAirportOption(airportCode?: string) {
  if (!airportCode) {
    return undefined;
  }

  return MOBILITY_AIRPORT_OPTIONS.find(
    (option) => option.airportCode === airportCode
  );
}

export function getDefaultCityLabelForAirport(airportCode?: string) {
  const airport = getMobilityAirportOption(airportCode);

  if (!airport) {
    return "";
  }

  return (
    MOBILITY_CITY_OPTIONS.find((option) => option.cityId === airport.cityId)?.defaultLabel ?? ""
  );
}

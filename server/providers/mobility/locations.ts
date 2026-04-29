export type MobilityLocationCatalogEntry = {
  airportCode?: string;
  airportName?: string;
  aliases: string[];
  cityId: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  defaultLabel: string;
  isAirport: boolean;
  slug: string;
  timeZone: string;
};

export const mobilityLocationsCatalog: MobilityLocationCatalogEntry[] = [
  {
    aliases: ["vienna", "wien", "austria", "at"],
    cityId: "11111111-1111-1111-1111-111111111111",
    cityName: "Vienna",
    countryCode: "AT",
    countryName: "Austria",
    defaultLabel: "Vienna city center",
    isAirport: false,
    slug: "vienna-city",
    timeZone: "Europe/Vienna"
  },
  {
    airportCode: "VIE",
    airportName: "Vienna International Airport",
    aliases: ["vie", "vienna airport", "vienna international airport", "loww"],
    cityId: "11111111-1111-1111-1111-111111111111",
    cityName: "Vienna",
    countryCode: "AT",
    countryName: "Austria",
    defaultLabel: "Vienna International Airport (VIE)",
    isAirport: true,
    slug: "vienna-airport",
    timeZone: "Europe/Vienna"
  },
  {
    aliases: ["dubai", "uae", "united arab emirates", "ae", "marina", "jumeirah"],
    cityId: "22222222-2222-2222-2222-222222222222",
    cityName: "Dubai",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    defaultLabel: "Dubai city",
    isAirport: false,
    slug: "dubai-city",
    timeZone: "Asia/Dubai"
  },
  {
    airportCode: "DXB",
    airportName: "Dubai International Airport",
    aliases: ["dxb", "dubai airport", "dubai international airport", "omdb"],
    cityId: "22222222-2222-2222-2222-222222222222",
    cityName: "Dubai",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    defaultLabel: "Dubai International Airport (DXB)",
    isAirport: true,
    slug: "dubai-airport",
    timeZone: "Asia/Dubai"
  },
  {
    aliases: ["london", "uk", "united kingdom", "gb", "mayfair", "south bank"],
    cityId: "33333333-3333-3333-3333-333333333333",
    cityName: "London",
    countryCode: "GB",
    countryName: "United Kingdom",
    defaultLabel: "Central London",
    isAirport: false,
    slug: "london-city",
    timeZone: "Europe/London"
  },
  {
    airportCode: "LHR",
    airportName: "Heathrow Airport",
    aliases: ["lhr", "heathrow", "heathrow airport", "egll"],
    cityId: "33333333-3333-3333-3333-333333333333",
    cityName: "London",
    countryCode: "GB",
    countryName: "United Kingdom",
    defaultLabel: "Heathrow Airport (LHR)",
    isAirport: true,
    slug: "london-airport",
    timeZone: "Europe/London"
  },
  {
    aliases: ["lagos", "nigeria", "ng", "ikoyi"],
    cityId: "44444444-4444-4444-4444-444444444444",
    cityName: "Lagos",
    countryCode: "NG",
    countryName: "Nigeria",
    defaultLabel: "Lagos city",
    isAirport: false,
    slug: "lagos-city",
    timeZone: "Africa/Lagos"
  },
  {
    airportCode: "LOS",
    airportName: "Murtala Muhammed International Airport",
    aliases: ["los", "murtala muhammed", "lagos airport", "dnmm"],
    cityId: "44444444-4444-4444-4444-444444444444",
    cityName: "Lagos",
    countryCode: "NG",
    countryName: "Nigeria",
    defaultLabel: "Murtala Muhammed Airport (LOS)",
    isAirport: true,
    slug: "lagos-airport",
    timeZone: "Africa/Lagos"
  },
  {
    aliases: ["new york", "new york city", "nyc", "us", "usa", "united states", "midtown"],
    cityId: "55555555-5555-5555-5555-555555555555",
    cityName: "New York",
    countryCode: "US",
    countryName: "United States",
    defaultLabel: "Midtown Manhattan",
    isAirport: false,
    slug: "new-york-city",
    timeZone: "America/New_York"
  },
  {
    airportCode: "JFK",
    airportName: "John F. Kennedy International Airport",
    aliases: ["jfk", "john f kennedy", "john f. kennedy", "kennedy airport", "kjfk"],
    cityId: "55555555-5555-5555-5555-555555555555",
    cityName: "New York",
    countryCode: "US",
    countryName: "United States",
    defaultLabel: "John F. Kennedy Airport (JFK)",
    isAirport: true,
    slug: "new-york-airport",
    timeZone: "America/New_York"
  }
];

export function findMobilityLocationByQuery(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return mobilityLocationsCatalog.find((location) =>
    location.aliases.some((alias) => normalizedQuery.includes(alias))
  );
}

export function findMobilityLocationByAirportCode(airportCode: string) {
  return mobilityLocationsCatalog.find(
    (location) =>
      location.airportCode?.toLowerCase() === airportCode.trim().toLowerCase()
  );
}

export function getMobilityAirportOptions() {
  return mobilityLocationsCatalog.filter((location) => location.isAirport);
}

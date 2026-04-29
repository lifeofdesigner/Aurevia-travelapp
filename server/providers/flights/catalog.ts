import {
  FLIGHT_AIRPORT_OPTIONS,
  getFlightAirportSearchText
} from "@/features/flights/lib/airports-data";

type FlightAirportCatalogEntry = {
  airportCode: string;
  airportName: string;
  cityName: string;
  countryCode: string;
  searchAliases: string[];
  timeZone: string;
};

type FlightAirlineCatalogEntry = {
  code: string;
  name: string;
};

const airportCatalog: FlightAirportCatalogEntry[] = [
  {
    airportCode: "DXB",
    airportName: "Dubai International Airport",
    cityName: "Dubai",
    countryCode: "AE",
    searchAliases: ["dubai", "dxb", "dubai airport", "uae"],
    timeZone: "Asia/Dubai"
  },
  {
    airportCode: "AUH",
    airportName: "Zayed International Airport",
    cityName: "Abu Dhabi",
    countryCode: "AE",
    searchAliases: ["abu dhabi", "auh", "zayed", "uae", "united arab emirates"],
    timeZone: "Asia/Dubai"
  },
  {
    airportCode: "LHR",
    airportName: "Heathrow Airport",
    cityName: "London",
    countryCode: "GB",
    searchAliases: ["london", "lhr", "heathrow", "united kingdom", "uk"],
    timeZone: "Europe/London"
  },
  {
    airportCode: "LGW",
    airportName: "Gatwick Airport",
    cityName: "London",
    countryCode: "GB",
    searchAliases: ["london", "lgw", "gatwick", "united kingdom", "uk"],
    timeZone: "Europe/London"
  },
  {
    airportCode: "LOS",
    airportName: "Murtala Muhammed International Airport",
    cityName: "Lagos",
    countryCode: "NG",
    searchAliases: ["lagos", "los", "murtala muhammed", "nigeria"],
    timeZone: "Africa/Lagos"
  },
  {
    airportCode: "ABV",
    airportName: "Nnamdi Azikiwe International Airport",
    cityName: "Abuja",
    countryCode: "NG",
    searchAliases: ["abuja", "abv", "nnamdi azikiwe", "nigeria"],
    timeZone: "Africa/Lagos"
  },
  {
    airportCode: "PHC",
    airportName: "Port Harcourt International Airport",
    cityName: "Port Harcourt",
    countryCode: "NG",
    searchAliases: ["port harcourt", "phc", "nigeria"],
    timeZone: "Africa/Lagos"
  },
  {
    airportCode: "KAN",
    airportName: "Mallam Aminu Kano International Airport",
    cityName: "Kano",
    countryCode: "NG",
    searchAliases: ["kano", "kan", "mallam aminu kano", "nigeria"],
    timeZone: "Africa/Lagos"
  },
  {
    airportCode: "ENU",
    airportName: "Akanu Ibiam International Airport",
    cityName: "Enugu",
    countryCode: "NG",
    searchAliases: ["enugu", "enu", "akanu ibiam", "nigeria"],
    timeZone: "Africa/Lagos"
  },
  {
    airportCode: "ILR",
    airportName: "Ilorin International Airport",
    cityName: "Ilorin",
    countryCode: "NG",
    searchAliases: ["ilorin", "ilr", "nigeria"],
    timeZone: "Africa/Lagos"
  },
  {
    airportCode: "CBQ",
    airportName: "Margaret Ekpo International Airport",
    cityName: "Calabar",
    countryCode: "NG",
    searchAliases: ["calabar", "cbq", "margaret ekpo", "nigeria"],
    timeZone: "Africa/Lagos"
  },
  {
    airportCode: "BNI",
    airportName: "Benin Airport",
    cityName: "Benin City",
    countryCode: "NG",
    searchAliases: ["benin city", "bni", "benin airport", "nigeria"],
    timeZone: "Africa/Lagos"
  },
  {
    airportCode: "QOW",
    airportName: "Sam Mbakwe Airport",
    cityName: "Owerri",
    countryCode: "NG",
    searchAliases: ["owerri", "qow", "sam mbakwe", "nigeria"],
    timeZone: "Africa/Lagos"
  },
  {
    airportCode: "ACC",
    airportName: "Kotoka International Airport",
    cityName: "Accra",
    countryCode: "GH",
    searchAliases: ["accra", "acc", "kotoka", "ghana"],
    timeZone: "Africa/Accra"
  },
  {
    airportCode: "NBO",
    airportName: "Jomo Kenyatta International Airport",
    cityName: "Nairobi",
    countryCode: "KE",
    searchAliases: ["nairobi", "nbo", "jomo kenyatta", "kenya"],
    timeZone: "Africa/Nairobi"
  },
  {
    airportCode: "JNB",
    airportName: "O. R. Tambo International Airport",
    cityName: "Johannesburg",
    countryCode: "ZA",
    searchAliases: ["johannesburg", "jnb", "or tambo", "south africa"],
    timeZone: "Africa/Johannesburg"
  },
  {
    airportCode: "ADD",
    airportName: "Addis Ababa Bole International Airport",
    cityName: "Addis Ababa",
    countryCode: "ET",
    searchAliases: ["addis ababa", "add", "bole", "ethiopia"],
    timeZone: "Africa/Addis_Ababa"
  },
  {
    airportCode: "CAI",
    airportName: "Cairo International Airport",
    cityName: "Cairo",
    countryCode: "EG",
    searchAliases: ["cairo", "cai", "egypt"],
    timeZone: "Africa/Cairo"
  },
  {
    airportCode: "DKR",
    airportName: "Blaise Diagne International Airport",
    cityName: "Dakar",
    countryCode: "SN",
    searchAliases: ["dakar", "dkr", "blaise diagne", "senegal"],
    timeZone: "Africa/Dakar"
  },
  {
    airportCode: "ABJ",
    airportName: "Felix Houphouet Boigny International Airport",
    cityName: "Abidjan",
    countryCode: "CI",
    searchAliases: ["abidjan", "abj", "felix houphouet boigny", "cote d'ivoire"],
    timeZone: "Africa/Abidjan"
  },
  {
    airportCode: "CDG",
    airportName: "Charles de Gaulle Airport",
    cityName: "Paris",
    countryCode: "FR",
    searchAliases: ["paris", "cdg", "charles de gaulle", "france"],
    timeZone: "Europe/Paris"
  },
  {
    airportCode: "AMS",
    airportName: "Amsterdam Airport Schiphol",
    cityName: "Amsterdam",
    countryCode: "NL",
    searchAliases: ["amsterdam", "ams", "schiphol", "netherlands"],
    timeZone: "Europe/Amsterdam"
  },
  {
    airportCode: "FRA",
    airportName: "Frankfurt Airport",
    cityName: "Frankfurt",
    countryCode: "DE",
    searchAliases: ["frankfurt", "fra", "germany"],
    timeZone: "Europe/Berlin"
  },
  {
    airportCode: "IST",
    airportName: "Istanbul Airport",
    cityName: "Istanbul",
    countryCode: "TR",
    searchAliases: ["istanbul", "ist", "turkey"],
    timeZone: "Europe/Istanbul"
  },
  {
    airportCode: "FCO",
    airportName: "Leonardo da Vinci International Airport",
    cityName: "Rome",
    countryCode: "IT",
    searchAliases: ["rome", "fco", "leonardo da vinci", "italy"],
    timeZone: "Europe/Rome"
  },
  {
    airportCode: "DOH",
    airportName: "Hamad International Airport",
    cityName: "Doha",
    countryCode: "QA",
    searchAliases: ["doha", "doh", "hamad", "qatar"],
    timeZone: "Asia/Qatar"
  },
  {
    airportCode: "RUH",
    airportName: "King Khalid International Airport",
    cityName: "Riyadh",
    countryCode: "SA",
    searchAliases: ["riyadh", "ruh", "king khalid", "saudi arabia"],
    timeZone: "Asia/Riyadh"
  },
  {
    airportCode: "JED",
    airportName: "King Abdulaziz International Airport",
    cityName: "Jeddah",
    countryCode: "SA",
    searchAliases: ["jeddah", "jed", "king abdulaziz", "saudi arabia"],
    timeZone: "Asia/Riyadh"
  },
  {
    airportCode: "JFK",
    airportName: "John F. Kennedy International Airport",
    cityName: "New York",
    countryCode: "US",
    searchAliases: [
      "new york",
      "new york city",
      "nyc",
      "jfk",
      "john f kennedy",
      "usa",
      "united states"
    ],
    timeZone: "America/New_York"
  },
  {
    airportCode: "EWR",
    airportName: "Newark Liberty International Airport",
    cityName: "Newark",
    countryCode: "US",
    searchAliases: ["newark", "ewr", "new jersey", "usa", "united states"],
    timeZone: "America/New_York"
  },
  {
    airportCode: "IAD",
    airportName: "Washington Dulles International Airport",
    cityName: "Washington",
    countryCode: "US",
    searchAliases: ["washington", "iad", "dulles", "usa", "united states"],
    timeZone: "America/New_York"
  },
  {
    airportCode: "YYZ",
    airportName: "Toronto Pearson International Airport",
    cityName: "Toronto",
    countryCode: "CA",
    searchAliases: ["toronto", "yyz", "pearson", "canada"],
    timeZone: "America/Toronto"
  },
  {
    airportCode: "SIN",
    airportName: "Singapore Changi Airport",
    cityName: "Singapore",
    countryCode: "SG",
    searchAliases: ["singapore", "sin", "changi"],
    timeZone: "Asia/Singapore"
  },
  {
    airportCode: "HKG",
    airportName: "Hong Kong International Airport",
    cityName: "Hong Kong",
    countryCode: "HK",
    searchAliases: ["hong kong", "hkg", "chek lap kok"],
    timeZone: "Asia/Hong_Kong"
  },
  {
    airportCode: "BOM",
    airportName: "Chhatrapati Shivaji Maharaj International Airport",
    cityName: "Mumbai",
    countryCode: "IN",
    searchAliases: ["mumbai", "bombay", "bom", "india"],
    timeZone: "Asia/Kolkata"
  },
  {
    airportCode: "DEL",
    airportName: "Indira Gandhi International Airport",
    cityName: "Delhi",
    countryCode: "IN",
    searchAliases: ["delhi", "new delhi", "del", "india"],
    timeZone: "Asia/Kolkata"
  },
  {
    airportCode: "VIE",
    airportName: "Vienna International Airport",
    cityName: "Vienna",
    countryCode: "AT",
    searchAliases: ["vienna", "vie", "vienna airport", "austria", "wien"],
    timeZone: "Europe/Vienna"
  }
];

const airlineCatalog: FlightAirlineCatalogEntry[] = [
  {code: "OS", name: "Austrian Airlines"},
  {code: "EK", name: "Emirates"},
  {code: "BA", name: "British Airways"},
  {code: "P4", name: "Air Peace"},
  {code: "DL", name: "Delta Air Lines"}
];

const routeDurationMinutes: Record<string, number> = {
  "LOS-ABV": 70,
  "LOS-PHC": 65,
  "LOS-KAN": 80,
  "LOS-ENU": 55,
  "LOS-ILR": 50,
  "LOS-CBQ": 70,
  "LOS-BNI": 50,
  "LOS-QOW": 70,
  "LOS-ACC": 70,
  "LOS-NBO": 310,
  "LOS-JNB": 360,
  "LOS-ADD": 320,
  "LOS-CAI": 330,
  "LOS-DKR": 210,
  "LOS-ABJ": 100,
  "LOS-LGW": 395,
  "LOS-CDG": 400,
  "LOS-AMS": 410,
  "LOS-FRA": 385,
  "LOS-IST": 360,
  "LOS-FCO": 360,
  "LOS-AUH": 430,
  "LOS-DOH": 445,
  "LOS-RUH": 460,
  "LOS-JED": 420,
  "LOS-EWR": 640,
  "LOS-IAD": 610,
  "LOS-YYZ": 690,
  "LOS-SIN": 770,
  "LOS-HKG": 780,
  "LOS-BOM": 560,
  "LOS-DEL": 590,
  "VIE-DXB": 345,
  "VIE-JFK": 540,
  "VIE-LHR": 140,
  "VIE-LOS": 395,
  "DXB-JFK": 850,
  "DXB-LHR": 450,
  "DXB-LOS": 460,
  "JFK-LHR": 425,
  "JFK-LOS": 620,
  "LHR-LOS": 390
};

export type {FlightAirlineCatalogEntry, FlightAirportCatalogEntry};

export function getMockAirportByCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  const catalogAirport = airportCatalog.find(
    (airport) => airport.airportCode === normalizedCode
  );

  if (catalogAirport) {
    return catalogAirport;
  }

  const fallbackAirport = FLIGHT_AIRPORT_OPTIONS.find(
    (airport) => airport.iataCode === normalizedCode
  );

  if (!fallbackAirport) {
    return undefined;
  }

  return {
    airportCode: fallbackAirport.iataCode,
    airportName: fallbackAirport.airportName,
    cityName: fallbackAirport.cityName,
    countryCode: fallbackAirport.countryCode,
    searchAliases: Array.from(
      new Set(
        [
          fallbackAirport.iataCode,
          fallbackAirport.cityName,
          fallbackAirport.airportName,
          fallbackAirport.countryName
        ].map((value) => value.toLowerCase())
      )
    ),
    timeZone: "UTC"
  };
}

export function getMockAirlineByCode(code: string) {
  return airlineCatalog.find((airline) => airline.code === code);
}

export function resolveMockFlightLocation(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return null;
  }

  const catalogAirport = airportCatalog.find(
    (airport) =>
      airport.airportCode.toLowerCase() === normalizedQuery ||
      airport.searchAliases.some((alias) => alias.includes(normalizedQuery))
  );

  if (catalogAirport) {
    return catalogAirport;
  }

  const fallbackAirport = FLIGHT_AIRPORT_OPTIONS.find(
    (airport) =>
      airport.iataCode.toLowerCase() === normalizedQuery ||
      getFlightAirportSearchText(airport).includes(normalizedQuery)
  );

  return fallbackAirport ? getMockAirportByCode(fallbackAirport.iataCode) ?? null : null;
}

export function listMockHubAirports(originCode: string, destinationCode: string) {
  return airportCatalog.filter(
    (airport) =>
      airport.airportCode !== originCode && airport.airportCode !== destinationCode
  );
}

export function getMockRouteDurationMinutes(
  originAirportCode: string,
  destinationAirportCode: string
) {
  const directKey = `${originAirportCode}-${destinationAirportCode}`;
  const reverseKey = `${destinationAirportCode}-${originAirportCode}`;

  return routeDurationMinutes[directKey] ?? routeDurationMinutes[reverseKey] ?? 360;
}

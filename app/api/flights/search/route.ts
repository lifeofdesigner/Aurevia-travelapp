import {createHash, randomUUID} from "crypto";

import {type NextRequest, NextResponse} from "next/server";
import {ZodError, z} from "zod";

import {FLIGHT_AIRPORT_OPTIONS} from "@/features/flights/lib/airports-data";
import {
  type Airline,
  type Airport,
  type FlightOffer,
  type FlightSearchParams,
  type FlightSearchResponse as MockFlightSearchResponse,
  type FlightSegment
} from "@/features/flights/lib/flight-types";
import {parseFlightSearchCriteria} from "@/features/flights/lib/schemas";
import {getAirlineLogoUrl} from "@/lib/flights/airline-branding";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {searchFlights as searchFlightsFromServer} from "@/server/flights/search-service";

function getIpHash(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (!forwardedFor) {
    return undefined;
  }

  const rawIp = forwardedFor.split(",")[0]?.trim();

  if (!rawIp) {
    return undefined;
  }

  return createHash("sha256").update(rawIp).digest("hex");
}

const mockSearchSchema = z
  .object({
    from: z
      .string()
      .trim()
      .min(1, "Origin airport is required.")
      .regex(/^[A-Za-z]{3}$/, "Origin must be a valid 3-letter IATA code.")
      .transform((value) => value.toUpperCase()),
    to: z
      .string()
      .trim()
      .min(1, "Destination airport is required.")
      .regex(/^[A-Za-z]{3}$/, "Destination must be a valid 3-letter IATA code.")
      .transform((value) => value.toUpperCase()),
    departureDate: z
      .string()
      .trim()
      .min(1, "Departure date is required.")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Departure date must be in YYYY-MM-DD format."),
    returnDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Return date must be in YYYY-MM-DD format.")
      .optional(),
    passengers: z.coerce
      .number()
      .int("Passengers must be a whole number.")
      .min(1, "Passengers must be at least 1.")
      .max(9, "Passengers cannot be more than 9."),
    cabin: z.enum(["economy", "premium_economy", "business", "first"]),
    tripType: z.enum(["round", "oneway", "multi"])
  })
  .superRefine((value, context) => {
    if (value.from === value.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Origin and destination must be different.",
        path: ["to"]
      });
    }

    if (value.tripType === "round" && !value.returnDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Return date is required for round-trip searches.",
        path: ["returnDate"]
      });
    }

    if (
      value.returnDate &&
      new Date(value.returnDate).getTime() < new Date(value.departureDate).getTime()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Return date cannot be earlier than departure date.",
        path: ["returnDate"]
      });
    }
  });

type ParsedMockSearchParams = z.infer<typeof mockSearchSchema>;

const AIRLINES: Airline[] = [
  {name: "Air Peace", code: "P4"},
  {name: "Arik Air", code: "W3"},
  {name: "Ethiopian Airlines", code: "ET"},
  {name: "Qatar Airways", code: "QR"},
  {name: "British Airways", code: "BA"},
  {name: "Emirates", code: "EK"}
].map((airline) => ({
  ...airline,
  logo: getAirlineLogoUrl(airline.code, 64) ?? undefined
}));

const routePriceOverrides: Record<string, number> = {
  "LOS-ABV": 145000,
  "ABV-LOS": 145000,
  "LOS-PHC": 135000,
  "PHC-LOS": 135000,
  "LOS-LHR": 780000,
  "LHR-LOS": 780000,
  "LOS-DXB": 690000,
  "DXB-LOS": 690000,
  "LOS-JFK": 1280000,
  "JFK-LOS": 1280000,
  "LOS-ACC": 220000,
  "ACC-LOS": 220000,
  "LOS-CAI": 510000,
  "CAI-LOS": 510000,
  "LOS-DOH": 720000,
  "DOH-LOS": 720000
};

const routeDurationOverrides: Record<string, number> = {
  "LOS-ABV": 70,
  "ABV-LOS": 70,
  "LOS-PHC": 65,
  "PHC-LOS": 65,
  "LOS-LHR": 390,
  "LHR-LOS": 405,
  "LOS-DXB": 450,
  "DXB-LOS": 470,
  "LOS-JFK": 660,
  "JFK-LOS": 640,
  "LOS-ACC": 70,
  "ACC-LOS": 70,
  "LOS-CAI": 330,
  "CAI-LOS": 340,
  "LOS-DOH": 445,
  "DOH-LOS": 460
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function buildDateTime(date: string, hours: number, minutes: number) {
  return new Date(`${date}T${pad(hours)}:${pad(minutes)}:00.000Z`);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function getAirport(code: string): Airport {
  const airport = FLIGHT_AIRPORT_OPTIONS.find((entry) => entry.iataCode === code);

  return (
    airport
      ? {
          code: airport.iataCode,
          city: airport.cityName,
          country: airport.countryName,
          name: airport.airportName
        }
      : {
          code,
          city: code,
          country: "Unknown",
          name: `${code} International Airport`
        }
  );
}

function getRouteDurationMinutes(from: string, to: string, stops: number) {
  const key = `${from}-${to}`;
  const directDuration = routeDurationOverrides[key] ?? 360;
  return stops === 0 ? directDuration : directDuration + 105;
}

function getBaseRoutePrice(from: string, to: string) {
  const key = `${from}-${to}`;

  if (routePriceOverrides[key]) {
    return routePriceOverrides[key];
  }

  const durationPrice = getRouteDurationMinutes(from, to, 0) * 1850;
  return Math.max(280000, Math.round(durationPrice / 5000) * 5000);
}

function getCabinMultiplier(cabin: FlightSearchParams["cabin"]) {
  switch (cabin) {
    case "premium_economy":
      return 1.28;
    case "business":
      return 2.05;
    case "first":
      return 3.1;
    case "economy":
    default:
      return 1;
  }
}

function buildSegment(input: {
  airline: Airline;
  arrivalAirport: Airport;
  departureAirport: Airport;
  departureDate: string;
  departureHour: number;
  departureMinute: number;
  flightNumber: string;
  stops: number;
}): FlightSegment {
  const durationMinutes = getRouteDurationMinutes(
    input.departureAirport.code,
    input.arrivalAirport.code,
    input.stops
  );
  const departure = buildDateTime(
    input.departureDate,
    input.departureHour,
    input.departureMinute
  );
  const arrival = addMinutes(departure, durationMinutes);

  return {
    airline: input.airline,
    arrivalAirport: input.arrivalAirport,
    arrivalTime: arrival.toISOString(),
    departureAirport: input.departureAirport,
    departureTime: departure.toISOString(),
    duration: formatDuration(durationMinutes),
    flightNumber: input.flightNumber,
    stops: input.stops
  };
}

function buildMockOffers(params: ParsedMockSearchParams): FlightOffer[] {
  const departureAirport = getAirport(params.from);
  const arrivalAirport = getAirport(params.to);
  const routeBasePrice = getBaseRoutePrice(params.from, params.to);
  const cabinMultiplier = getCabinMultiplier(params.cabin);
  const templates = [
    {
      airline: AIRLINES[0],
      baggage: "1 x 23kg checked bag",
      departureHour: 6,
      departureMinute: 45,
      inboundHour: 8,
      inboundMinute: 10,
      multiplier: 1,
      refundable: false,
      seatsLeft: 8,
      stops: 0
    },
    {
      airline: AIRLINES[1],
      baggage: "1 x 23kg checked bag",
      departureHour: 8,
      departureMinute: 30,
      inboundHour: 10,
      inboundMinute: 0,
      multiplier: 1.06,
      refundable: false,
      seatsLeft: 6,
      stops: 0
    },
    {
      airline: AIRLINES[2],
      baggage: "2 x 23kg checked bags",
      departureHour: 10,
      departureMinute: 15,
      inboundHour: 12,
      inboundMinute: 5,
      multiplier: 1.12,
      refundable: true,
      seatsLeft: 7,
      stops: 1
    },
    {
      airline: AIRLINES[4],
      baggage: "2 x 23kg checked bags",
      departureHour: 13,
      departureMinute: 20,
      inboundHour: 15,
      inboundMinute: 10,
      multiplier: 1.18,
      refundable: true,
      seatsLeft: 4,
      stops: 0
    },
    {
      airline: AIRLINES[3],
      baggage: "2 x 23kg checked bags",
      departureHour: 17,
      departureMinute: 5,
      inboundHour: 18,
      inboundMinute: 50,
      multiplier: 1.24,
      refundable: true,
      seatsLeft: 3,
      stops: 1
    },
    {
      airline: AIRLINES[5],
      baggage: "2 x 32kg checked bags",
      departureHour: 21,
      departureMinute: 35,
      inboundHour: 22,
      inboundMinute: 20,
      multiplier: 1.32,
      refundable: true,
      seatsLeft: 2,
      stops: 1
    }
  ] as const;
  const passengerAdjustedBase = routeBasePrice * params.passengers;

  return templates.map((template, index) => {
    const price = Math.round(
      (passengerAdjustedBase * template.multiplier * cabinMultiplier) / 5000
    ) * 5000;
    const outbound = buildSegment({
      airline: template.airline,
      arrivalAirport,
      departureAirport,
      departureDate: params.departureDate,
      departureHour: template.departureHour,
      departureMinute: template.departureMinute,
      flightNumber: `${template.airline.code}${410 + index * 7}`,
      stops: template.stops
    });
    const inbound =
      params.tripType === "round" && params.returnDate
        ? buildSegment({
            airline: template.airline,
            arrivalAirport: departureAirport,
            departureAirport: arrivalAirport,
            departureDate: params.returnDate,
            departureHour: template.inboundHour,
            departureMinute: template.inboundMinute,
            flightNumber: `${template.airline.code}${510 + index * 7}`,
            stops: template.stops
          })
        : undefined;

    return {
      baggage: template.baggage,
      cabin: params.cabin,
      currency: "NGN",
      id: `mock-flight-${index + 1}`,
      inbound,
      outbound,
      price,
      refundable: template.refundable,
      seatsLeft: template.seatsLeft
    };
  });
}

function buildMockResponse(params: ParsedMockSearchParams): MockFlightSearchResponse {
  const offers = buildMockOffers(params);

  return {
    currency: "NGN",
    offers,
    searchId: randomUUID(),
    totalResults: offers.length
  };
}

async function parseJsonBody(request: NextRequest) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      errors: error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message
      })),
      message: error.issues[0]?.message ?? "Invalid flight search request."
    },
    {status: 400}
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await parseJsonBody(request);

    if (!rawBody) {
      return NextResponse.json(
        {
          message: "A valid JSON request body is required."
        },
        {status: 400}
      );
    }

    const params = mockSearchSchema.parse(rawBody);
    await sleep(1500);

    return NextResponse.json(buildMockResponse(params));
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to search flights right now."
      },
      {status: 500}
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const criteria = parseFlightSearchCriteria(request.nextUrl.searchParams);
    const supabase = createSupabaseServerClient();
    const userResponse = await supabase.auth.getUser();
    const existingSessionId = request.cookies.get("aurevia_session_id")?.value;
    const sessionId = existingSessionId ?? randomUUID();
    const searchResponse = await searchFlightsFromServer(criteria, {
      ipHash: getIpHash(request),
      sessionId,
      userAgent: request.headers.get("user-agent") ?? undefined,
      userId: userResponse.data.user?.id
    });
    const response = NextResponse.json(searchResponse);

    if (!existingSessionId) {
      response.cookies.set("aurevia_session_id", sessionId, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax"
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid flight search parameters."
        },
        {status: 400}
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Unable to search flights right now."
      },
      {status: 500}
    );
  }
}

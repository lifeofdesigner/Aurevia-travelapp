export interface FlightSearchParams {
  from: string;
  to: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabin: "economy" | "premium_economy" | "business" | "first";
  tripType: "round" | "oneway" | "multi";
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface Airline {
  name: string;
  code: string;
  logo?: string;
}

export interface FlightSegment {
  departureTime: string;
  arrivalTime: string;
  departureAirport: Airport;
  arrivalAirport: Airport;
  duration: string;
  flightNumber: string;
  airline: Airline;
  stops: number;
}

export interface FlightOffer {
  id: string;
  outbound: FlightSegment;
  inbound?: FlightSegment;
  price: number;
  currency: string;
  cabin: string;
  seatsLeft?: number;
  refundable: boolean;
  baggage: string;
}

export interface FlightSearchResponse {
  offers: FlightOffer[];
  searchId: string;
  currency: string;
  totalResults: number;
}


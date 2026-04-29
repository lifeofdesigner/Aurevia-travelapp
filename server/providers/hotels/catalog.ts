import {type HotelAmenity, type HotelPropertyType} from "@/features/hotels/types";
import {type HotelRateType} from "@/types/database-enums";

export const MOCK_HOTELS_SUPPLIER = {
  code: "mock-stays-suite",
  id: "23232323-2323-2323-2323-232323232323"
} as const;

export type HotelDestinationCatalogEntry = {
  aliases: string[];
  cityId: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  slug: string;
};

export type MockHotelRoomTemplate = {
  amenities: HotelAmenity[];
  bedsSummary: string;
  breakfastIncluded: boolean;
  cancellationSummary: string;
  description: string;
  guestCapacity: number;
  imageUrl: string;
  rateType: HotelRateType;
  refundable: boolean;
  roomCode: string;
  roomName: string;
  sizeSqm?: number;
  nightlyRateEurMinor: number;
};

export type MockHotelCatalogProperty = {
  addressLine: string;
  amenities: HotelAmenity[];
  cityId: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  description: string;
  featuredTags: string[];
  guestRating: number;
  images: string[];
  latitude: number;
  longitude: number;
  neighborhood: string;
  policies: {
    cancellation: string;
    checkIn: string;
    checkOut: string;
    children: string;
    pets: string;
  };
  propertyCode: string;
  propertyName: string;
  propertyType: HotelPropertyType;
  reviewCount: number;
  roomTemplates: MockHotelRoomTemplate[];
  starRating: number;
};

export const hotelDestinationsCatalog: HotelDestinationCatalogEntry[] = [
  {
    aliases: ["vienna", "wien", "austria", "at"],
    cityId: "11111111-1111-1111-1111-111111111111",
    cityName: "Vienna",
    countryCode: "AT",
    countryName: "Austria",
    slug: "vienna"
  },
  {
    aliases: ["dubai", "uae", "united arab emirates", "ae"],
    cityId: "22222222-2222-2222-2222-222222222222",
    cityName: "Dubai",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    slug: "dubai"
  },
  {
    aliases: ["london", "united kingdom", "uk", "gb"],
    cityId: "33333333-3333-3333-3333-333333333333",
    cityName: "London",
    countryCode: "GB",
    countryName: "United Kingdom",
    slug: "london"
  },
  {
    aliases: ["lagos", "nigeria", "ng"],
    cityId: "44444444-4444-4444-4444-444444444444",
    cityName: "Lagos",
    countryCode: "NG",
    countryName: "Nigeria",
    slug: "lagos"
  },
  {
    aliases: ["new york", "new york city", "nyc", "usa", "united states", "us"],
    cityId: "55555555-5555-5555-5555-555555555555",
    cityName: "New York",
    countryCode: "US",
    countryName: "United States",
    slug: "new-york"
  }
];

export function findHotelDestinationByQuery(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return hotelDestinationsCatalog.find((destination) =>
    destination.aliases.some((alias) => normalizedQuery.includes(alias))
  );
}

export const mockHotelCatalog: MockHotelCatalogProperty[] = [
  {
    addressLine: "Petersplatz 7, 1010 Vienna",
    amenities: ["wifi", "spa", "gym", "breakfast", "concierge", "transfer"],
    cityId: "11111111-1111-1111-1111-111111111111",
    cityName: "Vienna",
    countryCode: "AT",
    countryName: "Austria",
    description:
      "A refined Inner City address pairing quiet service, polished rooms, and fast access to Vienna's historic core.",
    featuredTags: ["Historic center", "Private arrival support", "Quiet luxury"],
    guestRating: 9.4,
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=1400&q=80"
    ],
    latitude: 48.2101,
    longitude: 16.3672,
    neighborhood: "Innere Stadt",
    policies: {
      cancellation: "Free cancellation up to 72 hours before arrival for flexible rates.",
      checkIn: "Check-in from 15:00",
      checkOut: "Check-out until 11:00",
      children: "Children welcome. Interconnecting room requests are subject to availability.",
      pets: "Pets accepted on request for selected suites."
    },
    propertyCode: "VIE-PALAIS-AURORA",
    propertyName: "Palais Aurora Vienna",
    propertyType: "boutique",
    reviewCount: 382,
    roomTemplates: [
      {
        amenities: ["wifi", "breakfast", "concierge"],
        bedsSummary: "1 king bed",
        breakfastIncluded: true,
        cancellationSummary: "Cancel free until 72 hours before arrival.",
        description: "Elegant city-facing room with marble bath and writing desk.",
        guestCapacity: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 26500,
        rateType: "bed_and_breakfast",
        refundable: true,
        roomCode: "DELUXE-KING",
        roomName: "Deluxe King Room",
        sizeSqm: 32
      },
      {
        amenities: ["wifi", "spa", "breakfast", "concierge", "transfer"],
        bedsSummary: "1 king bed and lounge area",
        breakfastIncluded: true,
        cancellationSummary: "Cancel free until 7 days before arrival.",
        description: "Junior suite with salon seating and curated in-room amenities.",
        guestCapacity: 3,
        imageUrl:
          "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 39500,
        rateType: "bed_and_breakfast",
        refundable: true,
        roomCode: "JUNIOR-SUITE",
        roomName: "Junior Suite",
        sizeSqm: 47
      }
    ],
    starRating: 5
  },
  {
    addressLine: "Obere Donaustrasse 23, 1020 Vienna",
    amenities: ["wifi", "gym", "parking", "breakfast"],
    cityId: "11111111-1111-1111-1111-111111111111",
    cityName: "Vienna",
    countryCode: "AT",
    countryName: "Austria",
    description:
      "Design-led suites near the Danube Canal with smart layouts for short city breaks and longer premium stays.",
    featuredTags: ["Canal district", "Suite layouts", "Business ready"],
    guestRating: 8.9,
    images: [
      "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80"
    ],
    latitude: 48.216,
    longitude: 16.3778,
    neighborhood: "Leopoldstadt",
    policies: {
      cancellation: "Flexible and prepaid rates available.",
      checkIn: "Check-in from 14:00",
      checkOut: "Check-out until 12:00",
      children: "Family rooms available on request.",
      pets: "Pets not allowed."
    },
    propertyCode: "VIE-DANUBE-ATELIER",
    propertyName: "Danube Atelier Suites",
    propertyType: "aparthotel",
    reviewCount: 241,
    roomTemplates: [
      {
        amenities: ["wifi", "breakfast"],
        bedsSummary: "1 queen bed",
        breakfastIncluded: false,
        cancellationSummary: "Non-refundable saver rate.",
        description: "Quiet studio with kitchenette and rainfall shower.",
        guestCapacity: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 18800,
        rateType: "room_only",
        refundable: false,
        roomCode: "CANAL-STUDIO",
        roomName: "Canal Studio",
        sizeSqm: 28
      },
      {
        amenities: ["wifi", "breakfast", "parking"],
        bedsSummary: "1 king bed and sofa bed",
        breakfastIncluded: true,
        cancellationSummary: "Cancel free until 48 hours before arrival.",
        description: "Open-plan suite with lounge corner and canal outlook.",
        guestCapacity: 4,
        imageUrl:
          "https://images.unsplash.com/photo-1505692952047-1a78307da8f2?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 24800,
        rateType: "bed_and_breakfast",
        refundable: true,
        roomCode: "ATELIER-SUITE",
        roomName: "Atelier Suite",
        sizeSqm: 41
      }
    ],
    starRating: 4
  },
  {
    addressLine: "Dubai Marina Walk, Dubai",
    amenities: ["wifi", "pool", "spa", "gym", "breakfast", "concierge", "transfer"],
    cityId: "22222222-2222-2222-2222-222222222222",
    cityName: "Dubai",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    description:
      "Marina-facing hospitality with polished transfers, resort facilities, and room categories built for stopovers or longer luxury stays.",
    featuredTags: ["Marina views", "Pool deck", "Private transfer ready"],
    guestRating: 9.2,
    images: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=80"
    ],
    latitude: 25.0819,
    longitude: 55.1403,
    neighborhood: "Dubai Marina",
    policies: {
      cancellation: "Flexible and premium advance-purchase options available.",
      checkIn: "Check-in from 15:00",
      checkOut: "Check-out until 12:00",
      children: "Children up to 11 stay free in existing bedding.",
      pets: "Pets not allowed."
    },
    propertyCode: "DXB-MARINA-CRESCENT",
    propertyName: "Marina Crescent Resort",
    propertyType: "resort",
    reviewCount: 519,
    roomTemplates: [
      {
        amenities: ["wifi", "pool", "gym"],
        bedsSummary: "1 king bed",
        breakfastIncluded: false,
        cancellationSummary: "Cancel free until 5 days before arrival.",
        description: "Marina-facing room with walk-in shower and balcony seating.",
        guestCapacity: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 27800,
        rateType: "room_only",
        refundable: true,
        roomCode: "MARINA-KING",
        roomName: "Marina King Room",
        sizeSqm: 38
      },
      {
        amenities: ["wifi", "pool", "spa", "breakfast", "transfer"],
        bedsSummary: "1 king bed and lounge seating",
        breakfastIncluded: true,
        cancellationSummary: "Cancel free until 7 days before arrival.",
        description: "Premium suite with skyline lounge, club access, and transfer credit.",
        guestCapacity: 3,
        imageUrl:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 43800,
        rateType: "bed_and_breakfast",
        refundable: true,
        roomCode: "SKYLINE-SUITE",
        roomName: "Skyline Club Suite",
        sizeSqm: 58
      }
    ],
    starRating: 5
  },
  {
    addressLine: "Madinat Jumeirah District, Dubai",
    amenities: ["wifi", "pool", "spa", "gym", "breakfast", "concierge"],
    cityId: "22222222-2222-2222-2222-222222222222",
    cityName: "Dubai",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    description:
      "A quieter premium stay with warm interiors, family-friendly suites, and easy road access for airport or city transfers.",
    featuredTags: ["Resort calm", "Family suite options", "Beach proximity"],
    guestRating: 8.8,
    images: [
      "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80"
    ],
    latitude: 25.1322,
    longitude: 55.1852,
    neighborhood: "Jumeirah",
    policies: {
      cancellation: "Saver and flexible rates both available.",
      checkIn: "Check-in from 15:00",
      checkOut: "Check-out until 12:00",
      children: "Rollaway beds available for selected categories.",
      pets: "Pets not allowed."
    },
    propertyCode: "DXB-DESERT-PEARL",
    propertyName: "Desert Pearl Suites",
    propertyType: "hotel",
    reviewCount: 304,
    roomTemplates: [
      {
        amenities: ["wifi", "pool", "gym"],
        bedsSummary: "1 king bed",
        breakfastIncluded: false,
        cancellationSummary: "Non-refundable promotional rate.",
        description: "Serene room with sand-toned palette and deep soaking bath.",
        guestCapacity: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 22400,
        rateType: "room_only",
        refundable: false,
        roomCode: "PEARL-ROOM",
        roomName: "Pearl Guest Room",
        sizeSqm: 35
      },
      {
        amenities: ["wifi", "pool", "breakfast", "concierge"],
        bedsSummary: "1 king bed and 2 twin options",
        breakfastIncluded: true,
        cancellationSummary: "Cancel free until 72 hours before arrival.",
        description: "Family suite with separate lounge and flexible bedding options.",
        guestCapacity: 4,
        imageUrl:
          "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 31200,
        rateType: "bed_and_breakfast",
        refundable: true,
        roomCode: "FAMILY-SUITE",
        roomName: "Family Residence Suite",
        sizeSqm: 52
      }
    ],
    starRating: 5
  },
  {
    addressLine: "Carlos Place, Mayfair, London",
    amenities: ["wifi", "gym", "breakfast", "concierge", "transfer"],
    cityId: "33333333-3333-3333-3333-333333333333",
    cityName: "London",
    countryCode: "GB",
    countryName: "United Kingdom",
    description:
      "Classic Mayfair hospitality with discreet service, polished rooms, and smooth access to West End and business appointments.",
    featuredTags: ["Mayfair address", "Private arrival", "Business and leisure"],
    guestRating: 9.3,
    images: [
      "https://images.unsplash.com/photo-1445991842772-097fea258e7b?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80"
    ],
    latitude: 51.509,
    longitude: -0.1473,
    neighborhood: "Mayfair",
    policies: {
      cancellation: "Flexible and semi-flex rates available.",
      checkIn: "Check-in from 15:00",
      checkOut: "Check-out until 11:00",
      children: "Children welcome in suites and selected rooms.",
      pets: "Small pets accepted on request."
    },
    propertyCode: "LON-ASHBOURNE-MAYFAIR",
    propertyName: "Ashbourne Mayfair House",
    propertyType: "hotel",
    reviewCount: 414,
    roomTemplates: [
      {
        amenities: ["wifi", "concierge"],
        bedsSummary: "1 queen bed",
        breakfastIncluded: false,
        cancellationSummary: "Cancel free until 48 hours before arrival.",
        description: "Tailored room with marble bath and work table.",
        guestCapacity: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 28900,
        rateType: "room_only",
        refundable: true,
        roomCode: "MAYFAIR-QUEEN",
        roomName: "Mayfair Queen Room",
        sizeSqm: 27
      },
      {
        amenities: ["wifi", "breakfast", "concierge", "transfer"],
        bedsSummary: "1 king bed and lounge seating",
        breakfastIncluded: true,
        cancellationSummary: "Cancel free until 5 days before arrival.",
        description: "Grand suite with separate sitting room and chauffeured arrival credit.",
        guestCapacity: 3,
        imageUrl:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 46800,
        rateType: "bed_and_breakfast",
        refundable: true,
        roomCode: "GRAND-MAYFAIR-SUITE",
        roomName: "Grand Mayfair Suite",
        sizeSqm: 61
      }
    ],
    starRating: 5
  },
  {
    addressLine: "Upper Ground, South Bank, London",
    amenities: ["wifi", "gym", "breakfast", "parking"],
    cityId: "33333333-3333-3333-3333-333333333333",
    cityName: "London",
    countryCode: "GB",
    countryName: "United Kingdom",
    description:
      "Modern riverside rooms and family-friendly layouts positioned for cultural stays, theatre evenings, and business access.",
    featuredTags: ["Riverside", "Family-friendly", "Walkable culture"],
    guestRating: 8.7,
    images: [
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80"
    ],
    latitude: 51.5063,
    longitude: -0.1106,
    neighborhood: "South Bank",
    policies: {
      cancellation: "Mixed flexible and advance purchase rates.",
      checkIn: "Check-in from 15:00",
      checkOut: "Check-out until 12:00",
      children: "Children welcome. Baby cots available.",
      pets: "Pets not allowed."
    },
    propertyCode: "LON-SOUTHBANK-ATELIER",
    propertyName: "South Bank Atelier Hotel",
    propertyType: "boutique",
    reviewCount: 276,
    roomTemplates: [
      {
        amenities: ["wifi", "gym"],
        bedsSummary: "1 king bed",
        breakfastIncluded: false,
        cancellationSummary: "Non-refundable launch rate.",
        description: "Contemporary room with river-facing picture window.",
        guestCapacity: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 21400,
        rateType: "room_only",
        refundable: false,
        roomCode: "RIVER-KING",
        roomName: "River King Room",
        sizeSqm: 26
      },
      {
        amenities: ["wifi", "breakfast", "parking"],
        bedsSummary: "1 king bed and sofa bed",
        breakfastIncluded: true,
        cancellationSummary: "Cancel free until 72 hours before arrival.",
        description: "Large studio with sofa bed for premium city family stays.",
        guestCapacity: 4,
        imageUrl:
          "https://images.unsplash.com/photo-1505692952047-1a78307da8f2?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 27800,
        rateType: "bed_and_breakfast",
        refundable: true,
        roomCode: "FAMILY-STUDIO",
        roomName: "Family River Studio",
        sizeSqm: 37
      }
    ],
    starRating: 4
  },
  {
    addressLine: "Glover Road, Ikoyi, Lagos",
    amenities: ["wifi", "pool", "gym", "breakfast", "concierge", "transfer"],
    cityId: "44444444-4444-4444-4444-444444444444",
    cityName: "Lagos",
    countryCode: "NG",
    countryName: "Nigeria",
    description:
      "A premium Ikoyi base with calm interiors, strong business convenience, and reliable transfer support across the city.",
    featuredTags: ["Ikoyi", "Corporate ready", "Airport support"],
    guestRating: 8.8,
    images: [
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1400&q=80"
    ],
    latitude: 6.4541,
    longitude: 3.4317,
    neighborhood: "Ikoyi",
    policies: {
      cancellation: "Flexible business and weekend rates available.",
      checkIn: "Check-in from 14:00",
      checkOut: "Check-out until 12:00",
      children: "Children stay free up to age 6 in existing bedding.",
      pets: "Pets not allowed."
    },
    propertyCode: "LOS-ATLANTIC-CREST",
    propertyName: "Atlantic Crest Ikoyi",
    propertyType: "hotel",
    reviewCount: 189,
    roomTemplates: [
      {
        amenities: ["wifi", "gym"],
        bedsSummary: "1 queen bed",
        breakfastIncluded: false,
        cancellationSummary: "Cancel free until 48 hours before arrival.",
        description: "Quiet business room with work area and city views.",
        guestCapacity: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 17200,
        rateType: "room_only",
        refundable: true,
        roomCode: "IKOYI-BUSINESS",
        roomName: "Business City Room",
        sizeSqm: 24
      },
      {
        amenities: ["wifi", "pool", "breakfast", "transfer"],
        bedsSummary: "1 king bed and lounge area",
        breakfastIncluded: true,
        cancellationSummary: "Cancel free until 72 hours before arrival.",
        description: "Executive suite with lounge area and airport transfer support.",
        guestCapacity: 3,
        imageUrl:
          "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 24900,
        rateType: "bed_and_breakfast",
        refundable: true,
        roomCode: "IKOYI-EXEC-SUITE",
        roomName: "Executive Ikoyi Suite",
        sizeSqm: 43
      }
    ],
    starRating: 4
  },
  {
    addressLine: "Broadway and 38th Street, New York",
    amenities: ["wifi", "gym", "breakfast", "concierge"],
    cityId: "55555555-5555-5555-5555-555555555555",
    cityName: "New York",
    countryCode: "US",
    countryName: "United States",
    description:
      "Midtown hospitality with confident service, strong transport access, and room layouts suited to high-value city itineraries.",
    featuredTags: ["Midtown", "Fast arrival", "Concierge service"],
    guestRating: 9.0,
    images: [
      "https://images.unsplash.com/photo-1519055548599-6d4d129508c4?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80"
    ],
    latitude: 40.7528,
    longitude: -73.9852,
    neighborhood: "Midtown",
    policies: {
      cancellation: "Flexible and non-refundable options available.",
      checkIn: "Check-in from 16:00",
      checkOut: "Check-out until 11:00",
      children: "Children welcome in premium room categories.",
      pets: "Small pets accepted on request."
    },
    propertyCode: "NYC-HUDSON-ATELIER",
    propertyName: "Hudson Atelier Midtown",
    propertyType: "boutique",
    reviewCount: 332,
    roomTemplates: [
      {
        amenities: ["wifi", "concierge"],
        bedsSummary: "1 queen bed",
        breakfastIncluded: false,
        cancellationSummary: "Cancel free until 72 hours before arrival.",
        description: "Well-planned room with skyline accents and tailored lighting.",
        guestCapacity: 2,
        imageUrl:
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 30100,
        rateType: "room_only",
        refundable: true,
        roomCode: "MIDTOWN-QUEEN",
        roomName: "Midtown Queen Room",
        sizeSqm: 25
      },
      {
        amenities: ["wifi", "breakfast", "gym"],
        bedsSummary: "1 king bed and sofa seating",
        breakfastIncluded: true,
        cancellationSummary: "Cancel free until 5 days before arrival.",
        description: "Junior suite with separate seating area and breakfast service.",
        guestCapacity: 3,
        imageUrl:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
        nightlyRateEurMinor: 38900,
        rateType: "bed_and_breakfast",
        refundable: true,
        roomCode: "HUDSON-JUNIOR-SUITE",
        roomName: "Hudson Junior Suite",
        sizeSqm: 40
      }
    ],
    starRating: 4
  }
];

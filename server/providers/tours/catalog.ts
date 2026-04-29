import {type TourCategory, type TourDurationOption} from "@/features/tours/types";

export const MOCK_TOURS_SUPPLIER = {
  code: "mock-tours-curated",
  id: "45454545-4545-4545-4545-454545454545"
} as const;

export type TourDestinationCatalogEntry = {
  aliases: string[];
  cityId: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  destinationId: string;
  slug: string;
};

export type MockTourAddOnTemplate = {
  code: string;
  description: string;
  eurPriceMinor: number;
  title: string;
};

export type MockTourCatalogItem = {
  activityCode: string;
  addOnTemplates: MockTourAddOnTemplate[];
  baseAdultRateEurMinor: number;
  baseChildRateEurMinor: number;
  cancellationPolicy: string;
  category: TourCategory;
  cityId: string;
  cityName: string;
  countryCode: string;
  countryName: string;
  description: string;
  destinationId: string;
  durationBucket: TourDurationOption;
  durationMinutes: number;
  exclusions: string[];
  familyFriendly: boolean;
  faqs: Array<{
    answer: string;
    question: string;
  }>;
  groupFriendly: boolean;
  highlights: string[];
  images: string[];
  inclusions: string[];
  meetingInstructions: string;
  meetingPoint: string;
  overview: string;
  privateAvailable: boolean;
  reviewCount: number;
  reviewRating: number;
  scheduleTemplate: Array<{
    label: string;
    remainingCapacity: number;
    startHour: number;
    startMinute: number;
  }>;
  ticketDeliveryMethod: string;
  title: string;
};

export const tourDestinationsCatalog: TourDestinationCatalogEntry[] = [
  {
    aliases: ["vienna", "wien", "austria", "at"],
    cityId: "11111111-1111-1111-1111-111111111111",
    cityName: "Vienna",
    countryCode: "AT",
    countryName: "Austria",
    destinationId: "cccc1111-1111-1111-1111-111111111111",
    slug: "vienna"
  },
  {
    aliases: ["dubai", "uae", "united arab emirates", "ae"],
    cityId: "22222222-2222-2222-2222-222222222222",
    cityName: "Dubai",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    destinationId: "cccc2222-2222-2222-2222-222222222222",
    slug: "dubai"
  },
  {
    aliases: ["london", "uk", "united kingdom", "gb"],
    cityId: "33333333-3333-3333-3333-333333333333",
    cityName: "London",
    countryCode: "GB",
    countryName: "United Kingdom",
    destinationId: "cccc3333-3333-3333-3333-333333333333",
    slug: "london"
  }
];

export function findTourDestinationByQuery(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return tourDestinationsCatalog.find((destination) =>
    destination.aliases.some((alias) => normalizedQuery.includes(alias))
  );
}

export const mockTourCatalog: MockTourCatalogItem[] = [
  {
    activityCode: "VIE-PRIVATE-PALACES",
    addOnTemplates: [
      {
        code: "hotel-pickup",
        description: "Private car collection from selected central Vienna hotels.",
        eurPriceMinor: 3800,
        title: "Hotel pickup"
      },
      {
        code: "skip-the-line",
        description: "Fast-track museum entrance coordination where available.",
        eurPriceMinor: 2400,
        title: "Fast-track entry"
      }
    ],
    baseAdultRateEurMinor: 9400,
    baseChildRateEurMinor: 5200,
    cancellationPolicy: "Cancel free until 24 hours before the experience start time.",
    category: "culture",
    cityId: "11111111-1111-1111-1111-111111111111",
    cityName: "Vienna",
    countryCode: "AT",
    countryName: "Austria",
    description:
      "A polished private introduction to Vienna's imperial heart with a guide who adapts the pace to your interests.",
    destinationId: "cccc1111-1111-1111-1111-111111111111",
    durationBucket: "half_day",
    durationMinutes: 210,
    exclusions: ["Personal purchases", "Food beyond the scheduled tasting stop"],
    familyFriendly: true,
    faqs: [
      {
        answer: "The route is relaxed with short walking segments and regular pause opportunities.",
        question: "Is this suitable for first-time visitors?"
      },
      {
        answer: "Yes. We can note a private vehicle support request during booking review.",
        question: "Can pickup be arranged?"
      }
    ],
    groupFriendly: false,
    highlights: ["Private guide", "Palace district route", "Curated coffee stop"],
    images: [
      "https://images.unsplash.com/photo-1516557070061-c3d1653fa646?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1400&q=80"
    ],
    inclusions: ["Licensed local guide", "Coffeehouse tasting", "Museum coordination support"],
    meetingInstructions: "Meet beside the central fountain at Michaelerplatz 10 minutes before start.",
    meetingPoint: "Michaelerplatz, 1010 Vienna",
    overview:
      "Designed for travelers who want Vienna's cultural weight without a rushed group pace, this experience pairs a private guide with a graceful route through the old city and imperial landmarks.",
    privateAvailable: true,
    reviewCount: 148,
    reviewRating: 4.9,
    scheduleTemplate: [
      {label: "Morning departure", remainingCapacity: 8, startHour: 9, startMinute: 30},
      {label: "Late morning departure", remainingCapacity: 6, startHour: 11, startMinute: 0},
      {label: "Afternoon departure", remainingCapacity: 2, startHour: 14, startMinute: 30}
    ],
    ticketDeliveryMethod: "Mobile voucher",
    title: "Private Vienna Palaces and Coffeehouses"
  },
  {
    activityCode: "VIE-DANUBE-EVENING",
    addOnTemplates: [
      {
        code: "window-seating",
        description: "Priority seating request closer to the panoramic windows.",
        eurPriceMinor: 1800,
        title: "Window seating preference"
      }
    ],
    baseAdultRateEurMinor: 6800,
    baseChildRateEurMinor: 3400,
    cancellationPolicy: "Cancel free until 12 hours before the cruise departs.",
    category: "sightseeing",
    cityId: "11111111-1111-1111-1111-111111111111",
    cityName: "Vienna",
    countryCode: "AT",
    countryName: "Austria",
    description:
      "An easy evening cruise with city lights, soft dining service, and a relaxed Danube perspective.",
    destinationId: "cccc1111-1111-1111-1111-111111111111",
    durationBucket: "evening",
    durationMinutes: 120,
    exclusions: ["Hotel transfers", "Premium drinks package"],
    familyFriendly: true,
    faqs: [
      {
        answer: "Smart casual works well for this evening sailing.",
        question: "Is there a dress code?"
      }
    ],
    groupFriendly: true,
    highlights: ["Evening sailing", "City lights", "Relaxed dining"],
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&w=1400&q=80"
    ],
    inclusions: ["Cruise ticket", "Light dinner service", "Welcome drink"],
    meetingInstructions: "Boarding starts 20 minutes before departure at Schwedenplatz pier.",
    meetingPoint: "Schwedenplatz Pier, Vienna",
    overview:
      "This evening option is ideal for travelers who want low-effort sightseeing with a calm rhythm after a full day in the city.",
    privateAvailable: false,
    reviewCount: 89,
    reviewRating: 4.6,
    scheduleTemplate: [
      {label: "Sunset sailing", remainingCapacity: 18, startHour: 18, startMinute: 30},
      {label: "Late evening sailing", remainingCapacity: 12, startHour: 20, startMinute: 15}
    ],
    ticketDeliveryMethod: "Mobile voucher",
    title: "Danube Evening Cruise with Light Dinner"
  },
  {
    activityCode: "DXB-MARINA-YACHT",
    addOnTemplates: [
      {
        code: "hotel-transfer",
        description: "Round-trip private transfer from Dubai Marina and Downtown hotels.",
        eurPriceMinor: 4600,
        title: "Private hotel transfer"
      },
      {
        code: "premium-platter",
        description: "Upgraded sharing platter and chilled soft drinks for the group.",
        eurPriceMinor: 3200,
        title: "Premium refreshment platter"
      }
    ],
    baseAdultRateEurMinor: 11200,
    baseChildRateEurMinor: 5900,
    cancellationPolicy: "Cancel free until 24 hours before the sailing time.",
    category: "water",
    cityId: "22222222-2222-2222-2222-222222222222",
    cityName: "Dubai",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    description:
      "A polished marina yacht circuit balancing skyline views, attentive hosting, and premium stopover energy.",
    destinationId: "cccc2222-2222-2222-2222-222222222222",
    durationBucket: "evening",
    durationMinutes: 150,
    exclusions: ["Alcoholic beverages", "Professional photo package"],
    familyFriendly: true,
    faqs: [
      {
        answer: "Yes, the sailing is family-friendly and children are welcome with adult supervision.",
        question: "Can families join this yacht experience?"
      }
    ],
    groupFriendly: true,
    highlights: ["Skyline sailing", "Hosted service", "Premium marina departure"],
    images: [
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=80"
    ],
    inclusions: ["Yacht boarding pass", "Onboard host", "Soft drinks and light bites"],
    meetingInstructions: "Meet the marina host 15 minutes before departure beside Pier 7.",
    meetingPoint: "Dubai Marina, Pier 7 departure lounge",
    overview:
      "This experience works especially well for premium stopovers and celebratory evenings where the setting matters as much as the route.",
    privateAvailable: true,
    reviewCount: 211,
    reviewRating: 4.8,
    scheduleTemplate: [
      {label: "Golden hour sailing", remainingCapacity: 14, startHour: 17, startMinute: 15},
      {label: "Night skyline sailing", remainingCapacity: 10, startHour: 20, startMinute: 0}
    ],
    ticketDeliveryMethod: "Mobile voucher",
    title: "Dubai Marina Premium Yacht Experience"
  },
  {
    activityCode: "DXB-DESERT-PRIVATE",
    addOnTemplates: [
      {
        code: "falcon-photos",
        description: "Short falcon photo stop with a dedicated host.",
        eurPriceMinor: 2200,
        title: "Falcon photo stop"
      },
      {
        code: "sunset-bubbles",
        description: "Premium non-alcoholic sunset refreshments in the private camp lounge.",
        eurPriceMinor: 2700,
        title: "Sunset lounge refreshments"
      }
    ],
    baseAdultRateEurMinor: 13400,
    baseChildRateEurMinor: 7800,
    cancellationPolicy: "Cancel free until 24 hours before departure from the city.",
    category: "adventure",
    cityId: "22222222-2222-2222-2222-222222222222",
    cityName: "Dubai",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    description:
      "A more private desert format with premium camp styling, soft adventure pacing, and strong family comfort.",
    destinationId: "cccc2222-2222-2222-2222-222222222222",
    durationBucket: "full_day",
    durationMinutes: 360,
    exclusions: ["ATV upgrade", "Personal souvenir purchases"],
    familyFriendly: true,
    faqs: [
      {
        answer: "Yes. The experience is designed for comfort-first pacing rather than high-intensity dune driving.",
        question: "Is this suitable for younger travelers?"
      }
    ],
    groupFriendly: true,
    highlights: ["Private vehicle support", "Premium desert camp", "Family-comfort pacing"],
    images: [
      "https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80"
    ],
    inclusions: ["Driver-guide", "Camp dinner", "Soft desert activities"],
    meetingInstructions: "Pickup details are reconfirmed after booking from central Dubai hotels.",
    meetingPoint: "Hotel pickup coordinated after booking",
    overview:
      "This itinerary balances exclusivity and comfort for travelers who want a refined desert experience without sacrificing ease or service continuity.",
    privateAvailable: true,
    reviewCount: 164,
    reviewRating: 4.9,
    scheduleTemplate: [
      {label: "Midday desert departure", remainingCapacity: 8, startHour: 13, startMinute: 0}
    ],
    ticketDeliveryMethod: "Mobile voucher",
    title: "Private Desert Escape with Premium Camp Dinner"
  },
  {
    activityCode: "LON-ROYAL-CULINARY",
    addOnTemplates: [
      {
        code: "afternoon-tea-upgrade",
        description: "Upgraded tea service in a premium historic drawing room.",
        eurPriceMinor: 2600,
        title: "Afternoon tea upgrade"
      }
    ],
    baseAdultRateEurMinor: 8800,
    baseChildRateEurMinor: 4700,
    cancellationPolicy: "Cancel free until 24 hours before the walking experience starts.",
    category: "culinary",
    cityId: "33333333-3333-3333-3333-333333333333",
    cityName: "London",
    countryCode: "GB",
    countryName: "United Kingdom",
    description:
      "A premium small-group route through royal London with curated tastings and a guide who can tune the narrative to culture or food interests.",
    destinationId: "cccc3333-3333-3333-3333-333333333333",
    durationBucket: "half_day",
    durationMinutes: 240,
    exclusions: ["Additional drinks", "Personal shopping"],
    familyFriendly: true,
    faqs: [
      {
        answer: "Yes, but the route is best suited to travelers comfortable with several short walking stages.",
        question: "Is this a walking-heavy experience?"
      }
    ],
    groupFriendly: true,
    highlights: ["Curated tastings", "Royal London route", "Small-group pacing"],
    images: [
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1469796466635-455ede028aca?auto=format&fit=crop&w=1400&q=80"
    ],
    inclusions: ["Local host", "Three tasting stops", "Priority venue coordination"],
    meetingInstructions: "Meet outside Green Park station exit on Piccadilly side 10 minutes before departure.",
    meetingPoint: "Green Park Station, Piccadilly exit",
    overview:
      "This is a strong match for travelers who want London to feel polished and personal rather than generic or overly scripted.",
    privateAvailable: true,
    reviewCount: 132,
    reviewRating: 4.7,
    scheduleTemplate: [
      {label: "Late morning departure", remainingCapacity: 12, startHour: 10, startMinute: 45},
      {label: "Afternoon departure", remainingCapacity: 7, startHour: 14, startMinute: 0}
    ],
    ticketDeliveryMethod: "Mobile voucher",
    title: "Royal London Tasting Walk"
  },
  {
    activityCode: "LON-WESTEND-PRIVATE",
    addOnTemplates: [
      {
        code: "chauffeur-return",
        description: "Private evening return transfer after the experience.",
        eurPriceMinor: 4200,
        title: "Evening chauffeur return"
      }
    ],
    baseAdultRateEurMinor: 12600,
    baseChildRateEurMinor: 0,
    cancellationPolicy: "Cancel free until 48 hours before the experience start time.",
    category: "culture",
    cityId: "33333333-3333-3333-3333-333333333333",
    cityName: "London",
    countryCode: "GB",
    countryName: "United Kingdom",
    description:
      "An evening-led cultural circuit built around theatre district atmosphere, hosted commentary, and premium pacing.",
    destinationId: "cccc3333-3333-3333-3333-333333333333",
    durationBucket: "evening",
    durationMinutes: 180,
    exclusions: ["Theatre tickets", "Dinner service beyond the welcome tasting"],
    familyFriendly: false,
    faqs: [
      {
        answer: "It is best suited to adult travelers or older teenagers with a cultural interest.",
        question: "Is this family-focused?"
      }
    ],
    groupFriendly: false,
    highlights: ["Evening atmosphere", "Hosted cultural route", "Premium pacing"],
    images: [
      "https://images.unsplash.com/photo-1486299267070-83823f5448dd?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1505765050516-f72dcac9c60c?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1468476775582-6bede20f356f?auto=format&fit=crop&w=1400&q=80"
    ],
    inclusions: ["Hosted route", "Welcome tasting", "Priority venue coordination"],
    meetingInstructions: "Meet outside the Duke of York column 10 minutes before the walk begins.",
    meetingPoint: "Waterloo Place, Duke of York Column",
    overview:
      "This format is especially useful for premium city stays where travelers want an evening plan that feels elevated without becoming logistically heavy.",
    privateAvailable: true,
    reviewCount: 74,
    reviewRating: 4.8,
    scheduleTemplate: [
      {label: "Evening departure", remainingCapacity: 6, startHour: 18, startMinute: 45}
    ],
    ticketDeliveryMethod: "Mobile voucher",
    title: "Private West End Evenings Walk"
  }
];

import {type TransferVehicleClass} from "@/features/transfers/types";

export const MOCK_TRANSFERS_SUPPLIER = {
  code: "mock-mobility-hub",
  id: "34343434-3434-3434-3434-343434343434"
} as const;

export type MockTransferInventoryItem = {
  basePriceEurMinor: number;
  highlights: string[];
  imageUrl: string;
  luggageCapacity: number;
  meetAndGreetIncluded: boolean;
  passengerCapacity: number;
  serviceSummary: string;
  vehicleClass: TransferVehicleClass;
  vehicleName: string;
  vendorName: string;
};

export const mockTransferInventory: MockTransferInventoryItem[] = [
  {
    basePriceEurMinor: 5900,
    highlights: ["Private direct service", "Professional driver", "Clean city arrival"],
    imageUrl:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
    luggageCapacity: 3,
    meetAndGreetIncluded: false,
    passengerCapacity: 3,
    serviceSummary: "Private sedan transfer suited to premium solo or couple arrivals.",
    vehicleClass: "private",
    vehicleName: "Executive Sedan",
    vendorName: "Mobility Select"
  },
  {
    basePriceEurMinor: 7200,
    highlights: ["Driver arrival signage", "Flexible wait window", "Premium luggage support"],
    imageUrl:
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=80",
    luggageCapacity: 4,
    meetAndGreetIncluded: true,
    passengerCapacity: 4,
    serviceSummary: "Luxury SUV transfer with additional luggage capacity and meet-and-greet polish.",
    vehicleClass: "luxury",
    vehicleName: "Luxury SUV",
    vendorName: "Mobility Select"
  },
  {
    basePriceEurMinor: 8800,
    highlights: ["Chauffeur-grade service", "Premium arrival protocol", "Extended waiting window"],
    imageUrl:
      "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1400&q=80",
    luggageCapacity: 5,
    meetAndGreetIncluded: true,
    passengerCapacity: 5,
    serviceSummary: "Chauffeur-led premium transfer for higher-touch airport or city movements.",
    vehicleClass: "chauffeur",
    vehicleName: "Mercedes-Benz V-Class",
    vendorName: "LuxDrive Reserve"
  },
  {
    basePriceEurMinor: 4100,
    highlights: ["Shared route efficiency", "Best-value pricing", "Urban service coverage"],
    imageUrl:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1400&q=80",
    luggageCapacity: 2,
    meetAndGreetIncluded: false,
    passengerCapacity: 2,
    serviceSummary: "Shared premium shuttle option for lighter itineraries and value-focused transfers.",
    vehicleClass: "shared",
    vehicleName: "Shared Premium Shuttle",
    vendorName: "Euromotion Premium"
  },
  {
    basePriceEurMinor: 6900,
    highlights: ["Larger family capacity", "Flexible luggage space", "Airport-ready service"],
    imageUrl:
      "https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&w=1400&q=80",
    luggageCapacity: 7,
    meetAndGreetIncluded: true,
    passengerCapacity: 7,
    serviceSummary: "Shuttle van option for families or small groups needing extra luggage room.",
    vehicleClass: "shuttle",
    vehicleName: "Premium Family Van",
    vendorName: "Euromotion Premium"
  }
];

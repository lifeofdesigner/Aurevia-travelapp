import {type CarCategory, type CarFuelType, type CarTransmission} from "@/features/cars/types";

export const MOCK_CARS_SUPPLIER = {
  code: "mock-mobility-hub",
  id: "34343434-3434-3434-3434-343434343434"
} as const;

export type MockCarInventoryItem = {
  baseDailyRateEurMinor: number;
  bagCount: number;
  doorCount: number;
  driverAgeMin: number;
  fuelPolicy: string;
  fuelType: CarFuelType;
  highlights: string[];
  imageUrl: string;
  insuranceSummary: string;
  mileagePolicy: string;
  rentalTermsSummary: string;
  seatCount: number;
  transmissionType: CarTransmission;
  vehicleCategory: CarCategory;
  vehicleName: string;
  vendorCode: string;
  vendorName: string;
};

export const mockCarInventory: MockCarInventoryItem[] = [
  {
    baseDailyRateEurMinor: 4800,
    bagCount: 2,
    doorCount: 4,
    driverAgeMin: 21,
    fuelPolicy: "Full to full",
    fuelType: "petrol",
    highlights: ["Unlimited mileage", "City-friendly footprint", "Flexible cancellation"],
    imageUrl:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1400&q=80",
    insuranceSummary: "Collision damage waiver with EUR 850 excess.",
    mileagePolicy: "Unlimited mileage within the rental country.",
    rentalTermsSummary: "Ideal for city arrivals, compact parking, and shorter premium itineraries.",
    seatCount: 4,
    transmissionType: "automatic",
    vehicleCategory: "compact",
    vehicleName: "Mini Cooper Hatch Auto",
    vendorCode: "EMP",
    vendorName: "Euromotion Premium"
  },
  {
    baseDailyRateEurMinor: 6200,
    bagCount: 3,
    doorCount: 4,
    driverAgeMin: 23,
    fuelPolicy: "Full to full",
    fuelType: "hybrid",
    highlights: ["Hybrid efficiency", "Airport pickup available", "Business-ready comfort"],
    imageUrl:
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=80",
    insuranceSummary: "Collision damage waiver with EUR 900 excess.",
    mileagePolicy: "Unlimited mileage within Austria, UAE, UK, Nigeria, or USA domestic use.",
    rentalTermsSummary: "Comfortable sedan format with strong luggage balance for business or leisure travel.",
    seatCount: 5,
    transmissionType: "automatic",
    vehicleCategory: "sedan",
    vehicleName: "Mercedes-Benz C-Class",
    vendorCode: "AUR",
    vendorName: "Mobility Select"
  },
  {
    baseDailyRateEurMinor: 7100,
    bagCount: 4,
    doorCount: 5,
    driverAgeMin: 25,
    fuelPolicy: "Full to full",
    fuelType: "diesel",
    highlights: ["Higher driving position", "Family-friendly luggage space", "Intercity ready"],
    imageUrl:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1400&q=80",
    insuranceSummary: "Collision damage waiver with EUR 1050 excess.",
    mileagePolicy: "Unlimited mileage with cross-city usage supported.",
    rentalTermsSummary: "Versatile SUV profile with premium comfort for family or longer-drive itineraries.",
    seatCount: 5,
    transmissionType: "automatic",
    vehicleCategory: "suv",
    vehicleName: "Audi Q5 TDI Quattro",
    vendorCode: "AUR",
    vendorName: "Mobility Select"
  },
  {
    baseDailyRateEurMinor: 9800,
    bagCount: 3,
    doorCount: 4,
    driverAgeMin: 27,
    fuelPolicy: "Full to full",
    fuelType: "electric",
    highlights: ["Premium executive class", "Zero tailpipe emissions", "Priority counter collection"],
    imageUrl:
      "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1400&q=80",
    insuranceSummary: "Premium cover with EUR 1200 excess.",
    mileagePolicy: "400 km per day included, then supplementary per-km charge.",
    rentalTermsSummary: "Executive-grade electric luxury with quiet ride quality and polished presentation.",
    seatCount: 5,
    transmissionType: "automatic",
    vehicleCategory: "luxury",
    vehicleName: "BMW i5 Executive",
    vendorCode: "LUX",
    vendorName: "LuxDrive Reserve"
  },
  {
    baseDailyRateEurMinor: 8200,
    bagCount: 5,
    doorCount: 5,
    driverAgeMin: 25,
    fuelPolicy: "Full to full",
    fuelType: "diesel",
    highlights: ["Group capacity", "Large luggage hold", "Road-trip friendly"],
    imageUrl:
      "https://images.unsplash.com/photo-1610647752706-3bb12232b3ab?auto=format&fit=crop&w=1400&q=80",
    insuranceSummary: "Collision damage waiver with EUR 1150 excess.",
    mileagePolicy: "Unlimited mileage with multi-city returns available.",
    rentalTermsSummary: "Strong option for larger families or small teams needing luggage flexibility.",
    seatCount: 7,
    transmissionType: "automatic",
    vehicleCategory: "van",
    vehicleName: "Volkswagen Multivan",
    vendorCode: "EMP",
    vendorName: "Euromotion Premium"
  }
];

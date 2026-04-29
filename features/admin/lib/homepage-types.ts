import {type SupportedCurrency} from "@/lib/money";

export type AdminHomepageHeroRecord = {
  bgImageUrl: string | null;
  ctaLink: string;
  ctaText: string;
  headline: string;
  id: string | null;
  subheadline: string;
};

export type AdminHomepageBannerRecord = {
  ctaLink: string | null;
  ctaText: string | null;
  endsAt: string | null;
  id: string;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  subtitle: string | null;
  title: string;
};

export type AdminHomepageDestinationRecord = {
  city: string;
  country: string;
  hotelsCount: number | null;
  id: string;
  imageUrl: string | null;
  isActive: boolean;
  link: string | null;
  priceLabel: string | null;
  sortOrder: number;
};

export type AdminHomepageDealRecord = {
  airlineName: string;
  currency: SupportedCurrency;
  destinationCity: string;
  destinationCode: string;
  expiresAt: string | null;
  fareType: string | null;
  id: string;
  imageUrl: string | null;
  isActive: boolean;
  originCity: string;
  originCode: string;
  price: number;
  sortOrder: number;
};

export type AdminHomepageStatRecord = {
  label: string;
  value: string;
};

export type AdminHomepageSettingsRecord = {
  ctaDescription: string;
  ctaHeadline: string;
  footerTagline: string;
  stats: AdminHomepageStatRecord[];
  trustItems: string[];
  whyDescription: string;
  whyHeadline: string;
};

export type AdminHomepageData = {
  banners: AdminHomepageBannerRecord[];
  deals: AdminHomepageDealRecord[];
  destinations: AdminHomepageDestinationRecord[];
  hero: AdminHomepageHeroRecord;
  settings: AdminHomepageSettingsRecord;
};

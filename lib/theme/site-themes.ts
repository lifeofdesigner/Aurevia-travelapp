export const SITE_THEME_KEYS = [
  "executive_emerald",
  "atlantic_blue",
  "graphite_sky"
] as const;

export type SiteThemeKey = (typeof SITE_THEME_KEYS)[number];

export const DEFAULT_SITE_THEME: SiteThemeKey = "executive_emerald";

export const SITE_THEME_OPTIONS: Array<{
  accentHex: string;
  description: string;
  key: SiteThemeKey;
  label: string;
  primaryHex: string;
  surfaceHex: string;
}> = [
  {
    accentHex: "#c9a84c",
    description: "Deep green, warm ivory, and restrained gold for executive travel brands.",
    key: "executive_emerald",
    label: "Executive Emerald",
    primaryHex: "#1c3d2e",
    surfaceHex: "#f7f3ec"
  },
  {
    accentHex: "#d7b04f",
    description: "Corporate navy with sky-blue lift and gold action states for airline commerce.",
    key: "atlantic_blue",
    label: "Atlantic Blue",
    primaryHex: "#173a5e",
    surfaceHex: "#f5f8fb"
  },
  {
    accentHex: "#65bdc8",
    description: "Graphite, platinum, and teal for a quieter premium operations feel.",
    key: "graphite_sky",
    label: "Graphite Sky",
    primaryHex: "#262d35",
    surfaceHex: "#f7f6f2"
  }
];

export function isSiteThemeKey(value: unknown): value is SiteThemeKey {
  return typeof value === "string" && SITE_THEME_KEYS.includes(value as SiteThemeKey);
}

export function normalizeSiteTheme(value: unknown): SiteThemeKey {
  return isSiteThemeKey(value) ? value : DEFAULT_SITE_THEME;
}

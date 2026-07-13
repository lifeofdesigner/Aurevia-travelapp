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
    accentHex: "#2563eb",
    description: "Clean white surfaces with confident blue accents for corporate travel brands.",
    key: "executive_emerald",
    label: "Corporate Blue",
    primaryHex: "#2563eb",
    surfaceHex: "#f8fafc"
  },
  {
    accentHex: "#1e4da1",
    description: "Deeper navy blue with crisp white surfaces for airline commerce.",
    key: "atlantic_blue",
    label: "Atlantic Navy",
    primaryHex: "#1e4da1",
    surfaceHex: "#f8fafc"
  },
  {
    accentHex: "#3b9ed8",
    description: "Charcoal and slate with teal highlights for a quieter premium feel.",
    key: "graphite_sky",
    label: "Graphite Sky",
    primaryHex: "#2d3748",
    surfaceHex: "#f9fafb"
  }
];

export function isSiteThemeKey(value: unknown): value is SiteThemeKey {
  return typeof value === "string" && SITE_THEME_KEYS.includes(value as SiteThemeKey);
}

export function normalizeSiteTheme(value: unknown): SiteThemeKey {
  return isSiteThemeKey(value) ? value : DEFAULT_SITE_THEME;
}

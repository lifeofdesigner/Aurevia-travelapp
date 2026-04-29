export type AirlineBrandTheme = {
  accent: string;
  code: string;
  name: string;
  primary: string;
  textOnPrimary: string;
};

const airlineThemes: Record<string, Omit<AirlineBrandTheme, "code" | "name">> = {
  AA: {accent: "#c41230", primary: "#0078d2", textOnPrimary: "#ffffff"},
  AC: {accent: "#d71920", primary: "#111111", textOnPrimary: "#ffffff"},
  AF: {accent: "#e31b23", primary: "#002157", textOnPrimary: "#ffffff"},
  BA: {accent: "#eb2226", primary: "#075aaa", textOnPrimary: "#ffffff"},
  DL: {accent: "#003268", primary: "#c8102e", textOnPrimary: "#ffffff"},
  EK: {accent: "#d6a461", primary: "#d71920", textOnPrimary: "#ffffff"},
  EY: {accent: "#bd8b13", primary: "#2d2926", textOnPrimary: "#ffffff"},
  KL: {accent: "#003f87", primary: "#00a1de", textOnPrimary: "#ffffff"},
  LH: {accent: "#ffcc00", primary: "#05164d", textOnPrimary: "#ffffff"},
  OS: {accent: "#ffffff", primary: "#e30613", textOnPrimary: "#ffffff"},
  QF: {accent: "#ffffff", primary: "#e4002b", textOnPrimary: "#ffffff"},
  QR: {accent: "#c8a2c8", primary: "#5c0b2e", textOnPrimary: "#ffffff"},
  SQ: {accent: "#f5b335", primary: "#00266b", textOnPrimary: "#ffffff"},
  TK: {accent: "#ffffff", primary: "#e81932", textOnPrimary: "#ffffff"},
  UA: {accent: "#00aeef", primary: "#005daa", textOnPrimary: "#ffffff"},
  VS: {accent: "#ffffff", primary: "#da0530", textOnPrimary: "#ffffff"}
};

const fallbackTheme = {
  accent: "#c9a84c",
  primary: "#1c3d2e",
  textOnPrimary: "#ffffff"
};

export function getAirlineBrandTheme({
  code,
  name
}: {
  code: string;
  name: string;
}): AirlineBrandTheme {
  const normalizedCode = code.trim().toUpperCase();
  const theme = airlineThemes[normalizedCode] ?? fallbackTheme;

  return {
    ...theme,
    code: normalizedCode || "AIR",
    name: name.trim() || "Airline"
  };
}

export function isLikelyPdfRasterImageUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    const pathname = url.pathname.toLowerCase();

    return [".jpg", ".jpeg", ".png"].some((extension) => pathname.endsWith(extension));
  } catch {
    return false;
  }
}

export const VIENNA_TIME_ZONE = "Europe/Vienna";

export function formatDate(
  date: Date | string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: VIENNA_TIME_ZONE,
    ...options
  }).format(new Date(date));
}

export function formatDateTime(
  date: Date | string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: VIENNA_TIME_ZONE,
    ...options
  }).format(new Date(date));
}

export function toIsoDate(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

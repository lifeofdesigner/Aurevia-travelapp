export const VIENNA_TIME_ZONE = "Europe/Vienna";

const DATE_TIME_PART_OPTION_KEYS = [
  "weekday",
  "era",
  "year",
  "month",
  "day",
  "dayPeriod",
  "hour",
  "minute",
  "second",
  "fractionalSecondDigits",
  "timeZoneName"
] as const;

function hasDateTimePartOptions(options: Intl.DateTimeFormatOptions) {
  return DATE_TIME_PART_OPTION_KEYS.some((key) => options[key] !== undefined);
}

export function formatDate(
  date: Date | string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {}
) {
  const baseOptions =
    options.dateStyle || options.timeStyle || hasDateTimePartOptions(options)
      ? {timeZone: VIENNA_TIME_ZONE}
      : {
          dateStyle: "medium" as const,
          timeZone: VIENNA_TIME_ZONE
        };

  return new Intl.DateTimeFormat(locale, {
    ...baseOptions,
    ...options
  }).format(new Date(date));
}

export function formatDateTime(
  date: Date | string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {}
) {
  const baseOptions =
    options.dateStyle || options.timeStyle || hasDateTimePartOptions(options)
      ? {timeZone: VIENNA_TIME_ZONE}
      : {
          dateStyle: "medium" as const,
          timeStyle: "short" as const,
          timeZone: VIENNA_TIME_ZONE
        };

  return new Intl.DateTimeFormat(locale, {
    ...baseOptions,
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

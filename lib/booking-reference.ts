const DEFAULT_PREFIX = "AVT";
const RANDOM_LENGTH = 8;

function randomToken(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => (byte % 36).toString(36))
    .join("")
    .toUpperCase();
}

export function generateBookingReference(prefix = DEFAULT_PREFIX) {
  const now = new Date();
  const datePart = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0")
  ].join("");

  return `${prefix}-${datePart}-${randomToken(RANDOM_LENGTH)}`;
}

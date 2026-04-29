const isDevelopment = process.env.NODE_ENV !== "production";

function appendHeaderToken(headers: Headers, key: string, value: string) {
  const existingValue = headers.get(key);

  if (!existingValue) {
    headers.set(key, value);
    return;
  }

  const tokens = new Set(
    existingValue
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean)
  );
  tokens.add(value);
  headers.set(key, Array.from(tokens).join(", "));
}

function buildContentSecurityPolicy() {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    "https://korablobstorage.blob.core.windows.net"
  ];

  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'");
  }

  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "https://*.supabase.in",
    "wss://*.supabase.co",
    "wss://*.supabase.in",
    "https://api.stripe.com",
    "https://api.resend.com"
  ];

  if (isDevelopment) {
    connectSources.push("http://localhost:3000", "ws://localhost:3000");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com https://checkout.flutterwave.com",
    "frame-ancestors 'none'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src 'self' https://checkout.stripe.com https://js.stripe.com https://hooks.stripe.com https://*.korapay.com https://korablobstorage.blob.core.windows.net",
    "object-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:"
  ];

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

export function applyBaseSecurityHeaders(headers: Headers) {
  headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-site");
  headers.set("Origin-Agent-Cluster", "?1");
  headers.set(
    "Permissions-Policy",
    "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(self), usb=()"
  );
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  appendHeaderToken(headers, "Vary", "Accept-Language");
  appendHeaderToken(headers, "Vary", "Cookie");
}

export function applyNoStoreHeaders(headers: Headers) {
  headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Expires", "0");
  headers.set("Pragma", "no-cache");
}

export function applyPrivateRouteHeaders(headers: Headers) {
  applyBaseSecurityHeaders(headers);
  applyNoStoreHeaders(headers);
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
}

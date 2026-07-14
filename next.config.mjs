import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "images.unsplash.com",
        protocol: "https"
      },
      {
        hostname: "images.kiwi.com",
        protocol: "https"
      },
      ...(supabaseHostname
        ? [
            {
              hostname: supabaseHostname,
              protocol: "https"
            }
          ]
        : [])
    ]
  },
  reactStrictMode: true,
  poweredByHeader: false
};

export default withNextIntl(nextConfig);

import {type MetadataRoute} from "next";

import {getMetadataBase} from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const metadataBase = getMetadataBase();

  return {
    host: metadataBase.toString(),
    rules: [
      {
        allow: "/",
        disallow: [
          "/api/",
          "/en/admin",
          "/de/admin",
          "/en/auth",
          "/de/auth",
          "/en/checkout",
          "/de/checkout",
          "/en/dashboard",
          "/de/dashboard",
          "/en/payments",
          "/de/payments"
        ],
        userAgent: "*"
      }
    ],
    sitemap: new URL("/sitemap.xml", metadataBase).toString()
  };
}

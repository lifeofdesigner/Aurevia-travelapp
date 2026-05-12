import {createServerClient} from "@supabase/ssr";
import {type NextRequest, NextResponse} from "next/server";

import {getSupabasePublicConfig} from "@/lib/env/client";

export async function refreshSupabaseSession(
  request: NextRequest,
  response: NextResponse,
  cookieName?: string
) {
  try {
    const {key, url} = getSupabasePublicConfig();
    const supabase = createServerClient(url, key, {
      cookieOptions: cookieName
        ? {
            name: cookieName
          }
        : undefined,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({name, value}) => {
            request.cookies.set(name, value);
          });

          cookiesToSet.forEach(({name, value, options}) => {
            response.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([headerName, headerValue]) => {
            response.headers.set(headerName, headerValue);
          });
        }
      }
    });

    await supabase.auth.getUser();
  } catch (error) {
    console.warn("Supabase session refresh unavailable.", error);
  }
}

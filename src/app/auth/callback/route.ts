import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getTrustedRedirectOrigin } from "@/lib/app-origin";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import { safeInternalPath } from "@/lib/safe-redirect";
import type { Database } from "@/types/database";

function createCallbackClient(request: NextRequest, location: string) {
  const response = NextResponse.redirect(location);

  // Bind session cookies to the redirect response (SSR PKCE exchange).
  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  return { response, supabase };
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = getTrustedRedirectOrigin(requestUrl);
  const next = safeInternalPath(requestUrl.searchParams.get("next"), "/onboarding");
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const authError =
    requestUrl.searchParams.get("error") ??
    requestUrl.searchParams.get("error_description");

  if (authError) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", authError);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const { response, supabase } = createCallbackClient(
      request,
      `${origin}${next}`,
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  // Email templates that link directly with token_hash + type.
  if (tokenHash && type) {
    const { response, supabase } = createCallbackClient(
      request,
      `${origin}${next}`,
    );
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return response;
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(loginUrl);
}

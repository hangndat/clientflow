import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchangeCodeForSession = vi.fn();
const verifyOtp = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession,
      verifyOtp,
    },
  })),
}));

vi.mock("@/lib/env", () => ({
  getSupabaseUrl: () => "https://example.supabase.co",
  getSupabasePublishableKey: () => "public-anon-key",
}));

import { GET } from "@/app/auth/callback/route";

function callbackRequest(pathWithQuery: string, origin = "https://app.example.com") {
  return new NextRequest(new URL(pathWithQuery, origin));
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");
    vi.stubEnv("NODE_ENV", "production");
    exchangeCodeForSession.mockReset();
    verifyOtp.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exchanges a code and redirects to a safe next path on the trusted origin", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      callbackRequest("/auth/callback?code=pkce-code&next=/dashboard"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/dashboard",
    );
  });

  it("rejects open-redirect next values", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      callbackRequest(
        "/auth/callback?code=pkce-code&next=//evil.example",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.example.com/onboarding",
    );
  });

  it("falls back to canonical origin when request host is not allow-listed", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      callbackRequest(
        "/auth/callback?code=pkce-code&next=/clients",
        "https://evil.example",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.example.com/clients",
    );
  });

  it("redirects to login when the code exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: "invalid code" },
    });

    const response = await GET(callbackRequest("/auth/callback?code=bad"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/login?error=auth_callback_failed",
    );
  });

  it("redirects to login when auth provider returns an error", async () => {
    const response = await GET(
      callbackRequest(
        "/auth/callback?error=access_denied&error_description=Nope",
      ),
    );

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/login?error=access_denied",
    );
  });

  it("verifies token_hash OTP flows on success", async () => {
    verifyOtp.mockResolvedValue({ error: null });

    const response = await GET(
      callbackRequest(
        "/auth/callback?token_hash=hash&type=signup&next=/onboarding",
      ),
    );

    expect(verifyOtp).toHaveBeenCalledWith({
      type: "signup",
      token_hash: "hash",
    });
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/onboarding",
    );
  });

  it("redirects to login when code and token are missing", async () => {
    const response = await GET(callbackRequest("/auth/callback"));

    expect(response.headers.get("location")).toBe(
      "https://app.example.com/login?error=auth_callback_failed",
    );
  });
});

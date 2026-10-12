import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAllowedRedirectOrigins,
  getAppOrigin,
  getTrustedRedirectOrigin,
} from "@/lib/app-origin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAppOrigin", () => {
  it("uses NEXT_PUBLIC_SITE_URL when valid", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com/");
    expect(getAppOrigin()).toBe("https://app.example.com");
  });

  it("falls back to localhost outside production", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getAppOrigin()).toBe("http://localhost:3000");
  });

  it("rejects invalid configured origins", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-url");
    vi.stubEnv("NODE_ENV", "development");
    expect(getAppOrigin()).toBe("http://localhost:3000");
  });

  it("throws in production without a valid SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getAppOrigin()).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });
});

describe("getAllowedRedirectOrigins", () => {
  it("includes canonical, AUTH_ALLOWED_ORIGINS, and Vercel preview", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://preview.example.com, http://localhost:3001");
    vi.stubEnv("VERCEL_URL", "clientflow-git-feat.vercel.app");
    vi.stubEnv("NODE_ENV", "production");

    const origins = getAllowedRedirectOrigins();
    expect(origins).toContain("https://app.example.com");
    expect(origins).toContain("https://preview.example.com");
    expect(origins).toContain("http://localhost:3001");
    expect(origins).toContain("https://clientflow-git-feat.vercel.app");
  });

  it("adds localhost helpers outside production", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");
    vi.stubEnv("NODE_ENV", "development");
    const origins = getAllowedRedirectOrigins();
    expect(origins).toContain("http://localhost:3000");
    expect(origins).toContain("http://127.0.0.1:3000");
  });
});

describe("getTrustedRedirectOrigin", () => {
  it("uses the request origin when allow-listed", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://preview.example.com");
    vi.stubEnv("NODE_ENV", "production");

    expect(
      getTrustedRedirectOrigin("https://preview.example.com/auth/callback?code=abc"),
    ).toBe("https://preview.example.com");
  });

  it("falls back to canonical origin for unknown hosts", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");
    vi.stubEnv("NODE_ENV", "production");

    expect(
      getTrustedRedirectOrigin("https://evil.example/auth/callback?code=abc"),
    ).toBe("https://app.example.com");
  });

  it("does not accept protocol-relative or malformed request URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.com");
    vi.stubEnv("NODE_ENV", "production");

    expect(getTrustedRedirectOrigin("not-a-url")).toBe("https://app.example.com");
  });
});

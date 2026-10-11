import { afterEach, describe, expect, it, vi } from "vitest";

import { getAppOrigin } from "@/lib/app-origin";

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

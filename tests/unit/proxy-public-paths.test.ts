import { describe, expect, it } from "vitest";

/**
 * Mirrors the public-path policy in src/lib/supabase/proxy.ts.
 * Keep these expectations aligned when route protection changes.
 */
function isPublicPath(pathname: string): boolean {
  const prefixes = ["/", "/login", "/signup", "/auth", "/portal"] as const;
  if (pathname === "/") return true;
  return prefixes.some(
    (prefix) => prefix !== "/" && pathname.startsWith(prefix),
  );
}

describe("proxy public path policy", () => {
  it("allows unauthenticated marketing and auth routes", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/signup")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/portal/abc")).toBe(true);
  });

  it("protects application routes", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/clients")).toBe(false);
    expect(isPublicPath("/projects")).toBe(false);
    expect(isPublicPath("/documents")).toBe(false);
    expect(isPublicPath("/onboarding")).toBe(false);
  });
});


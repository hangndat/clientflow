import { describe, expect, it } from "vitest";

import { safeInternalPath } from "@/lib/safe-redirect";

describe("safeInternalPath", () => {
  it("allows valid internal routes", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/clients?tab=active")).toBe("/clients?tab=active");
    expect(safeInternalPath("/onboarding#top")).toBe("/onboarding#top");
  });

  it("falls back for empty or non-string values", () => {
    expect(safeInternalPath(null)).toBe("/dashboard");
    expect(safeInternalPath(undefined)).toBe("/dashboard");
    expect(safeInternalPath("")).toBe("/dashboard");
    expect(safeInternalPath("   ")).toBe("/dashboard");
    expect(safeInternalPath(123)).toBe("/dashboard");
  });

  it("rejects protocol-relative and external URLs", () => {
    expect(safeInternalPath("//evil.example")).toBe("/dashboard");
    expect(safeInternalPath("https://evil.example")).toBe("/dashboard");
    expect(safeInternalPath("http://evil.example/path")).toBe("/dashboard");
    expect(safeInternalPath("///evil.example")).toBe("/dashboard");
  });

  it("rejects backslash and encoded bypass variants", () => {
    expect(safeInternalPath("/\\evil.example")).toBe("/dashboard");
    expect(safeInternalPath("/%2f%2fevil.example")).toBe("/dashboard");
    expect(safeInternalPath("/%5cevil.example")).toBe("/dashboard");
    // Encoded dot-segments normalize to an internal path (still same-origin).
    expect(safeInternalPath("/dashboard/%2e%2e")).toBe("/");
  });

  it("rejects malformed and CRLF inputs", () => {
    expect(safeInternalPath("/%")).toBe("/dashboard");
    expect(safeInternalPath("/login\r\nLocation: https://evil.example")).toBe(
      "/dashboard",
    );
  });

  it("supports a custom fallback", () => {
    expect(safeInternalPath("//evil.example", "/onboarding")).toBe("/onboarding");
  });
});

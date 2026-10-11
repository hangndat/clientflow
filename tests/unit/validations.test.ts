import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "@/lib/validations/auth";
import { createClientSchema } from "@/lib/validations/client";
import {
  createOrganizationSchema,
  slugifyOrganizationName,
} from "@/lib/validations/organization";

describe("auth validation", () => {
  it("accepts a valid signup payload", () => {
    const result = signUpSchema.safeParse({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short passwords on signup", () => {
    const result = signUpSchema.safeParse({
      fullName: "Ada",
      email: "ada@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sign-in email", () => {
    const result = signInSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("organization validation", () => {
  it("slugifies organization names", () => {
    expect(slugifyOrganizationName("Acme Studio LLC")).toBe("acme-studio-llc");
  });

  it("rejects invalid slugs", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Acme",
      slug: "Acme Studio",
    });
    expect(result.success).toBe(false);
  });
});

describe("client validation", () => {
  it("requires a UUID organization id and name", () => {
    const invalid = createClientSchema.safeParse({
      organizationId: "not-a-uuid",
      name: "",
    });
    expect(invalid.success).toBe(false);

    const valid = createClientSchema.safeParse({
      organizationId: "11111111-1111-4111-8111-111111111111",
      name: "Northwind",
      email: "",
    });
    expect(valid.success).toBe(true);
  });
});

import { z } from "zod";

export const createPortalTokenSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  clientId: z.string().uuid("Invalid client"),
  label: z.string().trim().max(120).optional().or(z.literal("")),
  expiresInDays: z.coerce.number().int().min(1).max(365),
});

export const revokePortalTokenSchema = z.object({
  tokenId: z.string().uuid("Invalid token"),
  organizationId: z.string().uuid("Invalid organization"),
});

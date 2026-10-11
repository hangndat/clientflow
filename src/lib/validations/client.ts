import { z } from "zod";

export const createClientSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  name: z
    .string()
    .trim()
    .min(1, "Client name is required")
    .max(120, "Client name is too long"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  company: z.string().trim().max(120, "Company name is too long").optional(),
  notes: z.string().trim().max(2000, "Notes are too long").optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

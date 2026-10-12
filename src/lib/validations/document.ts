import { z } from "zod";

export const documentVisibilitySchema = z.enum(["internal", "client"]);

export const createDocumentMetaSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  projectId: z.string().uuid("Invalid project").optional().or(z.literal("")),
  clientId: z.string().uuid("Invalid client").optional().or(z.literal("")),
  title: z.string().trim().min(1, "Title is required").max(200),
  visibility: documentVisibilitySchema,
});

export const deleteDocumentSchema = z.object({
  documentId: z.string().uuid("Invalid document"),
  organizationId: z.string().uuid("Invalid organization"),
});

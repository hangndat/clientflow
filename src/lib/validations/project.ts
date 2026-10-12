import { z } from "zod";

export const projectStatusSchema = z.enum([
  "planned",
  "active",
  "blocked",
  "completed",
  "cancelled",
]);

export const createProjectSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  clientId: z.string().uuid("Invalid client").optional().or(z.literal("")),
  name: z.string().trim().min(1, "Project name is required").max(160),
  status: projectStatusSchema,
  description: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema.extend({
  projectId: z.string().uuid("Invalid project"),
});

export const deleteProjectSchema = z.object({
  projectId: z.string().uuid("Invalid project"),
  organizationId: z.string().uuid("Invalid organization"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

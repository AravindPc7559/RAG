import { z } from "zod";

import { userRoles, userStatuses } from "./user.types.js";

export const userIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const listUsersQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(120).optional(),
    role: z.enum(userRoles).optional(),
    status: z.enum(userStatuses).optional(),
  })
  .strict();

export const createUserBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(128),
    role: z.enum(userRoles).default("member"),
  })
  .strict();

export const updateUserBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.email().trim().toLowerCase().optional(),
    role: z.enum(userRoles).optional(),
    status: z.enum(userStatuses).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required.",
  });

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;

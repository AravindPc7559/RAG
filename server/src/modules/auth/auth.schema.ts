import { z } from "zod";

export const registerBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(128),
  })
  .strict();

export const loginBodySchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1).max(128),
  })
  .strict();

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;

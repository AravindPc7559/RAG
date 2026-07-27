import "dotenv/config";

import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().trim().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().trim().startsWith("/").default("/api/v1"),
  CORS_ORIGINS: z
    .string()
    .default("http://127.0.0.1:5173,http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  TRUST_PROXY: booleanFromString,
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  MONGODB_URI: z
    .string()
    .trim()
    .min(1)
    .default("mongodb://127.0.0.1:27017/rag"),
  JWT_SECRET: z
    .string()
    .min(32)
    .default("development-only-secret-change-this-value"),
  JWT_EXPIRES_IN: z.string().trim().min(1).default("7d"),
  JWT_COOKIE_NAME: z.string().trim().min(1).default("rag_session"),
  JWT_COOKIE_MAX_AGE_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(7 * 24 * 60 * 60 * 1000),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const fields = z.flattenError(result.error).fieldErrors;
  throw new Error(`Invalid environment configuration: ${JSON.stringify(fields)}`);
}

export const env = Object.freeze(result.data);

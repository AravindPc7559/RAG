import "dotenv/config";

import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === ""
      ? undefined
      : value,
  z.string().trim().min(1).optional(),
);

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
  OPENAI_API_KEY: optionalString,
  OPENAI_EMBEDDING_MODEL: z
    .string()
    .trim()
    .min(1)
    .default("text-embedding-3-small"),
  VECTOR_SEARCH_MODE: z.enum(["local", "mongodb"]).default("local"),
  VECTOR_SEARCH_INDEX: z.string().trim().min(1).default("vector_index"),
  VECTOR_SEARCH_LIMIT: z.coerce.number().int().positive().max(100).default(5),
  VECTOR_SEARCH_MIN_SCORE: z.coerce.number().min(-1).max(1).default(0.2),
  DOCUMENT_MAX_FILE_SIZE_MB: z.coerce
    .number()
    .int()
    .positive()
    .max(50)
    .default(10),
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

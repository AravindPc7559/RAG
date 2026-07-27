import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { z } from "zod";

import { AppError } from "../errors/AppError.js";

interface RequestSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export function validateRequest(schemas: RequestSchemas): RequestHandler {
  return (request, _response, next) => {
    const validated: NonNullable<typeof request.validated> = {};

    for (const key of ["body", "params", "query"] as const) {
      const schema = schemas[key];

      if (!schema) {
        continue;
      }

      const result = schema.safeParse(request[key]);

      if (!result.success) {
        return next(
          AppError.badRequest("Request validation failed.", {
            fields: z.flattenError(result.error).fieldErrors,
          }),
        );
      }

      validated[key] = result.data;
    }

    request.validated = validated;
    return next();
  };
}

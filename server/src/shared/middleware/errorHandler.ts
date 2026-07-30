import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import multer from "multer";

import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";
import type { ApiErrorResponse } from "../types/apiResponse.js";

function createResponse(
  code: string,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    code,
    message,
    ...(details !== undefined ? { details } : {}),
  };
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    return response
      .status(error.statusCode)
      .json(createResponse(error.code, error.message, error.details));
  }

  if (error instanceof mongoose.Error.CastError) {
    return response
      .status(400)
      .json(createResponse("INVALID_IDENTIFIER", "The supplied identifier is invalid."));
  }

  if (error instanceof multer.MulterError) {
    return response
      .status(400)
      .json(createResponse("INVALID_UPLOAD", error.message));
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  ) {
    return response
      .status(409)
      .json(createResponse("DUPLICATE_RESOURCE", "The resource already exists."));
  }

  request.log?.error({ error }, "Unhandled request error");

  return response.status(500).json(
    createResponse(
      "INTERNAL_SERVER_ERROR",
      env.NODE_ENV === "production" && error instanceof Error
        ? "An unexpected error occurred."
        : error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    ),
  );
};

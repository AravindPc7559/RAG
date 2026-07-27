import type { RequestHandler } from "express";

import { AppError } from "../errors/AppError.js";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(AppError.notFound(`Route ${request.method} ${request.originalUrl}`));
};

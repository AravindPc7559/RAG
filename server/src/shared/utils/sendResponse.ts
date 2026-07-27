import type { Response } from "express";

import type { ApiSuccessResponse } from "../types/apiResponse.js";

export function sendResponse<T>(
  response: Response<ApiSuccessResponse<T>>,
  statusCode: number,
  data: T,
  message?: string,
) {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
  };

  return response.status(statusCode).json(body);
}

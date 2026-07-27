import axios from "axios";

export interface ApiErrorPayload {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}

interface ErrorResponse {
  message?: string;
  code?: string;
  details?: unknown;
}

export function toApiErrorPayload(error: unknown): ApiErrorPayload {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    return {
      message:
        error.response?.data?.message ||
        error.message ||
        "The request could not be completed.",
      status: error.response?.status,
      code: error.response?.data?.code,
      details: error.response?.data?.details,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "An unexpected error occurred." };
}

import type { Request } from "express";

export function getValidatedBody<T>(request: Request) {
  return request.validated?.body as T;
}

export function getValidatedParams<T>(request: Request) {
  return request.validated?.params as T;
}

export function getValidatedQuery<T>(request: Request) {
  return request.validated?.query as T;
}

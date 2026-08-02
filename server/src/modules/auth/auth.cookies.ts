import type { CookieOptions, Response } from "express";

import { env } from "../../config/env.js";

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.JWT_COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
  };
}

export function setAuthCookie(response: Response, token: string) {
  response.cookie(env.JWT_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: env.JWT_COOKIE_MAX_AGE_MS,
  });
}

export function clearAuthCookie(response: Response) {
  response.clearCookie(env.JWT_COOKIE_NAME, baseCookieOptions());
}

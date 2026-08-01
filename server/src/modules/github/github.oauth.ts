import { randomBytes } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { GithubOAuthTokenResponse } from "./github.types.js";

const OAUTH_STATE_PURPOSE = "github_oauth";
const OAUTH_STATE_EXPIRES_IN = "10m";
export const GITHUB_OAUTH_NONCE_COOKIE = "github_oauth_nonce";
export const GITHUB_OAUTH_SCOPES = ["read:user", "user:email", "repo"].join(" ");

interface OAuthStatePayload {
  sub: string;
  nonce: string;
  purpose: typeof OAUTH_STATE_PURPOSE;
}

export function assertGithubOAuthConfigured() {
  if (
    !env.GITHUB_CLIENT_ID ||
    !env.GITHUB_CLIENT_SECRET ||
    !env.GITHUB_CALLBACK_URL
  ) {
    throw AppError.serviceUnavailable(
      "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL.",
    );
  }
}

export function createOAuthState(userId: string): {
  state: string;
  nonce: string;
} {
  const nonce = randomBytes(16).toString("hex");
  const state = jwt.sign(
    {
      sub: userId,
      nonce,
      purpose: OAUTH_STATE_PURPOSE,
    } satisfies OAuthStatePayload,
    env.JWT_SECRET,
    { expiresIn: OAUTH_STATE_EXPIRES_IN },
  );

  return { state, nonce };
}

export function verifyOAuthState(
  state: string,
  nonceFromCookie: string | undefined,
): string {
  if (!state?.trim()) {
    throw AppError.badRequest("Missing GitHub OAuth state parameter.");
  }

  if (!nonceFromCookie?.trim()) {
    throw AppError.badRequest(
      "Missing GitHub OAuth nonce cookie. Restart the connect flow.",
    );
  }

  try {
    const payload = jwt.verify(state, env.JWT_SECRET) as OAuthStatePayload;

    if (
      payload.purpose !== OAUTH_STATE_PURPOSE ||
      typeof payload.sub !== "string" ||
      !payload.sub ||
      payload.nonce !== nonceFromCookie
    ) {
      throw AppError.badRequest("Invalid GitHub OAuth state.");
    }

    return payload.sub;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw AppError.badRequest(
      "GitHub OAuth state is invalid or has expired. Please try connecting again.",
    );
  }
}

export function buildGithubAuthorizeUrl(state: string): string {
  assertGithubOAuthConfigured();

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID!);
  url.searchParams.set("redirect_uri", env.GITHUB_CALLBACK_URL!);
  url.searchParams.set("scope", GITHUB_OAUTH_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "false");

  return url.toString();
}

export async function exchangeCodeForToken(
  code: string,
): Promise<GithubOAuthTokenResponse> {
  assertGithubOAuthConfigured();

  if (!code?.trim()) {
    throw AppError.badRequest("Missing GitHub OAuth authorization code.");
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "rag-workspace",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code.trim(),
      redirect_uri: env.GITHUB_CALLBACK_URL,
    }),
  });

  if (!response.ok) {
    throw AppError.badGateway(
      "Failed to exchange GitHub authorization code for an access token.",
      { status: response.status },
    );
  }

  const payload = (await response.json()) as GithubOAuthTokenResponse;

  if (payload.error || !payload.access_token) {
    throw AppError.badRequest(
      payload.error_description ||
        payload.error ||
        "GitHub denied the OAuth authorization request.",
    );
  }

  return payload;
}

export function buildFrontendRedirect(query: Record<string, string>): string {
  const url = new URL("/github", env.FRONTEND_URL);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

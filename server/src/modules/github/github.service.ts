import type { Response } from "express";

import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import {
  fetchGithubAuthenticatedUser,
  fetchGithubRepositories,
  fetchGithubRepository,
} from "./github.api.js";
import {
  assertGithubOAuthConfigured,
  buildFrontendRedirect,
  buildGithubAuthorizeUrl,
  createOAuthState,
  exchangeCodeForToken,
  GITHUB_OAUTH_NONCE_COOKIE,
  verifyOAuthState,
} from "./github.oauth.js";
import type { GithubRepository } from "./github.repository.js";
import type {
  GithubRepositoryListResult,
  GithubRepositorySummary,
  GithubStatus,
  ListGithubRepositoriesQuery,
} from "./github.types.js";

function oauthNonceCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60 * 1000,
  };
}

export class GithubService {
  constructor(private readonly githubRepository: GithubRepository) {}

  public beginLogin(userId: string, response: Response): string {
    assertGithubOAuthConfigured();

    const { state, nonce } = createOAuthState(userId);
    response.cookie(GITHUB_OAUTH_NONCE_COOKIE, nonce, oauthNonceCookieOptions());
    return buildGithubAuthorizeUrl(state);
  }

  public async handleCallback(input: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
    nonceCookie?: string;
    response: Response;
  }): Promise<string> {
    input.response.clearCookie(GITHUB_OAUTH_NONCE_COOKIE, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    if (input.error) {
      return buildFrontendRedirect({
        github: "error",
        message:
          input.errorDescription ||
          input.error ||
          "GitHub authorization was denied.",
      });
    }

    try {
      const userId = verifyOAuthState(input.state ?? "", input.nonceCookie);
      const token = await exchangeCodeForToken(input.code ?? "");
      const profile = await fetchGithubAuthenticatedUser(token.access_token);

      await this.connect({
        userId,
        githubId: String(profile.id),
        githubUsername: profile.login,
        githubName: profile.name ?? undefined,
        githubAvatar: profile.avatar_url,
        githubAccessToken: token.access_token,
        githubRefreshToken: token.refresh_token,
        githubTokenType: token.token_type,
        githubScope: token.scope,
      });

      return buildFrontendRedirect({ github: "connected" });
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : "Unable to complete GitHub connection.";

      return buildFrontendRedirect({
        github: "error",
        message,
      });
    }
  }

  public async connect(input: {
    userId: string;
    githubId: string;
    githubUsername: string;
    githubName?: string;
    githubAvatar?: string;
    githubAccessToken: string;
    githubRefreshToken?: string;
    githubTokenType?: string;
    githubScope?: string;
  }): Promise<GithubStatus> {
    const connection = await this.githubRepository.connect(input);
    return this.toStatus(connection);
  }

  public async disconnect(userId: string): Promise<GithubStatus> {
    await this.githubRepository.disconnect(userId);
    return { connected: false };
  }

  public async getStatus(userId: string): Promise<GithubStatus> {
    const connection = await this.githubRepository.findByUserId(userId);

    if (!connection?.githubConnected) {
      return { connected: false };
    }

    return this.toStatus(connection);
  }

  public async getRepositories(
    userId: string,
    query: ListGithubRepositoriesQuery = {},
  ): Promise<GithubRepositoryListResult> {
    const accessToken = await this.requireAccessToken(userId);
    return fetchGithubRepositories(accessToken, query);
  }

  public async getRepository(
    userId: string,
    owner: string,
    repo: string,
  ): Promise<GithubRepositorySummary> {
    const accessToken = await this.requireAccessToken(userId);
    return fetchGithubRepository(accessToken, owner, repo);
  }

  public async refreshProfile(userId: string): Promise<GithubStatus> {
    const accessToken = await this.requireAccessToken(userId);
    const profile = await fetchGithubAuthenticatedUser(accessToken);

    const connection = await this.githubRepository.updateProfile(userId, {
      githubUsername: profile.login,
      githubName: profile.name ?? undefined,
      githubAvatar: profile.avatar_url,
    });

    if (!connection) {
      throw AppError.notFound("GitHub connection");
    }

    return this.toStatus(connection);
  }

  private async requireAccessToken(userId: string): Promise<string> {
    const connection =
      await this.githubRepository.findByUserIdWithToken(userId);

    if (!connection?.githubConnected) {
      throw AppError.badRequest(
        "GitHub is not connected. Connect your GitHub account first.",
      );
    }

    const accessToken =
      this.githubRepository.getDecryptedAccessToken(connection);

    if (!accessToken) {
      throw AppError.serviceUnavailable(
        "GitHub credentials are missing. Please reconnect GitHub.",
      );
    }

    return accessToken;
  }

  private toStatus(connection: {
    githubConnected: boolean;
    githubId?: string;
    githubUsername?: string;
    githubName?: string;
    githubAvatar?: string;
    githubScope?: string;
    githubConnectedAt?: Date;
  }): GithubStatus {
    if (!connection.githubConnected) {
      return { connected: false };
    }

    return {
      connected: true,
      ...(connection.githubId ? { githubId: connection.githubId } : {}),
      ...(connection.githubUsername
        ? { username: connection.githubUsername }
        : {}),
      ...(connection.githubName ? { name: connection.githubName } : {}),
      ...(connection.githubAvatar ? { avatar: connection.githubAvatar } : {}),
      ...(connection.githubScope ? { scope: connection.githubScope } : {}),
      ...(connection.githubConnectedAt
        ? { connectedAt: connection.githubConnectedAt.toISOString() }
        : {}),
    };
  }
}

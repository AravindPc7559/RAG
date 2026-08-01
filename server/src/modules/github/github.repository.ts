import mongoose from "mongoose";

import { AppError } from "../../shared/errors/AppError.js";
import {
  decryptSecret,
  encryptSecret,
} from "../../shared/security/tokenEncryption.js";
import {
  GithubConnectionModel,
  type GithubConnectionDocument,
} from "./github.model.js";
import type { ConnectGithubInput } from "./github.types.js";

export class GithubRepository {
  public async findByUserId(
    userId: string,
  ): Promise<GithubConnectionDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return GithubConnectionModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).exec();
  }

  public async findByUserIdWithToken(
    userId: string,
  ): Promise<GithubConnectionDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return GithubConnectionModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .select("+githubAccessToken +githubRefreshToken")
      .exec();
  }

  public async connect(
    input: ConnectGithubInput,
  ): Promise<GithubConnectionDocument> {
    const encryptedAccessToken = encryptSecret(input.githubAccessToken);
    const encryptedRefreshToken = input.githubRefreshToken
      ? encryptSecret(input.githubRefreshToken)
      : undefined;

    const connection = await GithubConnectionModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(input.userId) },
      {
        $set: {
          githubConnected: true,
          githubId: input.githubId,
          githubUsername: input.githubUsername,
          githubName: input.githubName,
          githubAvatar: input.githubAvatar,
          githubAccessToken: encryptedAccessToken,
          ...(encryptedRefreshToken
            ? { githubRefreshToken: encryptedRefreshToken }
            : {}),
          githubTokenType: input.githubTokenType ?? "bearer",
          githubScope: input.githubScope,
          githubConnectedAt: new Date(),
        },
        ...(encryptedRefreshToken
          ? {}
          : { $unset: { githubRefreshToken: 1 } }),
        $setOnInsert: {
          userId: new mongoose.Types.ObjectId(input.userId),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).exec();

    if (!connection) {
      throw AppError.serviceUnavailable(
        "Failed to persist GitHub connection.",
      );
    }

    return connection;
  }

  public async disconnect(userId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return false;
    }

    const result = await GithubConnectionModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          githubConnected: false,
        },
        $unset: {
          githubId: 1,
          githubUsername: 1,
          githubName: 1,
          githubAvatar: 1,
          githubAccessToken: 1,
          githubRefreshToken: 1,
          githubTokenType: 1,
          githubScope: 1,
          githubConnectedAt: 1,
        },
      },
      { new: true },
    ).exec();

    return Boolean(result);
  }

  public getDecryptedAccessToken(
    connection: GithubConnectionDocument,
  ): string | null {
    if (!connection.githubAccessToken) {
      return null;
    }

    return decryptSecret(connection.githubAccessToken);
  }

  public async updateProfile(
    userId: string,
    profile: {
      githubUsername: string;
      githubName?: string;
      githubAvatar?: string;
    },
  ): Promise<GithubConnectionDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return GithubConnectionModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        githubConnected: true,
      },
      {
        $set: {
          githubUsername: profile.githubUsername,
          githubName: profile.githubName,
          githubAvatar: profile.githubAvatar,
        },
      },
      { new: true },
    ).exec();
  }
}

import { AppError } from "../../shared/errors/AppError.js";
import type { ChatRepository } from "../chat/chat.repository.js";
import {
  createPullRequestReview,
  createRepositoryWebhook,
  deleteRepositoryWebhook,
  fetchPullRequest,
  fetchPullRequestFiles,
  fetchPullRequests,
  getRepositoryWebhook,
  verifyGithubWebhookSignature,
} from "../github/github.api.js";
import type { GithubService } from "../github/github.service.js";
import type { KnowledgeRepository } from "../knowledge/knowledge.repository.js";
import type {
  GithubPrPort,
  KnowledgeLookupPort,
  RetrievalPort,
} from "./review.types.js";

export function createRetrievalAdapter(
  chatRepository: ChatRepository,
): RetrievalPort {
  return {
    retrieveContext(input) {
      return chatRepository.retrieveContext(input);
    },
  };
}

export function createKnowledgeLookupAdapter(
  knowledgeRepository: KnowledgeRepository,
): KnowledgeLookupPort {
  return {
    async getReadyKnowledgeBase(userId, owner, repo) {
      const record = await knowledgeRepository.findByOwnerRepo(
        userId,
        owner,
        repo,
      );

      if (!record) {
        throw AppError.badRequest(
          "Import this repository into a knowledge base before reviewing pull requests.",
        );
      }

      if (record.status === "indexing" || record.status === "pending") {
        throw AppError.badRequest(
          "Knowledge base is still indexing. Wait until it is ready, then try again.",
        );
      }

      if (record.status !== "ready") {
        throw AppError.badRequest(
          record.errorMessage ||
            "Knowledge base is not ready. Import or Sync the repository first.",
        );
      }

      return {
        knowledgeBaseId: record.knowledgeBaseId,
        fullName: record.fullName,
        githubRepoId: record.githubRepoId,
        defaultBranch: record.defaultBranch,
        owner: record.owner,
        repo: record.repo,
      };
    },
  };
}

export function createGithubPrAdapter(
  githubService: GithubService,
): GithubPrPort {
  return {
    getAccessToken(userId) {
      return githubService.getAccessTokenForUser(userId);
    },
    listPullRequests(accessToken, owner, repo, query) {
      return fetchPullRequests(accessToken, owner, repo, query);
    },
    getPullRequest(accessToken, owner, repo, number) {
      return fetchPullRequest(accessToken, owner, repo, number);
    },
    getPullRequestFiles(accessToken, owner, repo, number) {
      return fetchPullRequestFiles(accessToken, owner, repo, number);
    },
    createReview(accessToken, owner, repo, number, input) {
      return createPullRequestReview(accessToken, owner, repo, number, {
        commitId: input.commitId,
        body: input.body,
        event: "COMMENT",
        comments: input.comments,
      });
    },
    createWebhook(accessToken, owner, repo, input) {
      return createRepositoryWebhook(accessToken, owner, repo, input);
    },
    getWebhook(accessToken, owner, repo, hookId) {
      return getRepositoryWebhook(accessToken, owner, repo, hookId);
    },
    deleteWebhook(accessToken, owner, repo, hookId) {
      return deleteRepositoryWebhook(accessToken, owner, repo, hookId);
    },
    verifyWebhookSignature(rawBody, signatureHeader, secret) {
      return verifyGithubWebhookSignature(rawBody, signatureHeader, secret);
    },
  };
}

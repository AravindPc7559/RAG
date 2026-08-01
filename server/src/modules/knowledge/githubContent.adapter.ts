import {
  fetchFileContent,
  fetchGithubRepository,
  fetchRepositoryTree,
} from "../github/github.api.js";
import type { GithubService } from "../github/github.service.js";
import type { GithubContentPort } from "./knowledge.types.js";

export function createGithubContentAdapter(
  githubService: GithubService,
): GithubContentPort {
  return {
    getAccessToken(userId) {
      return githubService.getAccessTokenForUser(userId);
    },
    async getRepository(accessToken, owner, repo) {
      const repository = await fetchGithubRepository(accessToken, owner, repo);
      return {
        id: repository.id,
        name: repository.name,
        fullName: repository.fullName,
        owner: repository.owner,
        defaultBranch: repository.defaultBranch,
        htmlUrl: repository.htmlUrl,
      };
    },
    getRepositoryTree(accessToken, owner, repo, branch) {
      return fetchRepositoryTree(accessToken, owner, repo, branch);
    },
    getFileContent(accessToken, owner, repo, path, ref) {
      return fetchFileContent(accessToken, owner, repo, path, ref);
    },
  };
}

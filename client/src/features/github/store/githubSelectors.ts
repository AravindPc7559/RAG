import type { RootState } from "@/app/store/store";

export const selectGithubConnection = (state: RootState) =>
  state.github.connection;

export const selectGithubConnectionStatus = (state: RootState) =>
  state.github.connectionStatus;

export const selectGithubRepositories = (state: RootState) =>
  state.github.repositories;

export const selectGithubRepositoriesStatus = (state: RootState) =>
  state.github.repositoriesStatus;

export const selectGithubRepositoriesQuery = (state: RootState) =>
  state.github.repositoriesQuery;

export const selectGithubSelectedRepository = (state: RootState) =>
  state.github.selectedRepository;

export const selectGithubSelectedRepositoryStatus = (state: RootState) =>
  state.github.selectedRepositoryStatus;

export const selectGithubError = (state: RootState) => state.github.error;

export const selectGithubHasNextPage = (state: RootState) =>
  state.github.hasNextPage;

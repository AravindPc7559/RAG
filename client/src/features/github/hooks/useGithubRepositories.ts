import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  selectGithubError,
  selectGithubHasNextPage,
  selectGithubRepositories,
  selectGithubRepositoriesQuery,
  selectGithubRepositoriesStatus,
} from "@/features/github/store/githubSelectors";
import { setRepositoriesQuery } from "@/features/github/store/githubSlice";
import { fetchGithubRepositories } from "@/features/github/store/githubThunks";
import type { GithubRepositoriesQuery } from "@/features/github/types/github.types";

export function useGithubRepositories() {
  const dispatch = useAppDispatch();
  const repositories = useAppSelector(selectGithubRepositories);
  const status = useAppSelector(selectGithubRepositoriesStatus);
  const query = useAppSelector(selectGithubRepositoriesQuery);
  const hasNextPage = useAppSelector(selectGithubHasNextPage);
  const error = useAppSelector(selectGithubError);

  const loadRepositories = useCallback(
    (overrides: Partial<GithubRepositoriesQuery> = {}) => {
      dispatch(setRepositoriesQuery(overrides));
      return dispatch(fetchGithubRepositories(overrides));
    },
    [dispatch],
  );

  const syncRepositories = useCallback(() => {
    return loadRepositories({ page: 1 });
  }, [loadRepositories]);

  return {
    repositories,
    status,
    query,
    hasNextPage,
    error,
    isLoading: status === "loading",
    loadRepositories,
    syncRepositories,
  };
}

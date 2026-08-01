import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  selectGithubError,
  selectGithubSelectedRepository,
  selectGithubSelectedRepositoryStatus,
} from "@/features/github/store/githubSelectors";
import {
  clearSelectedRepository,
  selectRepositoryLocally,
} from "@/features/github/store/githubSlice";
import { fetchGithubRepository } from "@/features/github/store/githubThunks";
import type { GithubRepository } from "@/features/github/types/github.types";

export function useGithubRepository() {
  const dispatch = useAppDispatch();
  const repository = useAppSelector(selectGithubSelectedRepository);
  const status = useAppSelector(selectGithubSelectedRepositoryStatus);
  const error = useAppSelector(selectGithubError);

  const loadRepository = useCallback(
    (owner: string, repo: string) => {
      return dispatch(fetchGithubRepository({ owner, repo }));
    },
    [dispatch],
  );

  const selectLocal = useCallback(
    (repo: GithubRepository | null) => {
      dispatch(selectRepositoryLocally(repo));
    },
    [dispatch],
  );

  const clear = useCallback(() => {
    dispatch(clearSelectedRepository());
  }, [dispatch]);

  return {
    repository,
    status,
    error,
    isLoading: status === "loading",
    loadRepository,
    selectLocal,
    clear,
  };
}

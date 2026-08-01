import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  clearGithubError,
  resetGithubState,
} from "@/features/github/store/githubSlice";
import {
  selectGithubConnection,
  selectGithubConnectionStatus,
  selectGithubError,
} from "@/features/github/store/githubSelectors";
import {
  disconnectGithub,
  fetchGithubStatus,
  refreshGithubProfile,
} from "@/features/github/store/githubThunks";
import { githubService } from "@/services/github";

export function useGithubConnection() {
  const dispatch = useAppDispatch();
  const connection = useAppSelector(selectGithubConnection);
  const status = useAppSelector(selectGithubConnectionStatus);
  const error = useAppSelector(selectGithubError);

  const loadStatus = useCallback(() => {
    return dispatch(fetchGithubStatus());
  }, [dispatch]);

  const connect = useCallback(() => {
    githubService.startConnect();
  }, []);

  const disconnect = useCallback(async () => {
    const result = await dispatch(disconnectGithub());
    return result;
  }, [dispatch]);

  const refreshProfile = useCallback(() => {
    return dispatch(refreshGithubProfile());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearGithubError());
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch(resetGithubState());
  }, [dispatch]);

  return {
    connection,
    status,
    error,
    isLoading: status === "loading",
    isConnected: Boolean(connection?.connected),
    loadStatus,
    connect,
    disconnect,
    refreshProfile,
    clearError,
    reset,
  };
}

import { createAsyncThunk } from "@reduxjs/toolkit";

import type { RootState } from "@/app/store/store";
import type {
  GithubRepositoriesQuery,
  GithubRepositoriesResult,
  GithubRepository,
  GithubStatus,
} from "@/features/github/types/github.types";
import {
  toApiErrorPayload,
  type ApiErrorPayload,
} from "@/services/apiErrors";
import { githubService } from "@/services/github";

interface GithubThunkConfig {
  rejectValue: ApiErrorPayload;
}

export const fetchGithubStatus = createAsyncThunk<
  GithubStatus,
  void,
  GithubThunkConfig
>("github/fetchStatus", async (_input, { rejectWithValue }) => {
  try {
    return await githubService.getStatus();
  } catch (error) {
    return rejectWithValue(toApiErrorPayload(error));
  }
});

export const fetchGithubRepositories = createAsyncThunk<
  GithubRepositoriesResult,
  Partial<GithubRepositoriesQuery> | undefined,
  GithubThunkConfig & { state: RootState }
>("github/fetchRepositories", async (overrides, { getState, rejectWithValue }) => {
  try {
    const query = {
      ...getState().github.repositoriesQuery,
      ...overrides,
    };
    return await githubService.listRepositories(query);
  } catch (error) {
    return rejectWithValue(toApiErrorPayload(error));
  }
});

export const fetchGithubRepository = createAsyncThunk<
  GithubRepository,
  { owner: string; repo: string },
  GithubThunkConfig
>("github/fetchRepository", async ({ owner, repo }, { rejectWithValue }) => {
  try {
    return await githubService.getRepository(owner, repo);
  } catch (error) {
    return rejectWithValue(toApiErrorPayload(error));
  }
});

export const disconnectGithub = createAsyncThunk<
  GithubStatus,
  void,
  GithubThunkConfig
>("github/disconnect", async (_input, { rejectWithValue }) => {
  try {
    return await githubService.disconnect();
  } catch (error) {
    return rejectWithValue(toApiErrorPayload(error));
  }
});

export const refreshGithubProfile = createAsyncThunk<
  GithubStatus,
  void,
  GithubThunkConfig
>("github/refreshProfile", async (_input, { rejectWithValue }) => {
  try {
    return await githubService.refreshProfile();
  } catch (error) {
    return rejectWithValue(toApiErrorPayload(error));
  }
});

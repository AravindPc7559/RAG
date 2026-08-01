import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  disconnectGithub,
  fetchGithubRepositories,
  fetchGithubRepository,
  fetchGithubStatus,
  fetchKnowledgeBases,
  importGithubRepository,
  refreshGithubProfile,
  syncGithubKnowledgeBase,
} from "@/features/github/store/githubThunks";
import type {
  GithubRepositoriesQuery,
  GithubRepository,
  GithubState,
} from "@/features/github/types/github.types";
import {
  knowledgeRepoKey,
  type KnowledgeBase,
} from "@/features/knowledge/types/knowledge.types";

export const githubInitialState: GithubState = {
  connection: null,
  connectionStatus: "idle",
  repositories: [],
  repositoriesStatus: "idle",
  repositoriesQuery: {
    page: 1,
    perPage: 30,
    sort: "updated",
    direction: "desc",
    visibility: "all",
  },
  hasNextPage: false,
  selectedRepository: null,
  selectedRepositoryStatus: "idle",
  knowledgeByRepo: {},
  knowledgeStatus: "idle",
  error: null,
};

function upsertKnowledgeBase(
  state: GithubState,
  knowledgeBase: KnowledgeBase,
  actionStatus: "idle" | "importing" | "syncing" = "idle",
) {
  const key = knowledgeRepoKey(knowledgeBase.owner, knowledgeBase.repo);
  state.knowledgeByRepo[key] = {
    knowledgeBase,
    actionStatus,
  };
}

function setRepoActionError(
  state: GithubState,
  owner: string,
  repo: string,
  message: string,
) {
  const key = knowledgeRepoKey(owner, repo);
  const current = state.knowledgeByRepo[key];
  state.knowledgeByRepo[key] = {
    knowledgeBase: current?.knowledgeBase ?? null,
    actionStatus: "idle",
    error: message,
  };
}

const githubSlice = createSlice({
  name: "github",
  initialState: githubInitialState,
  reducers: {
    clearGithubError(state) {
      state.error = null;
    },
    clearSelectedRepository(state) {
      state.selectedRepository = null;
      state.selectedRepositoryStatus = "idle";
    },
    setRepositoriesQuery(
      state,
      action: PayloadAction<Partial<GithubRepositoriesQuery>>,
    ) {
      state.repositoriesQuery = {
        ...state.repositoriesQuery,
        ...action.payload,
      };
    },
    selectRepositoryLocally(
      state,
      action: PayloadAction<GithubRepository | null>,
    ) {
      state.selectedRepository = action.payload;
      state.selectedRepositoryStatus = action.payload ? "succeeded" : "idle";
    },
    resetGithubState() {
      return githubInitialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGithubStatus.pending, (state) => {
        state.connectionStatus = "loading";
        state.error = null;
      })
      .addCase(fetchGithubStatus.fulfilled, (state, action) => {
        state.connection = action.payload;
        state.connectionStatus = "succeeded";
      })
      .addCase(fetchGithubStatus.rejected, (state, action) => {
        state.connectionStatus = "failed";
        state.error = action.payload ?? {
          message: "Unable to load GitHub connection status.",
        };
      })
      .addCase(fetchGithubRepositories.pending, (state) => {
        state.repositoriesStatus = "loading";
        state.error = null;
      })
      .addCase(fetchGithubRepositories.fulfilled, (state, action) => {
        state.repositories = action.payload.repositories;
        state.hasNextPage = action.payload.hasNextPage;
        state.repositoriesStatus = "succeeded";
        state.repositoriesQuery = {
          ...state.repositoriesQuery,
          page: action.payload.page,
          perPage: action.payload.perPage,
        };
      })
      .addCase(fetchGithubRepositories.rejected, (state, action) => {
        state.repositoriesStatus = "failed";
        state.error = action.payload ?? {
          message: "Unable to load GitHub repositories.",
        };
      })
      .addCase(fetchGithubRepository.pending, (state) => {
        state.selectedRepositoryStatus = "loading";
        state.error = null;
      })
      .addCase(fetchGithubRepository.fulfilled, (state, action) => {
        state.selectedRepository = action.payload;
        state.selectedRepositoryStatus = "succeeded";
      })
      .addCase(fetchGithubRepository.rejected, (state, action) => {
        state.selectedRepositoryStatus = "failed";
        state.error = action.payload ?? {
          message: "Unable to load repository details.",
        };
      })
      .addCase(disconnectGithub.pending, (state) => {
        state.connectionStatus = "loading";
        state.error = null;
      })
      .addCase(disconnectGithub.fulfilled, (state, action) => {
        state.connection = action.payload;
        state.connectionStatus = "succeeded";
        state.repositories = [];
        state.repositoriesStatus = "idle";
        state.selectedRepository = null;
        state.knowledgeByRepo = {};
        state.knowledgeStatus = "idle";
      })
      .addCase(disconnectGithub.rejected, (state, action) => {
        state.connectionStatus = "failed";
        state.error = action.payload ?? {
          message: "Unable to disconnect GitHub.",
        };
      })
      .addCase(refreshGithubProfile.fulfilled, (state, action) => {
        state.connection = action.payload;
        state.connectionStatus = "succeeded";
      })
      .addCase(fetchKnowledgeBases.pending, (state) => {
        state.knowledgeStatus = "loading";
      })
      .addCase(fetchKnowledgeBases.fulfilled, (state, action) => {
        state.knowledgeStatus = "succeeded";
        const next: GithubState["knowledgeByRepo"] = {};
        for (const knowledgeBase of action.payload) {
          const key = knowledgeRepoKey(
            knowledgeBase.owner,
            knowledgeBase.repo,
          );
          next[key] = {
            knowledgeBase,
            actionStatus: "idle",
          };
        }
        state.knowledgeByRepo = next;
      })
      .addCase(fetchKnowledgeBases.rejected, (state, action) => {
        state.knowledgeStatus = "failed";
        state.error = action.payload ?? {
          message: "Unable to load knowledge bases.",
        };
      })
      .addCase(importGithubRepository.pending, (state, action) => {
        const { owner, repo } = action.meta.arg;
        const key = knowledgeRepoKey(owner, repo);
        const current = state.knowledgeByRepo[key];
        state.knowledgeByRepo[key] = {
          knowledgeBase: current?.knowledgeBase ?? null,
          actionStatus: "importing",
        };
      })
      .addCase(importGithubRepository.fulfilled, (state, action) => {
        upsertKnowledgeBase(state, action.payload, "idle");
      })
      .addCase(importGithubRepository.rejected, (state, action) => {
        const { owner, repo } = action.meta.arg;
        setRepoActionError(
          state,
          owner,
          repo,
          action.payload?.message ?? "Unable to import repository.",
        );
      })
      .addCase(syncGithubKnowledgeBase.pending, (state, action) => {
        const { owner, repo } = action.meta.arg;
        const key = knowledgeRepoKey(owner, repo);
        const current = state.knowledgeByRepo[key];
        state.knowledgeByRepo[key] = {
          knowledgeBase: current?.knowledgeBase ?? null,
          actionStatus: "syncing",
        };
      })
      .addCase(syncGithubKnowledgeBase.fulfilled, (state, action) => {
        upsertKnowledgeBase(state, action.payload, "idle");
      })
      .addCase(syncGithubKnowledgeBase.rejected, (state, action) => {
        const { owner, repo } = action.meta.arg;
        setRepoActionError(
          state,
          owner,
          repo,
          action.payload?.message ?? "Unable to sync repository.",
        );
      });
  },
});

export const {
  clearGithubError,
  clearSelectedRepository,
  setRepositoriesQuery,
  selectRepositoryLocally,
  resetGithubState,
} = githubSlice.actions;

export default githubSlice.reducer;

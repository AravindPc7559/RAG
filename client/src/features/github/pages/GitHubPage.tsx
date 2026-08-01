import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { createChatPath } from "@/app/router/paths";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { refreshSession } from "@/features/auth/store/authThunks";
import { GithubConnectionHeader } from "@/features/github/components/GithubConnectionHeader";
import { GithubEmptyState } from "@/features/github/components/GithubEmptyState";
import { GithubRepoCard } from "@/features/github/components/GithubRepoCard";
import { GithubRepoDetailsModal } from "@/features/github/components/GithubRepoDetailsModal";
import { GithubRepoSkeleton } from "@/features/github/components/GithubRepoSkeleton";
import { useGithubConnection } from "@/features/github/hooks/useGithubConnection";
import { useGithubRepositories } from "@/features/github/hooks/useGithubRepositories";
import { useGithubRepository } from "@/features/github/hooks/useGithubRepository";
import { selectKnowledgeByRepo } from "@/features/github/store/githubSelectors";
import {
  disconnectGithub,
  fetchKnowledgeBases,
  importGithubRepository,
  syncGithubKnowledgeBase,
} from "@/features/github/store/githubThunks";
import type { GithubRepository } from "@/features/github/types/github.types";
import {
  isKnowledgeIndexing,
  knowledgeRepoKey,
} from "@/features/knowledge/types/knowledge.types";
import { useToast } from "@/shared/hooks/useToast";

export function GitHubPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const oauthHandledRef = useRef(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const knowledgeByRepo = useAppSelector(selectKnowledgeByRepo);

  const {
    connection,
    status: connectionStatus,
    error: connectionError,
    isConnected,
    loadStatus,
    connect,
    disconnect,
  } = useGithubConnection();

  const {
    repositories,
    status: repositoriesStatus,
    error: repositoriesError,
    isLoading: isLoadingRepositories,
    loadRepositories,
    syncRepositories,
  } = useGithubRepositories();

  const {
    repository: selectedRepository,
    status: selectedRepositoryStatus,
    loadRepository,
    selectLocal,
    clear: clearSelectedRepository,
  } = useGithubRepository();

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    void loadRepositories({ page: 1 });
    void dispatch(fetchKnowledgeBases());
  }, [dispatch, isConnected, loadRepositories]);

  const hasIndexingKnowledge = Object.values(knowledgeByRepo).some((entry) =>
    isKnowledgeIndexing(entry.knowledgeBase),
  );
  const indexingSnapshotRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!isConnected || !hasIndexingKnowledge) {
      return;
    }

    const timer = window.setInterval(() => {
      void dispatch(fetchKnowledgeBases());
    }, 1500);

    return () => {
      window.clearInterval(timer);
    };
  }, [dispatch, hasIndexingKnowledge, isConnected]);

  useEffect(() => {
    const previous = indexingSnapshotRef.current;
    const next: Record<string, boolean> = {};

    for (const [key, entry] of Object.entries(knowledgeByRepo)) {
      const kb = entry.knowledgeBase;
      const indexing = isKnowledgeIndexing(kb);
      next[key] = indexing;

      if (previous[key] && !indexing && kb) {
        if (kb.status === "ready") {
          showToast(
            `${kb.fullName} is ready. You can open chat now.`,
            "success",
          );
        } else if (kb.status === "failed") {
          showToast(
            kb.errorMessage || `${kb.fullName} indexing failed.`,
            "error",
          );
        }
      }
    }

    indexingSnapshotRef.current = next;
  }, [knowledgeByRepo, showToast]);

  useEffect(() => {
    const githubResult = searchParams.get("github");
    if (!githubResult || oauthHandledRef.current) {
      return;
    }

    oauthHandledRef.current = true;
    const message = searchParams.get("message");

    void (async () => {
      await dispatch(refreshSession());
      await loadStatus();

      if (githubResult === "connected") {
        showToast("GitHub connected successfully.", "success");
        await loadRepositories({ page: 1 });
        await dispatch(fetchKnowledgeBases());
      } else if (githubResult === "error") {
        showToast(message || "GitHub connection failed.", "error");
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("github");
      nextParams.delete("message");
      setSearchParams(nextParams, { replace: true });
    })();
  }, [
    dispatch,
    loadRepositories,
    loadStatus,
    searchParams,
    setSearchParams,
    showToast,
  ]);

  function handleConnect() {
    setIsRedirecting(true);
    connect();
  }

  async function handleDisconnect() {
    const result = await disconnect();
    if (disconnectGithub.fulfilled.match(result)) {
      showToast("GitHub disconnected.", "info");
    }
  }

  async function handleViewDetails(repository: GithubRepository) {
    selectLocal(repository);
    await loadRepository(repository.owner, repository.name);
  }

  async function handleImport(repository: GithubRepository) {
    const result = await dispatch(
      importGithubRepository({
        owner: repository.owner,
        repo: repository.name,
      }),
    );

    if (importGithubRepository.fulfilled.match(result)) {
      showToast(
        `${repository.fullName} import started. Indexing in the background…`,
        "info",
      );
      return;
    }

    showToast(
      result.payload?.message || `Failed to import ${repository.fullName}.`,
      "error",
    );
  }

  async function handleSyncKnowledge(repository: GithubRepository) {
    const result = await dispatch(
      syncGithubKnowledgeBase({
        owner: repository.owner,
        repo: repository.name,
      }),
    );

    if (syncGithubKnowledgeBase.fulfilled.match(result)) {
      showToast(
        `${repository.fullName} sync started. Indexing in the background…`,
        "info",
      );
      return;
    }

    showToast(
      result.payload?.message || `Failed to sync ${repository.fullName}.`,
      "error",
    );
  }

  function handleOpenChat(repository: GithubRepository) {
    const key = knowledgeRepoKey(repository.owner, repository.name);
    const knowledge = knowledgeByRepo[key]?.knowledgeBase;

    if (!knowledge?.knowledgeBaseId) {
      showToast("Import this repository before opening chat.", "error");
      return;
    }

    if (isKnowledgeIndexing(knowledge)) {
      showToast("Knowledge base is still indexing. Try again shortly.", "info");
      return;
    }

    if (knowledge.status !== "ready") {
      showToast(
        knowledge.errorMessage ||
          "Knowledge base is not ready yet. Try Sync or Import again.",
        "error",
      );
      return;
    }

    navigate(createChatPath(knowledge.knowledgeBaseId), {
      state: { documentName: repository.fullName },
    });
  }

  const pageError =
    connectionError?.message || repositoriesError?.message || null;
  const showInitialLoading =
    connectionStatus === "loading" && connection === null;
  const showReposError =
    isConnected && repositoriesStatus === "failed" && !isLoadingRepositories;

  return (
    <section className="documents-page github-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Sources</span>
          <h1>GitHub</h1>
          <p>
            {isConnected
              ? "Import a repository to build a knowledge base, then ask questions about its code."
              : "Connect your GitHub account to import repositories and enable AI-powered code analysis."}
          </p>
        </div>
        {isConnected ? (
          <div className="github-page__heading-actions">
            <button
              type="button"
              className="button button--secondary button--compact"
              onClick={() => void syncRepositories()}
            >
              Refresh list
            </button>
            <span className="document-library__count">
              {repositories.length}{" "}
              {repositories.length === 1 ? "repository" : "repositories"}
            </span>
          </div>
        ) : null}
      </header>

      {pageError && connectionStatus === "failed" && !isConnected ? (
        <div className="document-library__empty">
          <p>{pageError}</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void loadStatus()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {showInitialLoading ? <GithubRepoSkeleton count={3} /> : null}

      {!showInitialLoading && !isConnected && connectionStatus !== "failed" ? (
        <GithubEmptyState
          onConnect={handleConnect}
          isConnecting={isRedirecting}
        />
      ) : null}

      {!showInitialLoading && isConnected && connection ? (
        <>
          <GithubConnectionHeader
            connection={connection}
            isDisconnecting={connectionStatus === "loading"}
            onDisconnect={() => void handleDisconnect()}
          />

          {isLoadingRepositories && repositories.length === 0 ? (
            <GithubRepoSkeleton />
          ) : null}

          {showReposError ? (
            <div className="document-library__empty">
              <p>{pageError || "Unable to load repositories."}</p>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => void loadRepositories({ page: 1 })}
              >
                Retry
              </button>
            </div>
          ) : null}

          {!isLoadingRepositories &&
          !showReposError &&
          repositories.length === 0 ? (
            <div className="document-library__empty">
              <p>No repositories found for this GitHub account.</p>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => void syncRepositories()}
              >
                Refresh
              </button>
            </div>
          ) : null}

          {repositories.length > 0 ? (
            <div className="documents-page__grid github-page__grid">
              {repositories.map((repository) => {
                const key = knowledgeRepoKey(
                  repository.owner,
                  repository.name,
                );
                return (
                  <GithubRepoCard
                    key={repository.id}
                    repository={repository}
                    knowledge={knowledgeByRepo[key]}
                    onViewDetails={(repo) => void handleViewDetails(repo)}
                    onSync={(repo) => void handleSyncKnowledge(repo)}
                    onImport={(repo) => void handleImport(repo)}
                    onOpenChat={handleOpenChat}
                  />
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}

      <GithubRepoDetailsModal
        repository={selectedRepository}
        isLoading={selectedRepositoryStatus === "loading"}
        onClose={clearSelectedRepository}
      />
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useAppDispatch } from "@/app/store/hooks";
import { refreshSession } from "@/features/auth/store/authThunks";
import { GithubConnectionHeader } from "@/features/github/components/GithubConnectionHeader";
import { GithubEmptyState } from "@/features/github/components/GithubEmptyState";
import { GithubRepoCard } from "@/features/github/components/GithubRepoCard";
import { GithubRepoDetailsModal } from "@/features/github/components/GithubRepoDetailsModal";
import { GithubRepoSkeleton } from "@/features/github/components/GithubRepoSkeleton";
import { useGithubConnection } from "@/features/github/hooks/useGithubConnection";
import { useGithubRepositories } from "@/features/github/hooks/useGithubRepositories";
import { useGithubRepository } from "@/features/github/hooks/useGithubRepository";
import { disconnectGithub } from "@/features/github/store/githubThunks";
import type { GithubRepository } from "@/features/github/types/github.types";
import { useToast } from "@/shared/hooks/useToast";

export function GitHubPage() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const oauthHandledRef = useRef(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

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
  }, [isConnected, loadRepositories]);

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

  async function handleSync() {
    const result = await syncRepositories();
    if (result.meta.requestStatus === "fulfilled") {
      showToast("Repositories synced.", "success");
    }
  }

  function handleImport(repository: GithubRepository) {
    showToast(`Import for ${repository.name} is coming soon.`, "info");
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
              ? "Browse and manage repositories from your connected GitHub account."
              : "Connect your GitHub account to import repositories and enable AI-powered code analysis."}
          </p>
        </div>
        {isConnected ? (
          <span className="document-library__count">
            {repositories.length}{" "}
            {repositories.length === 1 ? "repository" : "repositories"}
          </span>
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
              {repositories.map((repository) => (
                <GithubRepoCard
                  key={repository.id}
                  repository={repository}
                  onViewDetails={(repo) => void handleViewDetails(repo)}
                  onSync={() => void handleSync()}
                  onImport={handleImport}
                />
              ))}
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

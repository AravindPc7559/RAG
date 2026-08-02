import { useEffect, useRef, useState } from "react";

import { reviewApi } from "@/features/review";
import type { AutoReviewConfig } from "@/features/review/types/review.types";
import { toApiErrorPayload } from "@/services/apiErrors";
import { githubService } from "@/services/github";
import { useToast } from "@/shared/hooks/useToast";

interface UseRepoAutoReviewOptions {
  owner: string;
  repo: string;
  defaultBranch: string;
  enabled: boolean;
}

function pickBranch(
  names: string[],
  preferred: string,
  fallback: string,
): string {
  if (names.includes(preferred)) {
    return preferred;
  }
  if (names.includes(fallback)) {
    return fallback;
  }
  return names[0] || fallback;
}

export function useRepoAutoReview({
  owner,
  repo,
  defaultBranch,
  enabled,
}: UseRepoAutoReviewOptions) {
  const { showToast } = useToast();
  const [autoReview, setAutoReview] = useState<AutoReviewConfig | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [isBranchesLoading, setIsBranchesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const branchesLoadedRef = useRef(false);
  const branchesRef = useRef<string[]>([]);

  useEffect(() => {
    branchesLoadedRef.current = false;
    branchesRef.current = [];

    if (!enabled) {
      setAutoReview(null);
      setBranches([]);
      setSelectedBranch(defaultBranch);
      return;
    }

    let cancelled = false;

    async function fetchBranches(silent: boolean) {
      if (branchesLoadedRef.current && branchesRef.current.length) {
        return branchesRef.current;
      }

      if (!silent) {
        setIsBranchesLoading(true);
      }

      try {
        const branchList = await githubService.listBranches(owner, repo);
        if (cancelled) {
          return [];
        }
        const names = branchList.map((branch) => branch.name);
        branchesRef.current = names;
        branchesLoadedRef.current = true;
        setBranches(names);
        setSelectedBranch((current) =>
          pickBranch(names, current, defaultBranch),
        );
        return names;
      } catch (error) {
        if (!cancelled && !silent) {
          showToast(toApiErrorPayload(error).message, "error");
        }
        return branchesRef.current;
      } finally {
        if (!cancelled && !silent) {
          setIsBranchesLoading(false);
        }
      }
    }

    async function loadConfig() {
      setIsConfigLoading(true);
      try {
        const config = await reviewApi.getAutoReview(owner, repo);
        if (cancelled) {
          return;
        }
        setAutoReview(config);
        setSelectedBranch(config.targetBranch || defaultBranch);
        if (config.enabled) {
          void fetchBranches(true);
        }
      } catch (error) {
        if (!cancelled) {
          showToast(toApiErrorPayload(error).message, "error");
        }
      } finally {
        if (!cancelled) {
          setIsConfigLoading(false);
        }
      }
    }

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, [defaultBranch, enabled, owner, repo, showToast]);

  async function ensureBranchesLoaded(): Promise<string[]> {
    if (branchesLoadedRef.current && branchesRef.current.length) {
      return branchesRef.current;
    }

    setIsBranchesLoading(true);
    try {
      const branchList = await githubService.listBranches(owner, repo);
      const names = branchList.map((branch) => branch.name);
      branchesRef.current = names;
      branchesLoadedRef.current = true;
      setBranches(names);
      setSelectedBranch((current) => pickBranch(names, current, defaultBranch));
      return names;
    } catch (error) {
      showToast(toApiErrorPayload(error).message, "error");
      return branchesRef.current;
    } finally {
      setIsBranchesLoading(false);
    }
  }

  async function saveAutoReview(nextEnabled: boolean, targetBranch: string) {
    setIsSaving(true);
    try {
      const config = await reviewApi.updateAutoReview(owner, repo, {
        enabled: nextEnabled,
        targetBranch,
      });
      setAutoReview(config);
      if (config.targetBranch) {
        setSelectedBranch(config.targetBranch);
      }
      return config;
    } finally {
      setIsSaving(false);
    }
  }

  async function toggle(nextEnabled: boolean) {
    if (!enabled || isSaving) {
      return;
    }

    try {
      if (nextEnabled) {
        await ensureBranchesLoaded();
      }
      const targetBranch = selectedBranch.trim() || defaultBranch;
      const config = await saveAutoReview(nextEnabled, targetBranch);
      showToast(
        nextEnabled
          ? `Auto-review enabled for ${config.targetBranch}`
          : "Auto-review disabled",
        "success",
      );
    } catch (error) {
      showToast(toApiErrorPayload(error).message, "error");
    }
  }

  async function changeBranch(branch: string) {
    setSelectedBranch(branch);
    if (!autoReview?.enabled || isSaving) {
      return;
    }

    try {
      const config = await saveAutoReview(true, branch);
      showToast(`Auto-review target set to ${config.targetBranch}`, "success");
    } catch (error) {
      showToast(toApiErrorPayload(error).message, "error");
    }
  }

  return {
    autoReview,
    branches,
    selectedBranch,
    isConfigLoading,
    isBranchesLoading,
    isSaving,
    ensureBranchesLoaded,
    toggle,
    changeBranch,
  };
}

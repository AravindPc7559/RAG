import { useRepoAutoReview } from "@/features/github/hooks/useRepoAutoReview";

interface GithubRepoAutoReviewControlsProps {
  owner: string;
  repo: string;
  defaultBranch: string;
  disabled?: boolean;
}

export function GithubRepoAutoReviewControls({
  owner,
  repo,
  defaultBranch,
  disabled = false,
}: GithubRepoAutoReviewControlsProps) {
  const {
    autoReview,
    branches,
    selectedBranch,
    isConfigLoading,
    isBranchesLoading,
    isSaving,
    ensureBranchesLoaded,
    toggle,
    changeBranch,
  } = useRepoAutoReview({
    owner,
    repo,
    defaultBranch,
    enabled: true,
  });

  const busy = disabled || isConfigLoading || isSaving || isBranchesLoading;
  const branchOptions = branches.length
    ? branches
    : [selectedBranch || defaultBranch];

  return (
    <div className="github-repo-box__auto-review">
      <label className="github-repo-box__auto-toggle">
        <input
          type="checkbox"
          checked={Boolean(autoReview?.enabled)}
          disabled={busy}
          onChange={(event) => {
            void toggle(event.target.checked);
          }}
        />
        <span>
          {isSaving
            ? "Saving…"
            : isConfigLoading
              ? "Loading auto-review…"
              : autoReview?.enabled && autoReview.targetBranch
                ? `Auto review · ${autoReview.targetBranch}`
                : "Auto review"}
        </span>
      </label>
      <label className="github-repo-box__auto-branch">
        <span className="visually-hidden">Target branch</span>
        <select
          value={selectedBranch}
          disabled={busy}
          onFocus={() => {
            void ensureBranchesLoaded();
          }}
          onChange={(event) => {
            void changeBranch(event.target.value);
          }}
        >
          {branchOptions.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

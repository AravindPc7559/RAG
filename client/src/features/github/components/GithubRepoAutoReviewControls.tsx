import { useEffect, useState } from "react";

interface GithubRepoAutoReviewControlsProps {
  enabled: boolean;
  selectedBranch: string;
  branches: string[];
  isConfigLoading: boolean;
  isBranchesLoading: boolean;
  isSaving: boolean;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
  onBranchChange: (branch: string) => void;
  onLoadBranches: () => void;
}

export function GithubRepoAutoReviewControls({
  enabled,
  selectedBranch,
  branches,
  isConfigLoading,
  isBranchesLoading,
  isSaving,
  disabled = false,
  onToggle,
  onBranchChange,
  onLoadBranches,
}: GithubRepoAutoReviewControlsProps) {
  const [isExpanded, setIsExpanded] = useState(enabled);
  const busy = disabled || isConfigLoading || isSaving;
  const showBranchPanel = enabled || isExpanded;
  const branchOptions = branches.length ? branches : [selectedBranch];

  useEffect(() => {
    if (enabled) {
      setIsExpanded(true);
    }
  }, [enabled]);

  return (
    <div
      className={`github-repo-box__auto-review${
        enabled ? " github-repo-box__auto-review--enabled" : ""
      }`}
    >
      <div className="github-repo-box__auto-row">
        <div className="github-repo-box__auto-copy">
          <p className="github-repo-box__auto-title">
            {isSaving
              ? "Saving…"
              : isConfigLoading
                ? "Loading…"
                : "Auto Review"}
          </p>
          <p className="github-repo-box__auto-subtitle">
            Automatically review new changes
          </p>
        </div>
        <label className="github-repo-box__switch">
          <input
            type="checkbox"
            role="switch"
            checked={enabled}
            disabled={busy}
            aria-label="Enable auto review"
            onChange={(event) => {
              const next = event.target.checked;
              if (next) {
                setIsExpanded(true);
              }
              onToggle(next);
            }}
          />
          <span className="github-repo-box__switch-track" aria-hidden="true">
            <span className="github-repo-box__switch-thumb" />
          </span>
        </label>
      </div>

      {showBranchPanel ? (
        <div className="github-repo-box__review-branch">
          <div className="github-repo-box__auto-copy">
            <p className="github-repo-box__auto-title">Review Branch</p>
            <p className="github-repo-box__auto-subtitle">
              Changes pushed to this branch will trigger auto review
            </p>
          </div>
          <label className="github-repo-box__branch-select">
            <span className="visually-hidden">Review branch</span>
            <select
              value={selectedBranch}
              disabled={busy || isBranchesLoading}
              onChange={(event) => {
                onBranchChange(event.target.value);
              }}
            >
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {isBranchesLoading && !branches.length
                    ? "Loading branches…"
                    : branch}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <button
          type="button"
          className="github-repo-box__configure"
          disabled={busy}
          onClick={() => {
            setIsExpanded(true);
            onLoadBranches();
          }}
        >
          <span aria-hidden="true">⌄</span>
          Configure
        </button>
      )}
    </div>
  );
}

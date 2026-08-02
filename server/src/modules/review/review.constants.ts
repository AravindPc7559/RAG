export const MAX_CHANGED_FILES = 20;
export const MAX_PATCH_CHARS = 12_000;
export const MAX_CONTEXT_CHUNKS_PER_FILE = 4;
export const MAX_RETRIEVAL_CONCURRENCY = 3;
export const MAX_COMMENTS = 25;
export const PATCH_PREVIEW_CHARS = 400;
export const REVIEW_LLM_MODEL = "gpt-5";
export const DEFAULT_REVIEW_SUMMARY =
  "SourceSense knowledge-base review comments.";
export const AUTO_REVIEW_SUMMARY = "SourceSense auto-review (KB-grounded).";

export const AUTO_REVIEW_ACTIONS = new Set([
  "opened",
  "reopened",
  "synchronize",
  "ready_for_review",
]);

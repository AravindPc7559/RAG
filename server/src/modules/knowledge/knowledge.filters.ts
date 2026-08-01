const MAX_FILES = 120;
const MAX_FILE_BYTES = 200 * 1024;

const IGNORED_DIR_SEGMENTS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  "out",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  ".turbo",
  ".cache",
]);

const IGNORED_FILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "composer.lock",
  "poetry.lock",
  "cargo.lock",
  ".ds_store",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".java",
  ".kt",
  ".rs",
  ".rb",
  ".php",
  ".cs",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
  ".swift",
  ".md",
  ".mdx",
  ".txt",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".env.example",
  ".graphql",
  ".sql",
  ".sh",
  ".css",
  ".scss",
  ".html",
  ".vue",
  ".svelte",
]);

export const knowledgeIngestLimits = {
  maxFiles: MAX_FILES,
  maxFileBytes: MAX_FILE_BYTES,
} as const;

function getExtension(path: string): string {
  const base = path.split("/").pop() ?? path;
  const lower = base.toLowerCase();

  if (lower.endsWith(".env.example")) {
    return ".env.example";
  }

  const dot = lower.lastIndexOf(".");
  if (dot <= 0) {
    return "";
  }

  return lower.slice(dot);
}

export function shouldIncludeRepoPath(path: string, size: number): boolean {
  if (!path || size <= 0 || size > MAX_FILE_BYTES) {
    return false;
  }

  const segments = path.split("/").filter(Boolean);
  if (segments.some((segment) => IGNORED_DIR_SEGMENTS.has(segment))) {
    return false;
  }

  const fileName = (segments[segments.length - 1] ?? "").toLowerCase();
  if (IGNORED_FILE_NAMES.has(fileName)) {
    return false;
  }

  const extension = getExtension(path);
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return false;
  }

  return true;
}

export function selectIngestiblePaths(
  blobs: Array<{ path: string; size: number }>,
): Array<{ path: string; size: number }> {
  return blobs
    .filter((blob) => shouldIncludeRepoPath(blob.path, blob.size))
    .sort((left, right) => left.path.localeCompare(right.path))
    .slice(0, MAX_FILES);
}

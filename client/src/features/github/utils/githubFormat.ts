export function formatGithubUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getKnowledgeIndexingProgress(kb: {
  totalFiles?: number;
  processedFiles?: number;
  chunkCount?: number;
}) {
  const totalFiles = Math.max(0, kb.totalFiles || 0);
  const processedFiles = Math.min(
    Math.max(0, kb.processedFiles || 0),
    totalFiles || Number.MAX_SAFE_INTEGER,
  );
  const pendingFiles = Math.max(totalFiles - processedFiles, 0);
  const percent =
    totalFiles > 0
      ? Math.min(100, Math.round((processedFiles / totalFiles) * 100))
      : 0;

  return {
    totalFiles,
    processedFiles,
    pendingFiles,
    percent,
    chunkCount: kb.chunkCount || 0,
    hasTotals: totalFiles > 0,
  };
}

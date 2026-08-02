import { randomUUID } from "node:crypto";

import { AppError } from "../../shared/errors/AppError.js";
import { MAX_COMMENTS } from "./review.constants.js";
import { pickNearestValidLine } from "./review.patch.js";
import type {
  LlmComment,
  ListPullRequestsState,
  ReviewCommentSeverity,
  ReviewDraftComment,
  ReviewFileContext,
} from "./review.types.js";

export function readPullRequestState(
  value: unknown,
): ListPullRequestsState | undefined {
  if (value === "open" || value === "closed" || value === "all") {
    return value;
  }
  return undefined;
}

export function normalizeSeverity(value: unknown): ReviewCommentSeverity {
  if (value === "warning" || value === "important") {
    return value;
  }
  return "info";
}

export function parseLlmCommentsJson(text: string): LlmComment[] {
  const candidates = [text];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    candidates.unshift(fenced[1].trim());
  }

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    candidates.unshift(arrayMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as LlmComment[];
      }
    } catch {
      // try next candidate
    }
  }

  throw AppError.badGateway("Failed to parse review comments from the model.");
}

export function normalizeDraftComments(
  rawComments: LlmComment[],
  fileContexts: Array<Pick<ReviewFileContext, "filename" | "validLines">>,
): ReviewDraftComment[] {
  const byPath = new Map(
    fileContexts.map((file) => [file.filename, file.validLines]),
  );
  const comments: ReviewDraftComment[] = [];

  for (const raw of rawComments) {
    if (comments.length >= MAX_COMMENTS) {
      break;
    }

    const path = typeof raw.path === "string" ? raw.path.trim() : "";
    const body = typeof raw.body === "string" ? raw.body.trim() : "";
    if (!path || !body || !byPath.has(path)) {
      continue;
    }

    const preferredLine =
      typeof raw.line === "number" && Number.isFinite(raw.line)
        ? Math.trunc(raw.line)
        : 1;
    const validLines = byPath.get(path)!;
    const line = pickNearestValidLine(preferredLine, validLines);
    if (line === null) {
      continue;
    }

    comments.push({
      id: randomUUID(),
      path,
      line,
      side: raw.side === "LEFT" ? "LEFT" : "RIGHT",
      severity: normalizeSeverity(raw.severity),
      body,
    });
  }

  return comments;
}

export function buildRetrievalQuery(input: {
  title: string;
  body: string | null;
  filename: string;
  patch: string;
}): string {
  return [input.title, input.body ?? "", input.filename, input.patch.slice(0, 1500)]
    .filter(Boolean)
    .join("\n");
}

export function preferMatchingChunks<T extends { sourcePath?: string }>(
  chunks: T[],
  filename: string,
  limit: number,
): T[] {
  const preferred = chunks.filter(
    (chunk) =>
      chunk.sourcePath &&
      (chunk.sourcePath === filename ||
        filename.endsWith(chunk.sourcePath) ||
        chunk.sourcePath.endsWith(filename)),
  );

  return (preferred.length ? preferred : chunks).slice(0, limit);
}

export function formatContextChunks(
  chunks: Array<{ sourcePath?: string; text: string }>,
): string {
  return chunks
    .map((chunk) => `[${chunk.sourcePath ?? "unknown"}]\n${chunk.text}`)
    .join("\n\n");
}

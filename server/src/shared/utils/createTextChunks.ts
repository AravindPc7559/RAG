import { pdf } from "pdf-parse";
import { AppError } from "../errors/AppError.js";

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

export type CreateTextChunksOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
};

/**
 * Extracts text from an uploaded file and splits it into overlapping chunks
 * suitable for embedding.
 */
export async function createTextChunks(
  file: Express.Multer.File,
  options: CreateTextChunksOptions = {},
): Promise<string[]> {
  const text = await extractText(file);
  return splitIntoChunks(text, options);
}

async function extractText(file: Express.Multer.File): Promise<string> {
  const mimeType = file.mimetype.toLowerCase();
  const fileName = file.originalname.toLowerCase();

  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    const result = await pdf(file.buffer);
    return normalizeText(result.text);
  }

  if (
    mimeType.startsWith("text/") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md") ||
    fileName.endsWith(".csv")
  ) {
    return normalizeText(file.buffer.toString("utf8"));
  }

  throw AppError.badRequest(
    `Unsupported file type for text extraction: ${file.mimetype || file.originalname}`,
  );
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoChunks(
  text: string,
  options: CreateTextChunksOptions,
): string[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  if (!text) {
    return [];
  }

  if (chunkOverlap >= chunkSize) {
    throw AppError.badRequest("chunkOverlap must be smaller than chunkSize");
  }

  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      const window = text.slice(start, end);
      const breakAt = findBreakIndex(window);
      if (breakAt > 0) {
        end = start + breakAt;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }

    start = Math.max(end - chunkOverlap, start + 1);
  }

  return chunks;
}

/** Prefer breaking on paragraph, then sentence, then whitespace. */
function findBreakIndex(window: string): number {
  const paragraphBreak = window.lastIndexOf("\n\n");
  if (paragraphBreak > window.length * 0.4) {
    return paragraphBreak;
  }

  const sentenceBreak = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("? "),
    window.lastIndexOf("! "),
  );
  if (sentenceBreak > window.length * 0.4) {
    return sentenceBreak + 1;
  }

  const whitespaceBreak = window.lastIndexOf(" ");
  if (whitespaceBreak > window.length * 0.4) {
    return whitespaceBreak;
  }

  return -1;
}

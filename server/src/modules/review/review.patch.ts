const HUNK_HEADER =
  /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/;

/** Collect valid RIGHT-side line numbers present in a unified diff patch. */
export function extractRightSideLines(patch: string): Set<number> {
  const lines = new Set<number>();
  let newLine = 0;

  for (const raw of patch.split("\n")) {
    const header = HUNK_HEADER.exec(raw);
    if (header) {
      newLine = Number(header[3]);
      continue;
    }

    if (!newLine) {
      continue;
    }

    if (raw.startsWith("\\") || raw.startsWith("diff ") || raw.startsWith("index ")) {
      continue;
    }

    if (raw.startsWith("-")) {
      continue;
    }

    if (raw.startsWith("+") || raw.startsWith(" ")) {
      lines.add(newLine);
      newLine += 1;
    }
  }

  return lines;
}

export function pickNearestValidLine(
  preferred: number,
  validLines: Set<number>,
): number | null {
  if (!validLines.size) {
    return null;
  }

  if (validLines.has(preferred)) {
    return preferred;
  }

  let best: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const line of validLines) {
    const distance = Math.abs(line - preferred);
    if (distance < bestDistance) {
      best = line;
      bestDistance = distance;
    }
  }

  return best;
}

export function truncatePatch(patch: string, maxChars: number): string {
  if (patch.length <= maxChars) {
    return patch;
  }
  return `${patch.slice(0, maxChars)}\n…[patch truncated]`;
}

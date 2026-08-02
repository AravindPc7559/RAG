import { MAX_COMMENTS } from "./review.constants.js";

export function buildReviewSystemPrompt(): string {
  return `You are a senior code reviewer for SourceSense.
Review pull request diffs using ONLY the provided knowledge-base context and the diff itself.
Return a JSON array of review comments. Each item must be:
{"path":"relative/file/path","line":<number>,"side":"RIGHT","severity":"info"|"warning"|"important","body":"actionable comment"}

Rules:
- Prefer RIGHT-side line numbers from the new file in the diff.
- Only comment on real issues: correctness, regressions vs prior patterns in the knowledge base, security, missing tests, API contract breaks.
- Do not invent files that are not in the diff.
- Keep bodies concise (1-3 sentences), specific, and professional.
- Return at most ${MAX_COMMENTS} comments.
- If nothing notable, return [].
- Output JSON only, no markdown fences.`;
}

export function buildReviewUserPrompt(input: {
  title: string;
  body: string | null;
  files: Array<{ filename: string; patch: string; context: string }>;
}): string {
  const fileBlocks = input.files
    .map(
      (file) => `
### File: ${file.filename}

Knowledge base context:
${file.context || "(no matching knowledge chunks)"}

Diff:
\`\`\`diff
${file.patch}
\`\`\`
`,
    )
    .join("\n");

  return `PR title: ${input.title}
PR body: ${input.body ?? "(none)"}

${fileBlocks}`;
}

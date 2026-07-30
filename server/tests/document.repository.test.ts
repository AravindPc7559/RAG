import { describe, expect, it } from "vitest";

import {
  cosineSimilarity,
  mergeSearchResults,
} from "../src/modules/document/document.repository.js";

describe("cosineSimilarity", () => {
  it("returns one for vectors pointing in the same direction", () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
  });

  it("returns zero for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("rejects mismatched or empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(-1);
    expect(cosineSimilarity([1], [1, 2])).toBe(-1);
  });
});

describe("mergeSearchResults", () => {
  it("ranks chunks found by both searches above single-source matches", () => {
    const vectorResults = [
      {
        documentId: "document-1",
        chunkIndex: 1,
        text: "Vector-only result",
        score: 0.95,
      },
      {
        documentId: "document-1",
        chunkIndex: 2,
        text: "Result found by both searches",
        score: 0.8,
      },
    ];
    const keywordResults = [
      {
        documentId: "document-1",
        chunkIndex: 2,
        text: "Result found by both searches",
        score: 4.2,
      },
      {
        documentId: "document-1",
        chunkIndex: 3,
        text: "Keyword-only result",
        score: 3.1,
      },
    ];

    const results = mergeSearchResults(
      vectorResults,
      keywordResults,
      3,
    );

    expect(results).toHaveLength(3);
    expect(results[0]?.chunkIndex).toBe(2);
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it("deduplicates chunks and applies the requested limit", () => {
    const result = {
      documentId: "document-1",
      chunkIndex: 1,
      text: "Shared result",
      score: 1,
    };

    expect(mergeSearchResults([result], [result], 1)).toHaveLength(1);
  });
});

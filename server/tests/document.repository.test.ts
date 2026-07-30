import { describe, expect, it } from "vitest";

import { cosineSimilarity } from "../src/modules/document/document.repository.js";

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

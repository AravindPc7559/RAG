import { describe, expect, it } from "vitest";

import {
  extractRightSideLines,
  pickNearestValidLine,
  truncatePatch,
} from "../src/modules/review/review.patch.js";

describe("review.patch", () => {
  it("extracts RIGHT-side lines from a unified diff", () => {
    const patch = [
      "@@ -1,3 +1,4 @@",
      " context",
      "-old",
      "+new",
      " keep",
      "+added",
    ].join("\n");

    const lines = extractRightSideLines(patch);
    expect([...lines].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it("picks the nearest valid line", () => {
    const valid = new Set([10, 20, 30]);
    expect(pickNearestValidLine(19, valid)).toBe(20);
    expect(pickNearestValidLine(20, valid)).toBe(20);
    expect(pickNearestValidLine(1, new Set())).toBeNull();
  });

  it("truncates long patches", () => {
    expect(truncatePatch("short", 100)).toBe("short");
    expect(truncatePatch("abcdefghij", 5)).toContain("…[patch truncated]");
  });
});

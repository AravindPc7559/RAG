import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { countSeverities, normalizeSeverity } from "./review.utils.js";

describe("review.utils severity helpers", () => {
  it("normalizes unknown severities to info", () => {
    assert.equal(normalizeSeverity("critical"), "info");
    assert.equal(normalizeSeverity("warning"), "warning");
    assert.equal(normalizeSeverity("important"), "important");
  });

  it("counts severities for history stats", () => {
    assert.deepEqual(
      countSeverities([
        { severity: "info" },
        { severity: "warning" },
        { severity: "important" },
        { severity: "warning" },
        { severity: "unknown" },
      ]),
      { info: 2, warning: 2, important: 1 },
    );
  });
});

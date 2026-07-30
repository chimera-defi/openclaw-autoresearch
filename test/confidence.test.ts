import { describe, expect, it } from "vitest";
import {
  computeConfidence,
  describeConfidence,
  formatConfidenceLine,
} from "../extensions/openclaw-autoresearch/src/confidence.js";

// ---------------------------------------------------------------------------
// computeConfidence
// ---------------------------------------------------------------------------

describe("computeConfidence", () => {
  it("returns null when fewer than 3 usable runs", () => {
    const runs = [
      { metric: 100, status: "keep" },
      { metric: 90, status: "keep" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null when fewer than 3 usable runs after filtering non-finite", () => {
    const runs = [
      { metric: NaN, status: "keep" },
      { metric: 100, status: "keep" },
      { metric: 90, status: "keep" },
    ];
    // Only 2 finite+positive runs → null
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null when non-positive metrics reduce usable count below 3", () => {
    const runs = [
      { metric: 0, status: "keep" },
      { metric: -10, status: "keep" },
      { metric: 100, status: "keep" },
      { metric: 90, status: "keep" },
    ];
    // Only 2 positive finite runs → null
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null when MAD is zero (all identical values)", () => {
    const runs = [
      { metric: 100, status: "keep" },
      { metric: 100, status: "keep" },
      { metric: 100, status: "keep" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null when no run has status 'keep'", () => {
    const runs = [
      { metric: 100, status: "baseline" },
      { metric: 90, status: "discard" },
      { metric: 80, status: "discard" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null when bestKept equals baseline metric", () => {
    // Three distinct values → MAD = 10 (non-zero), so the zero-MAD guard does NOT fire.
    // The sole "keep" run has the same metric as the baseline → bestKept == baseline → null.
    const runs = [
      { metric: 100, status: "keep" }, // baseline (first finite) AND bestKept
      { metric: 90, status: "discard" },
      { metric: 80, status: "discard" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns positive number for clear improvement in 'lower' direction", () => {
    // baseline=100, bestKept=50 (much lower), distinct values → non-null positive score
    const runs = [
      { metric: 100, status: "baseline" },
      { metric: 95, status: "discard" },
      { metric: 50, status: "keep" },
    ];
    const score = computeConfidence(runs, "lower");
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThan(0);
  });

  it("returns positive number for clear improvement in 'higher' direction", () => {
    const runs = [
      { metric: 50, status: "baseline" },
      { metric: 55, status: "discard" },
      { metric: 100, status: "keep" },
    ];
    const score = computeConfidence(runs, "higher");
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThan(0);
  });

  it("selects the best (lowest) keep run in 'lower' direction — more extreme = higher score", () => {
    // Both datasets share the same usable values so MAD is identical;
    // only bestKept differs: 50 (extreme) vs 80 (mild).
    // score = abs(bestKept - baseline) / MAD → extreme run scores higher.
    const runsExtreme = [
      { metric: 100, status: "baseline" },
      { metric: 90, status: "discard" },
      { metric: 80, status: "discard" },
      { metric: 50, status: "keep" }, // extreme improvement
    ];
    const runsMild = [
      { metric: 100, status: "baseline" },
      { metric: 90, status: "discard" },
      { metric: 80, status: "keep" }, // mild improvement
      { metric: 50, status: "discard" },
    ];
    const scoreExtreme = computeConfidence(runsExtreme, "lower")!;
    const scoreMild = computeConfidence(runsMild, "lower")!;
    expect(scoreExtreme).toBeGreaterThan(scoreMild);
  });

  it("selects the best (highest) keep run in 'higher' direction — more extreme = higher score", () => {
    const runsExtreme = [
      { metric: 50, status: "baseline" },
      { metric: 60, status: "discard" },
      { metric: 70, status: "discard" },
      { metric: 100, status: "keep" }, // extreme improvement
    ];
    const runsMild = [
      { metric: 50, status: "baseline" },
      { metric: 60, status: "keep" }, // mild improvement
      { metric: 70, status: "discard" },
      { metric: 100, status: "discard" },
    ];
    const scoreExtreme = computeConfidence(runsExtreme, "higher")!;
    const scoreMild = computeConfidence(runsMild, "higher")!;
    expect(scoreExtreme).toBeGreaterThan(scoreMild);
  });

  it("returns a finite number when conditions are met", () => {
    const runs = [
      { metric: 100, status: "baseline" },
      { metric: 90, status: "discard" },
      { metric: 60, status: "keep" },
    ];
    const score = computeConfidence(runs, "lower");
    expect(score).not.toBeNull();
    expect(Number.isFinite(score)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// describeConfidence
// ---------------------------------------------------------------------------

describe("describeConfidence", () => {
  it("describes confidence >= 2.0 as likely real", () => {
    const result = describeConfidence(2.0);
    expect(result).toContain("improvement is likely real");
  });

  it("describes confidence > 2.0 as likely real", () => {
    const result = describeConfidence(5.5);
    expect(result).toContain("improvement is likely real");
  });

  it("describes confidence >= 1.0 and < 2.0 as marginal", () => {
    expect(describeConfidence(1.0)).toContain("above noise but marginal");
    expect(describeConfidence(1.9)).toContain("above noise but marginal");
  });

  it("describes confidence < 1.0 as within noise", () => {
    expect(describeConfidence(0.9)).toContain("within noise");
    expect(describeConfidence(0.0)).toContain("within noise");
  });

  it("includes rendered value in output", () => {
    const result = describeConfidence(1.55);
    expect(result).toContain("1.6"); // toFixed(1) rounds
  });
});

// ---------------------------------------------------------------------------
// formatConfidenceLine
// ---------------------------------------------------------------------------

describe("formatConfidenceLine", () => {
  it("returns label: n/a for null confidence", () => {
    expect(formatConfidenceLine(null)).toBe("Confidence: n/a");
  });

  it("uses custom label with null", () => {
    expect(formatConfidenceLine(null, "Score")).toBe("Score: n/a");
  });

  it("includes label and value for non-null confidence", () => {
    const result = formatConfidenceLine(2.5);
    expect(result).toContain("Confidence:");
    expect(result).toContain("improvement is likely real");
  });

  it("uses custom label with non-null confidence", () => {
    const result = formatConfidenceLine(0.5, "Rating");
    expect(result).toContain("Rating:");
    expect(result).toContain("within noise");
  });
});

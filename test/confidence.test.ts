import { describe, expect, it } from "vitest";
import {
  computeConfidence,
  describeConfidence,
  formatConfidenceLine,
} from "../extensions/openclaw-autoresearch/src/confidence.js";

// ── computeConfidence ────────────────────────────────────────────────────────

describe("computeConfidence", () => {
  it("returns null when fewer than 3 usable runs", () => {
    const runs = [
      { metric: 10, status: "keep" },
      { metric: 20, status: "keep" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null when all runs have non-finite metrics", () => {
    const runs = [
      { metric: NaN, status: "keep" },
      { metric: Infinity, status: "keep" },
      { metric: -Infinity, status: "keep" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null when all runs have zero or negative metrics", () => {
    const runs = [
      { metric: 0, status: "keep" },
      { metric: -1, status: "keep" },
      { metric: -5, status: "keep" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null when no run has status 'keep'", () => {
    const runs = [
      { metric: 10, status: "drop" },
      { metric: 20, status: "drop" },
      { metric: 30, status: "drop" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null when MAD is zero (all values identical)", () => {
    const runs = [
      { metric: 10, status: "drop" },
      { metric: 10, status: "keep" },
      { metric: 10, status: "keep" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null when bestKept equals baseline metric", () => {
    const runs = [
      { metric: 10, status: "drop" },
      { metric: 20, status: "keep" },
      { metric: 30, status: "keep" },
    ];
    // Need nonzero MAD so the equality guard is what triggers null, not MAD=0.
    // values=[10,10,20,30] → median=15, deviations=[5,5,5,15], MAD=5 (nonzero).
    // bestKept for "lower" = min(10,20) = 10 = baseline.metric → null.
    const runs2 = [
      { metric: 10, status: "drop" },
      { metric: 10, status: "keep" },
      { metric: 20, status: "keep" },
      { metric: 30, status: "drop" },
    ];
    expect(computeConfidence(runs2, "lower")).toBeNull();
  });

  it("computes confidence for lower-is-better direction", () => {
    const runs = [
      { metric: 100, status: "drop" },
      { metric: 80, status: "keep" },
      { metric: 90, status: "drop" },
      { metric: 85, status: "keep" },
    ];
    const result = computeConfidence(runs, "lower");
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
  });

  it("computes confidence for higher-is-better direction", () => {
    const runs = [
      { metric: 50, status: "drop" },
      { metric: 70, status: "keep" },
      { metric: 60, status: "drop" },
      { metric: 75, status: "keep" },
    ];
    const result = computeConfidence(runs, "higher");
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
  });

  it("selects the best kept run for lower direction", () => {
    // values=[100,60,70,80], median=75, sorted deviations=[5,5,15,25], MAD=10, bestKept=60, baseline=100
    // score = |60-100|/10 = 4.0
    const runs = [
      { metric: 100, status: "drop" },
      { metric: 60, status: "keep" },
      { metric: 70, status: "keep" },
      { metric: 80, status: "keep" },
    ];
    const resultLower = computeConfidence(runs, "lower");
    expect(resultLower).toBeCloseTo(4.0, 6);
  });

  it("selects the best kept run for higher direction", () => {
    // values=[50,60,70,80], median=65, MAD=10, bestKept=80, baseline=50
    // score = |80-50|/10 = 3.0
    const runs = [
      { metric: 50, status: "drop" },
      { metric: 60, status: "keep" },
      { metric: 70, status: "keep" },
      { metric: 80, status: "keep" },
    ];
    const resultHigher = computeConfidence(runs, "higher");
    expect(resultHigher).toBeCloseTo(3.0, 6);
  });
});

// ── describeConfidence ───────────────────────────────────────────────────────

describe("describeConfidence", () => {
  it("describes confidence >= 2.0 as 'improvement is likely real'", () => {
    const result = describeConfidence(2.5);
    expect(result).toContain("improvement is likely real");
    expect(result).toContain("2.5");
  });

  it("describes exactly 2.0 as 'improvement is likely real'", () => {
    const result = describeConfidence(2.0);
    expect(result).toContain("improvement is likely real");
  });

  it("describes confidence >= 1.0 and < 2.0 as 'above noise but marginal'", () => {
    const result = describeConfidence(1.5);
    expect(result).toContain("above noise but marginal");
    expect(result).toContain("1.5");
  });

  it("describes confidence < 1.0 as 'within noise'", () => {
    const result = describeConfidence(0.5);
    expect(result).toContain("within noise");
    expect(result).toContain("0.5");
  });

  it("formats confidence to 1 decimal place", () => {
    const result = describeConfidence(1.23456);
    expect(result).toContain("1.2");
  });
});

// ── formatConfidenceLine ─────────────────────────────────────────────────────

describe("formatConfidenceLine", () => {
  it("returns 'Confidence: n/a' when confidence is null", () => {
    expect(formatConfidenceLine(null)).toBe("Confidence: n/a");
  });

  it("uses custom label when provided", () => {
    expect(formatConfidenceLine(null, "Score")).toBe("Score: n/a");
  });

  it("includes confidence description when confidence is non-null", () => {
    const result = formatConfidenceLine(2.5);
    expect(result).toContain("Confidence:");
    expect(result).toContain("improvement is likely real");
  });

  it("uses custom label with non-null confidence", () => {
    const result = formatConfidenceLine(0.5, "My Metric");
    expect(result).toContain("My Metric:");
    expect(result).toContain("within noise");
  });
});

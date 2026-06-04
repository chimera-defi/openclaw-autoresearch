import { describe, expect, it } from "vitest";
import {
  computeConfidence,
  describeConfidence,
  formatConfidenceLine,
} from "../extensions/openclaw-autoresearch/src/confidence.js";
import { parseMetricLines } from "../extensions/openclaw-autoresearch/src/metrics.js";

// ---------------------------------------------------------------------------
// computeConfidence
// ---------------------------------------------------------------------------

describe("computeConfidence", () => {
  it("returns null when fewer than 3 usable runs", () => {
    expect(computeConfidence([], "lower")).toBeNull();
    expect(computeConfidence([{ metric: 10, status: "keep" }], "lower")).toBeNull();
    expect(
      computeConfidence(
        [
          { metric: 10, status: "keep" },
          { metric: 8, status: "keep" },
        ],
        "lower",
      ),
    ).toBeNull();
  });

  it("returns null when MAD is zero (all identical values)", () => {
    const runs = [
      { metric: 10, status: "keep" },
      { metric: 10, status: "keep" },
      { metric: 10, status: "keep" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null when no run has status 'keep'", () => {
    const runs = [
      { metric: 10, status: "discard" },
      { metric: 8, status: "discard" },
      { metric: 6, status: "discard" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("returns null for 'lower' when best-kept equals baseline", () => {
    const runs = [
      { metric: 10, status: "baseline" },
      { metric: 10, status: "keep" }, // bestKept === baseline.metric
      { metric: 8, status: "discard" },
    ];
    expect(computeConfidence(runs, "lower")).toBeNull();
  });

  it("computes a positive confidence score for 'lower' direction improvement", () => {
    // baseline = 10 (first finite), keep runs have lower values
    const runs = [
      { metric: 10, status: "baseline" },
      { metric: 8, status: "keep" },
      { metric: 9, status: "keep" },
    ];
    const confidence = computeConfidence(runs, "lower");
    expect(confidence).not.toBeNull();
    expect(confidence!).toBeGreaterThan(0);
  });

  it("computes a positive confidence score for 'higher' direction improvement", () => {
    const runs = [
      { metric: 5, status: "baseline" },
      { metric: 9, status: "keep" },
      { metric: 8, status: "keep" },
    ];
    const confidence = computeConfidence(runs, "higher");
    expect(confidence).not.toBeNull();
    expect(confidence!).toBeGreaterThan(0);
  });

  it("filters out non-finite and non-positive metrics", () => {
    const runs = [
      { metric: NaN, status: "keep" },
      { metric: Infinity, status: "keep" },
      { metric: -1, status: "keep" }, // non-positive
    ];
    // All filtered out → fewer than 3 usable → null
    expect(computeConfidence(runs, "lower")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// describeConfidence / formatConfidenceLine
// ---------------------------------------------------------------------------

describe("describeConfidence", () => {
  it("labels high confidence (>= 2.0) as likely real", () => {
    expect(describeConfidence(2.0)).toContain("improvement is likely real");
    expect(describeConfidence(3.5)).toContain("improvement is likely real");
  });

  it("labels moderate confidence (1.0 – 1.9) as above noise but marginal", () => {
    expect(describeConfidence(1.0)).toContain("above noise but marginal");
    expect(describeConfidence(1.9)).toContain("above noise but marginal");
  });

  it("labels low confidence (< 1.0) as within noise", () => {
    expect(describeConfidence(0.5)).toContain("within noise");
    expect(describeConfidence(0.0)).toContain("within noise");
  });

  it("includes the numeric value formatted to 1 decimal place", () => {
    expect(describeConfidence(2.123)).toContain("2.1x");
    expect(describeConfidence(1.567)).toContain("1.6x");
  });
});

describe("formatConfidenceLine", () => {
  it("returns 'n/a' for null confidence", () => {
    expect(formatConfidenceLine(null)).toBe("Confidence: n/a");
  });

  it("uses custom label", () => {
    expect(formatConfidenceLine(null, "Score")).toBe("Score: n/a");
  });

  it("includes description for non-null confidence", () => {
    const line = formatConfidenceLine(2.5);
    expect(line).toMatch(/^Confidence: /);
    expect(line).toContain("likely real");
  });
});

// ---------------------------------------------------------------------------
// parseMetricLines
// ---------------------------------------------------------------------------

describe("parseMetricLines", () => {
  it("parses a single METRIC line", () => {
    expect(parseMetricLines("METRIC latency_ms = 42.5")).toEqual({
      latency_ms: 42.5,
    });
  });

  it("parses multiple METRIC lines", () => {
    const output = ["METRIC tokens = 1000", "METRIC cost = 0.03"].join("\n");
    expect(parseMetricLines(output)).toEqual({ tokens: 1000, cost: 0.03 });
  });

  it("ignores lines that are not METRIC declarations", () => {
    const output = ["INFO: starting run", "METRIC score = 99", "Done."].join("\n");
    expect(parseMetricLines(output)).toEqual({ score: 99 });
  });

  it("handles negative values", () => {
    expect(parseMetricLines("METRIC delta = -5.2")).toEqual({ delta: -5.2 });
  });

  it("handles scientific notation", () => {
    expect(parseMetricLines("METRIC epsilon = 1.5e-3")).toEqual({ epsilon: 0.0015 });
  });

  it("handles Windows-style line endings (CRLF)", () => {
    expect(parseMetricLines("METRIC a = 1\r\nMETRIC b = 2")).toEqual({ a: 1, b: 2 });
  });

  it("returns empty object for empty string", () => {
    expect(parseMetricLines("")).toEqual({});
  });

  it("returns empty object when no METRIC lines present", () => {
    expect(parseMetricLines("hello\nworld")).toEqual({});
  });

  it("accepts metric names with dots, hyphens, and µ", () => {
    const output = [
      "METRIC compile.time = 120",
      "METRIC p50-latency = 55",
      "METRIC mem.µs = 300",
    ].join("\n");
    const result = parseMetricLines(output);
    expect(result["compile.time"]).toBe(120);
    expect(result["p50-latency"]).toBe(55);
    expect(result["mem.µs"]).toBe(300);
  });
});

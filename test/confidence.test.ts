import { describe, expect, it } from "vitest";
import {
  computeConfidence,
  describeConfidence,
  formatConfidenceLine,
} from "../extensions/openclaw-autoresearch/src/confidence.js";

// Helper: three runs where baseline=100, two "keep" runs at 90 and 95 (lower is better)
// values=[100,90,95] sorted=[90,95,100] median=95
// deviations=[5,5,0] sorted=[0,5,5] MAD=5
// bestKept(lower)=90 → |90-100|/5 = 2.0
// bestKept(higher)=95 → |95-100|/5 = 1.0
const THREE_RUNS = [
  { metric: 100, status: "baseline" },
  { metric: 90, status: "keep" },
  { metric: 95, status: "keep" },
];

describe("computeConfidence", () => {
  describe("null guards", () => {
    it("returns null when fewer than 3 usable runs", () => {
      expect(computeConfidence([THREE_RUNS[0], THREE_RUNS[1]], "lower")).toBeNull();
    });

    it("returns null when exactly 2 runs provided", () => {
      expect(computeConfidence(THREE_RUNS.slice(0, 2), "lower")).toBeNull();
    });

    it("returns null when runs array is empty", () => {
      expect(computeConfidence([], "lower")).toBeNull();
    });

    it("returns null when no runs have finite positive metrics", () => {
      const runs = [
        { metric: 0, status: "keep" },
        { metric: -1, status: "keep" },
        { metric: NaN, status: "keep" },
      ];
      expect(computeConfidence(runs, "lower")).toBeNull();
    });

    it("returns null when no runs have status 'keep'", () => {
      const runs = [
        { metric: 100, status: "baseline" },
        { metric: 90, status: "rejected" },
        { metric: 95, status: "pending" },
      ];
      expect(computeConfidence(runs, "lower")).toBeNull();
    });

    it("returns null when all usable metrics are identical (MAD = 0)", () => {
      const runs = [
        { metric: 100, status: "baseline" },
        { metric: 100, status: "keep" },
        { metric: 100, status: "keep" },
      ];
      expect(computeConfidence(runs, "lower")).toBeNull();
    });

    it("returns null when bestKept equals baseline metric", () => {
      const runs = [
        { metric: 100, status: "baseline" },
        { metric: 90, status: "rejected" },
        { metric: 100, status: "keep" }, // keep equals baseline
      ];
      // MAD is non-zero but bestKept === baseline.metric → null
      expect(computeConfidence(runs, "lower")).toBeNull();
    });
  });

  describe("direction: lower", () => {
    it("returns 2.0 for the canonical fixture (lower is better)", () => {
      const result = computeConfidence(THREE_RUNS, "lower");
      expect(result).not.toBeNull();
      expect(result!).toBeCloseTo(2.0, 5);
    });

    it("picks the lowest keep metric as bestKept", () => {
      const runs = [
        { metric: 100, status: "baseline" },
        { metric: 80, status: "keep" },  // best for lower
        { metric: 90, status: "keep" },
      ];
      // values=[100,80,90] sorted=[80,90,100] median=90
      // deviations=[10,10,0] sorted=[0,10,10] MAD=10
      // bestKept(lower)=80 → |80-100|/10 = 2.0
      const result = computeConfidence(runs, "lower");
      expect(result!).toBeCloseTo(2.0, 5);
    });
  });

  describe("direction: higher", () => {
    it("returns 1.0 for the canonical fixture (higher is better)", () => {
      const result = computeConfidence(THREE_RUNS, "higher");
      expect(result).not.toBeNull();
      expect(result!).toBeCloseTo(1.0, 5);
    });

    it("picks the highest keep metric as bestKept", () => {
      const runs = [
        { metric: 100, status: "baseline" },
        { metric: 130, status: "keep" },  // best for higher
        { metric: 115, status: "keep" },
      ];
      // values=[100,130,115] sorted=[100,115,130] median=115
      // deviations=[15,15,0] sorted=[0,15,15] MAD=15
      // bestKept(higher)=130 → |130-100|/15 = 2.0
      const result = computeConfidence(runs, "higher");
      expect(result!).toBeCloseTo(2.0, 5);
    });
  });

  describe("metric filtering", () => {
    it("ignores runs with non-finite metrics when counting usable runs", () => {
      const runs = [
        { metric: 100, status: "baseline" },
        { metric: Infinity, status: "keep" },
        { metric: NaN, status: "keep" },
      ];
      // only 1 usable run → null
      expect(computeConfidence(runs, "lower")).toBeNull();
    });
  });
});

describe("describeConfidence", () => {
  it("returns 'likely real' for confidence >= 2.0", () => {
    expect(describeConfidence(2.0)).toContain("likely real");
    expect(describeConfidence(3.5)).toContain("likely real");
  });

  it("returns 'above noise but marginal' for 1.0 <= confidence < 2.0", () => {
    expect(describeConfidence(1.0)).toContain("above noise but marginal");
    expect(describeConfidence(1.9)).toContain("above noise but marginal");
  });

  it("returns 'within noise' for confidence < 1.0", () => {
    expect(describeConfidence(0.5)).toContain("within noise");
    expect(describeConfidence(0.0)).toContain("within noise");
  });

  it("renders confidence to one decimal place", () => {
    expect(describeConfidence(2.567)).toContain("2.6");
    expect(describeConfidence(1.234)).toContain("1.2");
  });
});

describe("formatConfidenceLine", () => {
  it("returns '<label>: n/a' for null confidence", () => {
    expect(formatConfidenceLine(null)).toBe("Confidence: n/a");
  });

  it("uses custom label when provided", () => {
    expect(formatConfidenceLine(null, "Score")).toBe("Score: n/a");
  });

  it("returns a non-n/a string for a numeric confidence", () => {
    const result = formatConfidenceLine(2.0);
    expect(result).not.toContain("n/a");
    expect(result).toContain("Confidence:");
  });

  it("delegates description to describeConfidence", () => {
    expect(formatConfidenceLine(2.5)).toContain("likely real");
    expect(formatConfidenceLine(0.3)).toContain("within noise");
  });
});

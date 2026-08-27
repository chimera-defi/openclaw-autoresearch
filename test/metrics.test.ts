import { describe, expect, it } from "vitest";
import { parseMetricLines } from "../extensions/openclaw-autoresearch/src/metrics.js";

describe("parseMetricLines", () => {
  it("returns empty object for empty string", () => {
    expect(parseMetricLines("")).toEqual({});
  });

  it("parses a single integer metric line", () => {
    expect(parseMetricLines("METRIC latency_ms = 42")).toEqual({ latency_ms: 42 });
  });

  it("parses a floating-point metric value", () => {
    const result = parseMetricLines("METRIC score = 0.875");
    expect(result["score"]).toBeCloseTo(0.875);
  });

  it("parses multiple metric lines", () => {
    const output = "METRIC a = 1\nMETRIC b = 2\nMETRIC c = 3";
    expect(parseMetricLines(output)).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("ignores lines that are not METRIC lines", () => {
    const output = "some log line\nMETRIC x = 10\nanother line";
    expect(parseMetricLines(output)).toEqual({ x: 10 });
  });

  it("ignores lines with no value", () => {
    expect(parseMetricLines("METRIC foo =")).toEqual({});
  });

  it("parses negative values", () => {
    expect(parseMetricLines("METRIC delta = -5")).toEqual({ delta: -5 });
  });

  it("parses scientific notation values", () => {
    const result = parseMetricLines("METRIC tiny = 1.5e-3");
    expect(result["tiny"]).toBeCloseTo(0.0015);
  });

  it("handles Windows line endings (CRLF)", () => {
    const output = "METRIC p = 7\r\nMETRIC q = 8\r\n";
    expect(parseMetricLines(output)).toEqual({ p: 7, q: 8 });
  });

  it("trims whitespace around metric lines", () => {
    expect(parseMetricLines("  METRIC spaced = 99  ")).toEqual({ spaced: 99 });
  });

  it("accepts metric names with dots and hyphens", () => {
    expect(parseMetricLines("METRIC tokens.saved = 500")).toEqual({ "tokens.saved": 500 });
    expect(parseMetricLines("METRIC latency-p99 = 120")).toEqual({ "latency-p99": 120 });
  });

  it("ignores lines where value is not a finite number", () => {
    // NaN would not pass isFinite
    expect(parseMetricLines("METRIC bad = NaN")).toEqual({});
  });

  it("last occurrence wins when metric name is duplicated", () => {
    const output = "METRIC x = 1\nMETRIC x = 2";
    expect(parseMetricLines(output)).toEqual({ x: 2 });
  });
});

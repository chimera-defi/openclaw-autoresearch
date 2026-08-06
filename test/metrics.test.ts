import { describe, expect, it } from "vitest";
import { parseMetricLines } from "../extensions/openclaw-autoresearch/src/metrics.js";

describe("parseMetricLines", () => {
  it("returns empty object for empty string", () => {
    expect(parseMetricLines("")).toEqual({});
  });

  it("parses a single METRIC line", () => {
    expect(parseMetricLines("METRIC latency_ms = 42")).toEqual({ latency_ms: 42 });
  });

  it("parses a float value", () => {
    expect(parseMetricLines("METRIC score = 0.95")).toEqual({ score: 0.95 });
  });

  it("parses a negative value", () => {
    expect(parseMetricLines("METRIC delta = -3.14")).toEqual({ delta: -3.14 });
  });

  it("parses scientific notation", () => {
    const result = parseMetricLines("METRIC tiny = 1e-6");
    expect(result.tiny).toBeCloseTo(1e-6);
  });

  it("parses multiple METRIC lines", () => {
    const output = [
      "METRIC compile_ms = 120",
      "METRIC bundle_kb = 44.5",
      "METRIC errors = 0",
    ].join("\n");
    expect(parseMetricLines(output)).toEqual({
      compile_ms: 120,
      bundle_kb: 44.5,
      errors: 0,
    });
  });

  it("ignores non-METRIC lines", () => {
    const output = "Building...\nMETRIC latency_ms = 10\nDone.";
    expect(parseMetricLines(output)).toEqual({ latency_ms: 10 });
  });

  it("handles Windows-style CRLF line endings", () => {
    expect(parseMetricLines("METRIC ms = 5\r\nMETRIC kb = 100")).toEqual({ ms: 5, kb: 100 });
  });

  it("ignores lines with only METRIC keyword but no value", () => {
    expect(parseMetricLines("METRIC")).toEqual({});
  });

  it("ignores lines with invalid numeric value (NaN literal)", () => {
    expect(parseMetricLines("METRIC bad = NaN")).toEqual({});
  });

  it("ignores lines with non-numeric value", () => {
    expect(parseMetricLines("METRIC label = abc")).toEqual({});
  });

  it("parses metric name with dots and dashes", () => {
    expect(parseMetricLines("METRIC p99.latency-ms = 200")).toEqual({ "p99.latency-ms": 200 });
  });

  it("parses metric name with mu (µ) character", () => {
    expect(parseMetricLines("METRIC throughput_µs = 50")).toEqual({ "throughput_µs": 50 });
  });

  it("trims surrounding whitespace on lines", () => {
    expect(parseMetricLines("  METRIC score = 1  ")).toEqual({ score: 1 });
  });

  it("last write wins when name appears twice", () => {
    const output = "METRIC score = 1\nMETRIC score = 2";
    expect(parseMetricLines(output)).toEqual({ score: 2 });
  });

  it("parses zero value", () => {
    expect(parseMetricLines("METRIC misses = 0")).toEqual({ misses: 0 });
  });

  it("ignores extra whitespace around equals sign", () => {
    expect(parseMetricLines("METRIC x   =   7")).toEqual({ x: 7 });
  });
});

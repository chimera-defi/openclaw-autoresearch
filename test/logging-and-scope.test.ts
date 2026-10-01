/**
 * Tests for createConfigHeader (logging.ts) and resolveAutoresearchScope (scope.ts).
 * Both are pure / side-effect-free with respect to the filesystem.
 */
import { describe, it, expect } from "vitest";
import { createConfigHeader } from "../extensions/openclaw-autoresearch/src/logging.js";
import { resolveAutoresearchScope } from "../extensions/openclaw-autoresearch/src/scope.js";
import path from "node:path";

// ---------------------------------------------------------------------------
// createConfigHeader
// ---------------------------------------------------------------------------

describe("createConfigHeader", () => {
  it("sets type to 'config'", () => {
    const header = createConfigHeader({
      name: "bench",
      metricName: "latency_ms",
      metricUnit: "ms",
      bestDirection: "lower",
    });
    expect(header.type).toBe("config");
  });

  it("preserves all supplied fields verbatim", () => {
    const header = createConfigHeader({
      name: "my-experiment",
      metricName: "throughput",
      metricUnit: "req/s",
      bestDirection: "higher",
    });
    expect(header.name).toBe("my-experiment");
    expect(header.metricName).toBe("throughput");
    expect(header.metricUnit).toBe("req/s");
    expect(header.bestDirection).toBe("higher");
  });

  it("returns a plain object with exactly five keys", () => {
    const header = createConfigHeader({
      name: "x",
      metricName: "y",
      metricUnit: "z",
      bestDirection: "lower",
    });
    expect(Object.keys(header).sort()).toEqual(
      ["bestDirection", "metricName", "metricUnit", "name", "type"].sort()
    );
  });

  it("accepts 'lower' and 'higher' as bestDirection without type error", () => {
    const h1 = createConfigHeader({ name: "a", metricName: "m", metricUnit: "u", bestDirection: "lower" });
    const h2 = createConfigHeader({ name: "b", metricName: "m", metricUnit: "u", bestDirection: "higher" });
    expect(h1.bestDirection).toBe("lower");
    expect(h2.bestDirection).toBe("higher");
  });

  it("returns a new object on each call", () => {
    const cfg = { name: "n", metricName: "m", metricUnit: "u", bestDirection: "lower" as const };
    const a = createConfigHeader(cfg);
    const b = createConfigHeader(cfg);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// resolveAutoresearchScope — string ref path (pure, no global side-effects)
// ---------------------------------------------------------------------------

describe("resolveAutoresearchScope with a string ref", () => {
  it("resolves a string to a repoDir and sets hasExplicitRepoDir true", () => {
    const result = resolveAutoresearchScope("/some/repo");
    expect(result.repoDir).toBe(path.resolve("/some/repo"));
    expect(result.hasExplicitRepoDir).toBe(true);
  });

  it("returns null for session fields when only a directory string is given", () => {
    const result = resolveAutoresearchScope("/workspace/project");
    expect(result.sessionKey).toBeNull();
    expect(result.sessionId).toBeNull();
    expect(result.sessionToken).toBeNull();
    expect(result.runId).toBeNull();
    expect(result.workspaceDir).toBeNull();
  });

  it("resolves a relative path to an absolute path", () => {
    const result = resolveAutoresearchScope("relative/dir");
    expect(path.isAbsolute(result.repoDir!)).toBe(true);
  });

  it("returns null repoDir for an empty or whitespace-only string", () => {
    const r1 = resolveAutoresearchScope("   ");
    expect(r1.repoDir).toBeNull();
    expect(r1.hasExplicitRepoDir).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveAutoresearchScope — object ref with repoDir
// ---------------------------------------------------------------------------

describe("resolveAutoresearchScope with an object ref", () => {
  it("resolves explicit repoDir from an object ref", () => {
    const result = resolveAutoresearchScope({ repoDir: "/explicit/repo" });
    expect(result.repoDir).toBe(path.resolve("/explicit/repo"));
    expect(result.hasExplicitRepoDir).toBe(true);
  });

  it("falls back to workspaceDir when repoDir is absent", () => {
    const result = resolveAutoresearchScope({ workspaceDir: "/ws", sessionKey: "sk-test-fallback" });
    expect(result.repoDir).toBe(path.resolve("/ws"));
    expect(result.hasExplicitRepoDir).toBe(false);
  });

  it("sessionToken is sessionId when sessionId is present", () => {
    const result = resolveAutoresearchScope({ sessionId: "sid-abc", sessionKey: "sk-xyz" });
    expect(result.sessionToken).toBe("sid-abc");
  });

  it("sessionToken falls back to sessionKey when sessionId is absent", () => {
    const result = resolveAutoresearchScope({ sessionKey: "sk-only-fallback2" });
    expect(result.sessionToken).toBe("sk-only-fallback2");
  });

  it("returns all nulls for an empty object ref", () => {
    const result = resolveAutoresearchScope({});
    expect(result.sessionKey).toBeNull();
    expect(result.sessionId).toBeNull();
    expect(result.repoDir).toBeNull();
    expect(result.runId).toBeNull();
  });
});

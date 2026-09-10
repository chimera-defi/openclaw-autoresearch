import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  resolveAutoresearchScope,
  forgetAutoresearchScope,
} from "../extensions/openclaw-autoresearch/src/scope.js";

// Each test uses unique key/ID values to avoid cross-test state interference
// (scope.ts maintains module-level memoisation maps that persist across tests).

describe("resolveAutoresearchScope", () => {
  it("resolves a plain string as repoDir", () => {
    const result = resolveAutoresearchScope("/home/user/myrepo");
    expect(result.repoDir).toBe(path.resolve("/home/user/myrepo"));
    expect(result.sessionKey).toBeNull();
    expect(result.sessionId).toBeNull();
    expect(result.workspaceDir).toBeNull();
    expect(result.runId).toBeNull();
    expect(result.hasExplicitRepoDir).toBe(true);
  });

  it("resolves whitespace-only string as null repoDir", () => {
    const result = resolveAutoresearchScope("   ");
    expect(result.repoDir).toBeNull();
    expect(result.hasExplicitRepoDir).toBe(false);
  });

  it("resolves undefined ref to all-null scope", () => {
    const result = resolveAutoresearchScope(undefined);
    expect(result.sessionKey).toBeNull();
    expect(result.sessionId).toBeNull();
    expect(result.sessionToken).toBeNull();
    expect(result.workspaceDir).toBeNull();
    expect(result.repoDir).toBeNull();
    expect(result.runId).toBeNull();
    expect(result.hasExplicitRepoDir).toBe(false);
  });

  it("extracts sessionKey and sessionId from object ref", () => {
    const result = resolveAutoresearchScope({
      sessionKey: "key-t1-abc",
      sessionId: "id-t1-xyz",
    });
    expect(result.sessionKey).toBe("key-t1-abc");
    expect(result.sessionId).toBe("id-t1-xyz");
    expect(result.sessionToken).toBe("id-t1-xyz");
  });

  it("uses sessionKey as sessionToken when sessionId is absent", () => {
    const result = resolveAutoresearchScope({ sessionKey: "key-t2-only" });
    expect(result.sessionToken).toBe("key-t2-only");
  });

  it("resolves workspaceDir from workspaceDir field", () => {
    const result = resolveAutoresearchScope({ workspaceDir: "/home/user/ws-t3" });
    expect(result.workspaceDir).toBe(path.resolve("/home/user/ws-t3"));
    expect(result.repoDir).toBe(path.resolve("/home/user/ws-t3"));
  });

  it("resolves workspaceDir from legacyCwd field", () => {
    const result = resolveAutoresearchScope({ legacyCwd: "/home/user/cwd-t4" });
    expect(result.workspaceDir).toBe(path.resolve("/home/user/cwd-t4"));
  });

  it("explicit repoDir overrides workspace-derived repoDir", () => {
    const result = resolveAutoresearchScope({
      workspaceDir: "/home/user/ws-t5",
      repoDir: "/home/user/repo-t5",
    });
    expect(result.repoDir).toBe(path.resolve("/home/user/repo-t5"));
    expect(result.hasExplicitRepoDir).toBe(true);
    expect(result.workspaceDir).toBe(path.resolve("/home/user/ws-t5"));
  });

  it("trims whitespace from string fields", () => {
    const result = resolveAutoresearchScope({ sessionKey: "  key-t6  ", runId: "  r1-t6  " });
    expect(result.sessionKey).toBe("key-t6");
    expect(result.runId).toBe("r1-t6");
  });

  it("drops non-string values for text fields", () => {
    const result = resolveAutoresearchScope({
      sessionKey: 42 as unknown as string,
      runId: null as unknown as string,
    });
    expect(result.sessionKey).toBeNull();
    expect(result.runId).toBeNull();
  });

  it("memoises sessionId by sessionKey across calls", () => {
    resolveAutoresearchScope({ sessionKey: "sk-memo1", sessionId: "sid-memo1" });
    const second = resolveAutoresearchScope({ sessionKey: "sk-memo1" });
    expect(second.sessionId).toBe("sid-memo1");
  });

  it("memoises workspace by runId across calls", () => {
    resolveAutoresearchScope({ runId: "run-memo2", workspaceDir: "/ws/alpha-t7" });
    const second = resolveAutoresearchScope({ runId: "run-memo2" });
    expect(second.workspaceDir).toBe(path.resolve("/ws/alpha-t7"));
  });
});

describe("forgetAutoresearchScope", () => {
  it("returns the resolved scope before forgetting", () => {
    resolveAutoresearchScope({
      sessionKey: "sk-forget1",
      sessionId: "sid-forget1",
      workspaceDir: "/ws-forget1",
    });
    const forgotten = forgetAutoresearchScope({
      sessionKey: "sk-forget1",
      sessionId: "sid-forget1",
    });
    expect(forgotten.sessionKey).toBe("sk-forget1");
    expect(forgotten.sessionId).toBe("sid-forget1");
  });

  it("clears workspace memoised by runId after forget", () => {
    resolveAutoresearchScope({ runId: "r-forget2", workspaceDir: "/ws/beta-f2" });
    forgetAutoresearchScope({ runId: "r-forget2", workspaceDir: "/ws/beta-f2" });
    const after = resolveAutoresearchScope({ runId: "r-forget2" });
    expect(after.workspaceDir).toBeNull();
  });

  it("clears sessionId memoised by sessionKey after forget", () => {
    resolveAutoresearchScope({ sessionKey: "sk-forget3", sessionId: "sid-forget3" });
    forgetAutoresearchScope({ sessionKey: "sk-forget3", sessionId: "sid-forget3" });
    const after = resolveAutoresearchScope({ sessionKey: "sk-forget3" });
    expect(after.sessionId).toBeNull();
  });

  it("returns null sessionId after forget when key had no explicit sessionId in ref", () => {
    resolveAutoresearchScope({ sessionKey: "sk-forget4", sessionId: "sid-forget4" });
    forgetAutoresearchScope({ sessionKey: "sk-forget4", sessionId: "sid-forget4" });
    // After forget, looking up by key alone returns null sessionId
    const after = resolveAutoresearchScope({ sessionKey: "sk-forget4" });
    expect(after.sessionId).toBeNull();
  });
});

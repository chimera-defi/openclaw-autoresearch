import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  resolveAutoresearchScope,
  forgetAutoresearchScope,
} from "../extensions/openclaw-autoresearch/src/scope.js";

// Each test uses unique key/ID values to avoid cross-test state interference
// (scope.ts maintains module-level memoisation maps that persist across tests).

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
    forgetAutoresearchScope({ sessionKey: "sk-forget4" });
    // After forget with key-only ref, memoised sessionId is cleared
    const after = resolveAutoresearchScope({ sessionKey: "sk-forget4" });
    expect(after.sessionId).toBeNull();
  });
});

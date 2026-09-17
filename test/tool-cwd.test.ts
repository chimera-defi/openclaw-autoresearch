import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveToolExecutionScope } from "../extensions/openclaw-autoresearch/src/tools/tool-cwd.js";

// Each test uses a distinct sessionKey/workspaceDir to avoid cross-test
// interference from scope.ts module-level memoisation maps.

describe("resolveToolExecutionScope", () => {
  describe("repoDir resolution from workspaceDir", () => {
    it("uses workspaceDir as repoDir when no requestedCwd is given", () => {
      const scope = resolveToolExecutionScope({
        toolContext: { workspaceDir: "/home/user/ws-tc1", sessionKey: "tc1" },
      });
      expect(scope.repoDir).toBe(path.resolve("/home/user/ws-tc1"));
    });

    it("uses workspaceDir as repoDir when requestedCwd is empty string", () => {
      const scope = resolveToolExecutionScope({
        toolContext: { workspaceDir: "/home/user/ws-tc2", sessionKey: "tc2" },
        requestedCwd: "",
      });
      expect(scope.repoDir).toBe(path.resolve("/home/user/ws-tc2"));
    });

    it("uses workspaceDir as repoDir when requestedCwd is whitespace only", () => {
      const scope = resolveToolExecutionScope({
        toolContext: { workspaceDir: "/home/user/ws-tc3", sessionKey: "tc3" },
        requestedCwd: "   ",
      });
      expect(scope.repoDir).toBe(path.resolve("/home/user/ws-tc3"));
    });
  });

  describe("absolute requestedCwd override", () => {
    it("uses absolute requestedCwd as repoDir when given", () => {
      const scope = resolveToolExecutionScope({
        toolContext: { workspaceDir: "/home/user/ws-tc4", sessionKey: "tc4" },
        requestedCwd: "/home/user/explicit-repo",
      });
      expect(scope.repoDir).toBe(path.resolve("/home/user/explicit-repo"));
    });

    it("resolves absolute requestedCwd even when no toolContext workspaceDir", () => {
      const scope = resolveToolExecutionScope({
        toolContext: { sessionKey: "tc5" },
        requestedCwd: "/home/user/standalone-repo",
      });
      expect(scope.repoDir).toBe(path.resolve("/home/user/standalone-repo"));
    });

    it("keeps workspaceDir separate from repoDir when absolute override supplied", () => {
      const scope = resolveToolExecutionScope({
        toolContext: { workspaceDir: "/home/user/ws-tc6", sessionKey: "tc6" },
        requestedCwd: "/other/repo",
      });
      expect(scope.workspaceDir).toBe(path.resolve("/home/user/ws-tc6"));
      expect(scope.repoDir).toBe(path.resolve("/other/repo"));
    });
  });

  describe("relative requestedCwd override", () => {
    it("resolves relative requestedCwd against workspaceDir", () => {
      const scope = resolveToolExecutionScope({
        toolContext: { workspaceDir: "/home/user/ws-tc7", sessionKey: "tc7" },
        requestedCwd: "sub/repo",
      });
      expect(scope.repoDir).toBe(path.resolve("/home/user/ws-tc7", "sub/repo"));
    });

    it("throws when relative requestedCwd but no workspaceDir", () => {
      expect(() =>
        resolveToolExecutionScope({
          toolContext: { sessionKey: "tc8" },
          requestedCwd: "relative/path",
        }),
      ).toThrow(/Relative cwd overrides require a workspaceDir/);
    });
  });

  describe("throws when repoDir cannot be resolved", () => {
    it("throws when no toolContext and no requestedCwd", () => {
      expect(() => resolveToolExecutionScope({})).toThrow(
        /Could not resolve the active workspace/,
      );
    });

    it("throws when toolContext has no workspaceDir and requestedCwd is absent", () => {
      expect(() =>
        resolveToolExecutionScope({ toolContext: { sessionKey: "tc9" } }),
      ).toThrow(/Could not resolve the active workspace/);
    });

    it("throws when toolContext has no workspaceDir and requestedCwd is whitespace", () => {
      expect(() =>
        resolveToolExecutionScope({
          toolContext: { sessionKey: "tc10" },
          requestedCwd: "  ",
        }),
      ).toThrow(/Could not resolve the active workspace/);
    });
  });

  describe("sessionKey and sessionId propagation", () => {
    it("propagates sessionKey from toolContext", () => {
      const scope = resolveToolExecutionScope({
        toolContext: {
          workspaceDir: "/home/user/ws-tc11",
          sessionKey: "sk-tc11",
          sessionId: "sid-tc11",
        },
      });
      expect(scope.sessionKey).toBe("sk-tc11");
      expect(scope.sessionId).toBe("sid-tc11");
    });

    it("leaves sessionKey null when not provided", () => {
      const scope = resolveToolExecutionScope({
        toolContext: { workspaceDir: "/home/user/ws-tc12" },
        requestedCwd: undefined,
      });
      expect(scope.sessionKey).toBeNull();
    });
  });

  describe("non-string requestedCwd ignored", () => {
    it("ignores number requestedCwd and falls back to workspaceDir", () => {
      const scope = resolveToolExecutionScope({
        toolContext: { workspaceDir: "/home/user/ws-tc13", sessionKey: "tc13" },
        requestedCwd: 42 as unknown as string,
      });
      expect(scope.repoDir).toBe(path.resolve("/home/user/ws-tc13"));
    });

    it("ignores object requestedCwd and falls back to workspaceDir", () => {
      const scope = resolveToolExecutionScope({
        toolContext: { workspaceDir: "/home/user/ws-tc14", sessionKey: "tc14" },
        requestedCwd: { path: "/some/path" } as unknown as string,
      });
      expect(scope.repoDir).toBe(path.resolve("/home/user/ws-tc14"));
    });

    it("ignores null requestedCwd and falls back to workspaceDir", () => {
      const scope = resolveToolExecutionScope({
        toolContext: { workspaceDir: "/home/user/ws-tc15", sessionKey: "tc15" },
        requestedCwd: null as unknown as string,
      });
      expect(scope.repoDir).toBe(path.resolve("/home/user/ws-tc15"));
    });
  });
});

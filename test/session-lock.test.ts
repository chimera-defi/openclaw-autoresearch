import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  acquireAutoresearchSessionLock,
  getAutoresearchSessionLockStatus,
  readAutoresearchSessionLock,
  removeAutoresearchSessionLock,
} from "../extensions/openclaw-autoresearch/src/session-lock.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-lock-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const lockPath = () => path.join(tmpDir, "autoresearch.lock");

function writeLock(data: object) {
  fs.writeFileSync(lockPath(), JSON.stringify(data, null, 2) + "\n");
}

describe("readAutoresearchSessionLock", () => {
  it("returns null when no lock file exists", () => {
    expect(readAutoresearchSessionLock(tmpDir)).toBeNull();
  });

  it("parses a valid lock file", () => {
    writeLock({ pid: process.pid, timestamp: 1000, sessionKey: "sk-1", sessionId: "sid-1" });
    const lock = readAutoresearchSessionLock(tmpDir);
    expect(lock).not.toBeNull();
    expect(lock!.pid).toBe(process.pid);
    expect(lock!.timestamp).toBe(1000);
    expect(lock!.sessionKey).toBe("sk-1");
    expect(lock!.sessionId).toBe("sid-1");
  });

  it("returns null for malformed JSON", () => {
    fs.writeFileSync(lockPath(), "{ not valid json");
    expect(readAutoresearchSessionLock(tmpDir)).toBeNull();
  });

  it("returns null when pid is not a number", () => {
    writeLock({ pid: "not-a-pid", timestamp: 1000 });
    expect(readAutoresearchSessionLock(tmpDir)).toBeNull();
  });

  it("returns null when timestamp is not a number", () => {
    writeLock({ pid: process.pid, timestamp: "not-a-ts" });
    expect(readAutoresearchSessionLock(tmpDir)).toBeNull();
  });

  it("coerces non-string sessionKey and sessionId to null", () => {
    writeLock({ pid: process.pid, timestamp: 1000, sessionKey: 42, sessionId: null });
    const lock = readAutoresearchSessionLock(tmpDir);
    expect(lock!.sessionKey).toBeNull();
    expect(lock!.sessionId).toBeNull();
  });
});

describe("getAutoresearchSessionLockStatus", () => {
  it("returns missing status when no lock file", () => {
    const status = getAutoresearchSessionLockStatus(tmpDir);
    expect(status.state).toBe("missing");
    expect(status.pid).toBeNull();
    expect(status.ownedByCurrentProcess).toBe(false);
    expect(status.ownedByCurrentSession).toBe(false);
  });

  it("returns active status for the current process", () => {
    writeLock({ pid: process.pid, timestamp: Date.now() });
    const status = getAutoresearchSessionLockStatus(tmpDir);
    expect(status.state).toBe("active");
    expect(status.pid).toBe(process.pid);
    expect(status.ownedByCurrentProcess).toBe(true);
  });

  it("returns stale status for a dead PID", () => {
    // PID 2147483647 (max int32) is virtually certain to not exist
    writeLock({ pid: 2147483647, timestamp: Date.now() });
    const status = getAutoresearchSessionLockStatus(tmpDir);
    expect(status.state).toBe("stale");
    expect(status.ownedByCurrentProcess).toBe(false);
  });
});

describe("acquireAutoresearchSessionLock", () => {
  it("creates a lock when none exists", () => {
    const status = acquireAutoresearchSessionLock(tmpDir);
    expect(status.state).toBe("active");
    expect(status.pid).toBe(process.pid);
    expect(status.ownedByCurrentProcess).toBe(true);
    expect(fs.existsSync(lockPath())).toBe(true);
  });

  it("overwrites a stale lock", () => {
    writeLock({ pid: 2147483647, timestamp: 1000 });
    const status = acquireAutoresearchSessionLock(tmpDir);
    expect(status.state).toBe("active");
    expect(status.pid).toBe(process.pid);
  });

  it("returns existing active status when active lock belongs to another session", () => {
    writeLock({ pid: process.pid, timestamp: 1000, sessionKey: "other-session", sessionId: "other-id" });
    // Pass a ref with a different sessionKey so it's not "owned by current session"
    const ref = { repoDir: tmpDir, sessionKey: "my-session", sessionId: "my-id" };
    const status = acquireAutoresearchSessionLock(ref);
    // Should NOT overwrite -- returns the existing active status
    expect(status.state).toBe("active");
    // Lock file should still have the original pid
    const lock = readAutoresearchSessionLock(tmpDir);
    expect(lock!.sessionKey).toBe("other-session");
  });
});

describe("removeAutoresearchSessionLock", () => {
  it("removes the lock file when it exists", () => {
    acquireAutoresearchSessionLock(tmpDir);
    expect(fs.existsSync(lockPath())).toBe(true);
    removeAutoresearchSessionLock(tmpDir);
    expect(fs.existsSync(lockPath())).toBe(false);
  });

  it("does nothing when no lock file exists", () => {
    expect(() => removeAutoresearchSessionLock(tmpDir)).not.toThrow();
  });
});

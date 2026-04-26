import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../scripts/check-release-tag.mjs", import.meta.url));
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function run(tag: string) {
  return spawnSync(process.execPath, [script, tag], {
    encoding: "utf8",
    env: { ...process.env },
  });
}

describe("release tag check", () => {
  it("accepts a v-prefixed tag matching the package version", () => {
    const result = run(`v${packageJson.version}`);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`release tag v${packageJson.version} matches package metadata`);
  });

  it("rejects a tag that does not match the package version", () => {
    const result = run("v0.0.0");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("release tag v0.0.0 does not match package version");
  });
});

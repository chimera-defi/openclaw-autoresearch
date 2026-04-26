import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

describe("CI workflow", () => {
  it("runs the real OpenClaw host smoke in CI", () => {
    expect(workflow).toContain("host-smoke:");
    expect(workflow).toContain("repository: openclaw/openclaw");
    expect(workflow).toContain("npm run smoke:openclaw-host");
  });
});

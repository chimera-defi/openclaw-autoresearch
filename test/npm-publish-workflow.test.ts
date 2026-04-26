import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflowPath = new URL("../.github/workflows/npm-publish.yml", import.meta.url);

describe("npm publish workflow", () => {
  it("publishes release tags with provenance through GitHub OIDC", () => {
    expect(existsSync(workflowPath)).toBe(true);

    const workflow = readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("release:");
    expect(workflow).toContain("- published");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("npm run release:check-tag -- ${{ github.event.release.tag_name }}");
    expect(workflow).toContain("npm publish --provenance --access public");
    expect(workflow).not.toContain("NODE_AUTH_TOKEN");
    expect(workflow).not.toContain("NPM_TOKEN");
  });
});

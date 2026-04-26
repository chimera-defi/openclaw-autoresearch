import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflowPath = new URL("../.github/workflows/npm-publish.yml", import.meta.url);

describe("npm publish workflow", () => {
  it("publishes release tags with provenance through GitHub OIDC", () => {
    expect(existsSync(workflowPath)).toBe(true);

    const workflow = readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("release:");
    expect(workflow).toContain("- published");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("release_tag:");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("npm run release:check-tag -- \"${{ steps.release.outputs.tag }}\"");
    expect(workflow).toContain("id: package-state");
    expect(workflow).toContain("npm view \"${PACKAGE_NAME}@${PACKAGE_VERSION}\" version");
    expect(workflow).toContain("if: steps.package-state.outputs.already_published != 'true'");
    expect(workflow).toContain("npm publish --provenance --access public");
    expect(workflow).toContain("actions/checkout@v6");
    expect(workflow).toContain("actions/setup-node@v6");
    expect(workflow).not.toContain("actions/checkout@v4");
    expect(workflow).not.toContain("actions/setup-node@v4");
    expect(workflow).not.toContain("NODE_AUTH_TOKEN");
    expect(workflow).not.toContain("NPM_TOKEN");
  });
});

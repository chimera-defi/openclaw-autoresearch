import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../scripts/prepare-release.mjs", import.meta.url));

function writeJson(file: string, value: unknown) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

describe("release prepare command", () => {
  it("bumps metadata, refreshes the lockfile, and prints release next steps", () => {
    const repo = mkdtempSync(path.join(tmpdir(), "openclaw-autoresearch-release-prep-test-"));
    const log = path.join(repo, "commands.log");

    writeJson(path.join(repo, "package.json"), {
      name: "@gianfrancopiana/openclaw-autoresearch",
      version: "1.0.8",
      type: "module",
      scripts: {
        "sync:release-metadata": "node ./sync.mjs",
        "release:check-tag": "node ./check-tag.mjs",
        "release:verify": "node ./verify.mjs",
        "smoke:openclaw-host": "node ./smoke.mjs",
      },
    });
    writeJson(path.join(repo, "openclaw.plugin.json"), {
      name: "openclaw-autoresearch",
      version: "1.0.8",
    });
    writeFileSync(
      path.join(repo, "sync.mjs"),
      `import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';\nconst pkg = JSON.parse(readFileSync('package.json', 'utf8'));\nconst manifest = JSON.parse(readFileSync('openclaw.plugin.json', 'utf8'));\nmanifest.version = pkg.version;\nwriteFileSync('openclaw.plugin.json', JSON.stringify(manifest, null, 2) + '\\n');\nappendFileSync(${JSON.stringify(log)}, 'sync\\n');\n`,
    );
    writeFileSync(
      path.join(repo, "check-tag.mjs"),
      `import { appendFileSync } from 'node:fs';\nappendFileSync(${JSON.stringify(log)}, 'check ' + process.argv.at(-1) + '\\n');\n`,
    );
    writeFileSync(
      path.join(repo, "verify.mjs"),
      `import { appendFileSync } from 'node:fs';\nappendFileSync(${JSON.stringify(log)}, 'verify\\n');\n`,
    );
    writeFileSync(
      path.join(repo, "smoke.mjs"),
      `import { appendFileSync } from 'node:fs';\nappendFileSync(${JSON.stringify(log)}, 'smoke ' + process.argv.at(-1) + '\\n');\n`,
    );

    const result = spawnSync(
      process.execPath,
      [script, "2.0.0", "--repo", repo, "--skip-verify", "--host", "/tmp/openclaw-host"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(readFileSync(path.join(repo, "package.json"), "utf8")).version).toBe("2.0.0");
    expect(JSON.parse(readFileSync(path.join(repo, "openclaw.plugin.json"), "utf8")).version).toBe("2.0.0");
    expect(readFileSync(log, "utf8")).toContain("sync\ncheck v2.0.0\nsmoke /tmp/openclaw-host\n");
    expect(result.stdout).toContain("Release prep complete for v2.0.0");
    expect(result.stdout).toContain("gh release create v2.0.0");
  });

  it("rejects versions that are not plain semver", () => {
    const result = spawnSync(process.execPath, [script, "not-a-version"], { encoding: "utf8" });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Usage: npm run release:prepare -- <version>");
  });
});

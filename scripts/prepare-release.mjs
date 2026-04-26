#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const usage = [
  "Usage: npm run release:prepare -- <version> [--host /path/to/openclaw] [--skip-verify]",
  "",
  "Bumps package/plugin metadata, refreshes the lockfile, runs release checks, and prints next steps.",
].join("\n");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const options = {
    version: undefined,
    host: undefined,
    repoRoot: defaultRepoRoot,
    skipVerify: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--host") {
      options.host = argv[index + 1];
      index += 1;
    } else if (arg === "--repo") {
      options.repoRoot = path.resolve(argv[index + 1] ?? "");
      index += 1;
    } else if (arg === "--skip-verify") {
      options.skipVerify = true;
    } else if (!options.version) {
      options.version = arg;
    } else {
      fail(`${usage}\n\nUnexpected argument: ${arg}`);
    }
  }

  if (!options.version || !versionPattern.test(options.version)) {
    fail(usage);
  }

  if (options.host === undefined && argv.includes("--host")) {
    fail(`${usage}\n\n--host requires a path`);
  }

  return options;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 16 * 1024 * 1024,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed with exit ${result.status}`);
  }
}

function prepareRelease(options) {
  const repoRoot = path.resolve(options.repoRoot);
  const packagePath = path.join(repoRoot, "package.json");
  const manifestPath = path.join(repoRoot, "openclaw.plugin.json");
  const packageJson = readJson(packagePath);
  const manifest = readJson(manifestPath);

  packageJson.version = options.version;
  manifest.version = options.version;
  writeJson(packagePath, packageJson);
  writeJson(manifestPath, manifest);

  run("npm", ["run", "sync:release-metadata"], repoRoot);
  run("npm", ["install", "--package-lock-only"], repoRoot);
  run("npm", ["run", "release:check-tag", "--", `v${options.version}`], repoRoot);

  if (!options.skipVerify) {
    run("npm", ["run", "release:verify"], repoRoot);
  }

  if (options.host) {
    run("npm", ["run", "smoke:openclaw-host", "--", options.host], repoRoot);
  }

  process.stdout.write(`\nRelease prep complete for v${options.version}\n`);
  process.stdout.write("Next steps:\n");
  process.stdout.write("- Review the git diff\n");
  process.stdout.write("- Open and merge a PR with the version/metadata changes\n");
  process.stdout.write(`- After merge, create the GitHub release: gh release create v${options.version} --target main --title v${options.version} --notes-file release-notes.md\n`);
}

try {
  prepareRelease(parseArgs(process.argv.slice(2)));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

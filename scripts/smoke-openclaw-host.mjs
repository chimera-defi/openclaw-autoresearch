#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hostRootInput = process.argv[2] ?? process.env.OPENCLAW_REPO;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (!hostRootInput) {
  fail("Usage: npm run smoke:openclaw-host -- /path/to/openclaw");
}

const hostRoot = path.resolve(hostRootInput);
const openclawCli = path.join(hostRoot, "openclaw.mjs");
if (!fs.existsSync(openclawCli)) {
  fail(`OpenClaw CLI not found at ${openclawCli}`);
}

const smokeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-autoresearch-host-smoke-"));
const smokeStateDir = path.join(smokeRoot, "state");
fs.mkdirSync(smokeStateDir, { recursive: true });

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const rendered = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}\n${rendered}`);
  }
  return result;
}

try {
  run("npm", ["pack", "--pack-destination", smokeRoot], { cwd: repoRoot });
  const tarball = fs
    .readdirSync(smokeRoot)
    .filter((entry) => entry.endsWith(".tgz"))
    .map((entry) => path.join(smokeRoot, entry))[0];
  if (!tarball) {
    fail(`npm pack did not create a tarball in ${smokeRoot}`);
  }

  const smokeEnv = {
    ...process.env,
    OPENCLAW_STATE_DIR: smokeStateDir,
    OPENCLAW_HOME: smokeStateDir,
  };

  run(
    process.execPath,
    [openclawCli, "plugins", "install", tarball, "--force"],
    { cwd: hostRoot, env: smokeEnv },
  );
  const list = run(process.execPath, [openclawCli, "plugins", "list"], {
    cwd: hostRoot,
    env: smokeEnv,
  });

  if (!list.stdout.includes("openclaw-autoresearch")) {
    throw new Error(`Installed plugin was not visible in host plugin list.\n${list.stdout}`);
  }

  process.stdout.write(`OpenClaw host smoke passed: ${hostRoot}\n`);
  process.stdout.write(`Isolated state: ${smokeStateDir}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

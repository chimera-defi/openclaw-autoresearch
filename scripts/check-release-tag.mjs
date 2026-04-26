#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (!tag) {
  fail("Usage: npm run release:check-tag -- v<package-version>");
}

if (!tag.startsWith("v")) {
  fail(`release tag ${tag} must start with v`);
}

const version = tag.slice(1);
if (!version) {
  fail(`release tag ${tag} is missing a version`);
}

const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(path.join(repoRoot, "openclaw.plugin.json"), "utf8"));
const failures = [];

if (packageJson.version !== version) {
  failures.push(`release tag ${tag} does not match package version ${packageJson.version}`);
}

if (manifest.version !== version) {
  failures.push(`release tag ${tag} does not match plugin manifest version ${manifest.version}`);
}

if (failures.length > 0) {
  fail(failures.join("\n"));
}

process.stdout.write(`release tag ${tag} matches package metadata\n`);

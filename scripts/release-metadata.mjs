#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const packagePath = path.join(repoRoot, "package.json");
const pluginManifestPath = path.join(repoRoot, "openclaw.plugin.json");
const writeMode = process.argv.includes("--write");
const expectedTools = [
  "init_experiment",
  "run_experiment",
  "log_experiment",
  "autoresearch_status",
];
const requiredKeywords = [
  "openclaw",
  "openclaw-plugin",
  "autoresearch",
  "benchmarking",
  "optimization",
  "experimentation",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function ensureObject(parent, key) {
  const value = parent[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  parent[key] = {};
  return parent[key];
}

function fail(message) {
  console.error(`release metadata check failed: ${message}`);
  process.exitCode = 1;
}

const pkg = readJson(packagePath);
const manifest = readJson(pluginManifestPath);
const buildVersion = pkg.openclaw?.build?.openclawVersion;
const expectedCompatRange = typeof buildVersion === "string" ? `>=${buildVersion}` : null;

if (writeMode) {
  let packageChanged = false;
  let manifestChanged = false;
  if (manifest.version !== pkg.version) {
    manifest.version = pkg.version;
    manifestChanged = true;
  }
  if (manifest.description !== pkg.description) {
    manifest.description = pkg.description;
    manifestChanged = true;
  }
  if (expectedCompatRange) {
    const openclaw = ensureObject(pkg, "openclaw");
    const install = ensureObject(openclaw, "install");
    const compat = ensureObject(openclaw, "compat");
    if (install.minHostVersion !== expectedCompatRange) {
      install.minHostVersion = expectedCompatRange;
      packageChanged = true;
    }
    if (compat.pluginApi !== expectedCompatRange) {
      compat.pluginApi = expectedCompatRange;
      packageChanged = true;
    }
  }
  if (packageChanged) {
    writeJson(packagePath, pkg);
    console.log(`synced ${path.relative(repoRoot, packagePath)}`);
  }
  if (manifestChanged) {
    writeJson(pluginManifestPath, manifest);
    console.log(`synced ${path.relative(repoRoot, pluginManifestPath)}`);
  }
  if (!packageChanged && !manifestChanged) {
    console.log("release metadata already in sync");
  }
  process.exit(process.exitCode ?? 0);
}

if (typeof pkg.version !== "string" || pkg.version.trim().length === 0) {
  fail("package.json version must be a non-empty string");
}

if (manifest.version !== pkg.version) {
  fail(`openclaw.plugin.json version (${String(manifest.version)}) must match package.json version (${pkg.version})`);
}

if (manifest.description !== pkg.description) {
  fail("openclaw.plugin.json description must match package.json description");
}

const minHostVersion = pkg.openclaw?.install?.minHostVersion;
const pluginApiVersion = pkg.openclaw?.compat?.pluginApi;

if (typeof buildVersion !== "string" || buildVersion.trim().length === 0) {
  fail("package.json openclaw.build.openclawVersion must be a non-empty string");
}

if (minHostVersion !== expectedCompatRange) {
  fail(
    `package.json openclaw.install.minHostVersion (${String(minHostVersion)}) must match >=openclaw.build.openclawVersion (${String(expectedCompatRange)})`,
  );
}

if (pluginApiVersion !== expectedCompatRange) {
  fail(
    `package.json openclaw.compat.pluginApi (${String(pluginApiVersion)}) must match >=openclaw.build.openclawVersion (${String(expectedCompatRange)})`,
  );
}

const toolContracts = manifest.contracts?.tools;
if (JSON.stringify(toolContracts) !== JSON.stringify(expectedTools)) {
  fail(`openclaw.plugin.json contracts.tools must equal ${expectedTools.join(", ")}`);
}

const skills = manifest.skills;
if (JSON.stringify(skills) !== JSON.stringify(["./skills"])) {
  fail('openclaw.plugin.json skills must equal ["./skills"]');
}

const keywords = Array.isArray(pkg.keywords) ? pkg.keywords : [];
for (const keyword of requiredKeywords) {
  if (!keywords.includes(keyword)) {
    fail(`package.json keywords must include ${keyword}`);
  }
}

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}

console.log("release metadata looks good");

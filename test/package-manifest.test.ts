import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PackageManifest = {
  openclawRuntime?: unknown;
  scripts?: Record<string, unknown>;
  peerDependencies?: Record<string, unknown>;
  peerDependenciesMeta?: Record<string, { optional?: unknown }>;
  openclaw?: {
    extensions?: unknown;
    install?: {
      minHostVersion?: unknown;
    };
    compat?: {
      pluginApi?: unknown;
    };
    build?: {
      openclawVersion?: unknown;
    };
  };
};

function readPackageManifest(): PackageManifest {
  return JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as PackageManifest;
}

describe("package manifest contract", () => {
  it("uses supported OpenClaw metadata instead of the removed openclawRuntime hint", () => {
    const manifest = readPackageManifest();

    expect(manifest.openclawRuntime).toBeUndefined();
    expect(manifest.openclaw?.extensions).toEqual(["./index.ts"]);
    expect(manifest.openclaw?.install?.minHostVersion).toBe(">=2026.4.25");
    expect(manifest.openclaw?.compat?.pluginApi).toBe(">=2026.4.25");
    expect(manifest.openclaw?.build?.openclawVersion).toBe("2026.4.25");
  });

  it("runs release verification before publishing", () => {
    const manifest = readPackageManifest();

    expect(manifest.scripts?.prepublishOnly).toBe("npm run release:verify");
  });

  it("provides a registry tarball smoke command", () => {
    const manifest = readPackageManifest();

    expect(manifest.scripts?.["smoke:registry-openclaw-host"]).toBe(
      "node ./scripts/smoke-openclaw-registry.mjs",
    );
    expect(existsSync(resolve(process.cwd(), "scripts/smoke-openclaw-registry.mjs"))).toBe(true);
  });

  it("aligns the npm peer dependency with the supported OpenClaw host range", () => {
    const manifest = readPackageManifest();

    expect(manifest.peerDependencies?.openclaw).toBe(">=2026.4.25");
    expect(manifest.peerDependenciesMeta?.openclaw?.optional).toBe(true);
  });
});

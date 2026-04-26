# Releasing

## Prerequisites

- GitHub release access for `gianfrancopiana/openclaw-autoresearch`
- npm trusted publishing configured for `@gianfrancopiana/openclaw-autoresearch`
  - repository: `gianfrancopiana/openclaw-autoresearch`
  - workflow: `.github/workflows/npm-publish.yml`
  - environment: `npm`
- fallback only: local npm publish access with 2FA or a granular publish token

## Release

1. Update the package version in `package.json`, then sync generated metadata:

   ```bash
   npm run sync:release-metadata
   ```

   If you change the minimum supported OpenClaw version, keep
   `openclaw.install`, `openclaw.compat`, and `openclaw.build` aligned too.

2. Run the release checks:

   ```bash
   npm install
   npm run release:verify
   ```

   CI runs the same release verification, and `prepublishOnly` runs it again
   before any npm publish.

3. Smoke-test against a current local OpenClaw checkout:

   ```bash
   npm run smoke:openclaw-host -- /absolute/path/to/openclaw
   ```

4. Create and publish the matching GitHub release/tag:

   ```bash
   npm run release:check-tag -- v<version>
   gh release create v<version> --target main --title v<version> --notes-file release-notes.md
   ```

   Publishing the GitHub release triggers `.github/workflows/npm-publish.yml`,
   which publishes the package to npm with provenance through GitHub OIDC.

5. Watch the publish workflow and verify npm:

   ```bash
   gh run list --workflow npm-publish.yml --limit 1
   npm view @gianfrancopiana/openclaw-autoresearch version
   npm view @gianfrancopiana/openclaw-autoresearch@<version> version
   ```

6. Verify the published registry tarball against the same host:

   ```bash
   npm run smoke:registry-openclaw-host -- <published-version> /absolute/path/to/openclaw
   ```

7. Verify install:

   ```bash
   openclaw plugins install @gianfrancopiana/openclaw-autoresearch
   ```

   For a local OpenClaw checkout:

   ```bash
   pnpm openclaw plugins install @gianfrancopiana/openclaw-autoresearch
   ```

## Local fallback

Prefer the GitHub Actions trusted-publishing workflow. If it is unavailable,
publish from a clean checkout only:

```bash
npm ci
npm run release:verify
npm publish --otp=123456
```

Replace `123456` with the current code from your authenticator app.

## Common failures

If the publish workflow fails because trusted publishing is not configured,
add the npm trusted publisher for `.github/workflows/npm-publish.yml` and rerun
the release workflow.

If local `npm publish` fails with `E403` and mentions 2FA or bypass tokens, the
current auth on this machine is not sufficient to publish. Either:

- re-run `npm publish --otp=<current-code>`
- or switch to a granular npm token with publish rights and `Bypass 2FA` enabled

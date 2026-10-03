# Usage design

These are illustrative future step snippets, not active or currently runnable
workflows. The Action and CLI are not implemented or released. Replace
`<full-action-commit-sha>` and `vX.Y.Z` with reviewed published versions when they
exist. Every snippet also requires trusted `vars.CFGB_SHA256`: an independently
reviewed lowercase SHA-256 of executable bytes for the job runner, not a checksum
fetched during setup. The examples assume Linux/amd64 to match Workers Builds;
other runner targets require their own reviewed digest. Setup installs CFGB once
per job; subsequent `run` steps call the CLI.
See the [canonical contract](https://github.com/ymmt2005/cfgb/blob/main/docs/spec/09-github-action.md).

## Read-only authoring checks

After a checkout of the exact PR head with no persisted credentials, in a job
with `contents: read` and no secrets:

```yaml
- name: Set up CFGB
  uses: ymmt2005/cfgb-action@<full-action-commit-sha>
  with:
    cfgb-version: vX.Y.Z
    cfgb-sha256: ${{ vars.CFGB_SHA256 }}
- name: Validate authoring content
  run: cfgb validate --authoring
```

Missing/empty summaries are warnings and succeed. Invalid structural values
remain errors. Fork PRs run these credential-free checks only. Setup itself can
run before checkout and does not inspect article content.

## Trusted content preparation

In a separate trusted job with reviewed base-branch configuration and only the
needed authoring credentials, select content explicitly:

```yaml
- name: Set up CFGB
  uses: ymmt2005/cfgb-action@<full-action-commit-sha>
  with:
    cfgb-version: vX.Y.Z
    cfgb-sha256: ${{ vars.CFGB_SHA256 }}
- name: Prepare assets and link-card metadata
  run: cfgb prepare 2026/2026-09-19-protobuf-guide
- name: Generate eligible summaries
  run: cfgb summarize 2026/2026-09-19-protobuf-guide
  env:
    CFGB_CF_ACCOUNT_ID: ${{ secrets.CFGB_CF_ACCOUNT_ID }}
    CFGB_CF_GATEWAY_ID: ${{ secrets.CFGB_CF_GATEWAY_ID }}
    CFGB_CF_AIG_TOKEN: ${{ secrets.CFGB_CF_AIG_TOKEN }}
```

This assumes a reviewed enabled AI/model configuration and the Gateway-held-key
mode. Other credential modes follow the AI contract. `prepare` never calls AI.
`summarize` preserves manual edits and does not commit. A caller bot step may
commit only allowed generated files after rechecking the PR head, using a scoped
GitHub App token. Final checks must then run on the new head. Credentials are
provided to the selected CLI step, not to the setup Action.

## Final checks and artifact build

Use a clean checkout of the final head, no AI/upload credentials, and a Node.js
and package-manager setup compatible with the pinned CFGB release:

```yaml
- name: Set up CFGB
  uses: ymmt2005/cfgb-action@<full-action-commit-sha>
  with:
    cfgb-version: vX.Y.Z
    cfgb-sha256: ${{ vars.CFGB_SHA256 }}
- name: Check publication conditions
  run: cfgb validate --publish
- name: Build the verified artifact
  run: cfgb build --out dist
```

A future-dated article fails the publication check. A preview-oriented build can
run separately without that publication check, using `build`'s default validation.
Build does not upload. CLI failures fail their workflow steps; there is no Action
wrapper for command exit codes, diagnostics or artifact/preview outputs.

In the default architecture, Workers Builds separately checks out the matching
commit, bootstraps the pinned binary under HOME, then runs `cfgb build` and
`cfgb deploy` or `cfgb preview` using that installed binary. The
[build runtime contract](https://github.com/ymmt2005/cfgb/blob/main/docs/spec/10-build-runtime.md)
defines retained toolchain sessions, runtime checks and CI provenance. Its upload
command consumes its own verified artifact without rebuilding. Do not upload again
from this GitHub job. If deployment ownership is explicitly moved to GitHub,
install CFGB in that job and use `run: cfgb deploy --from dist` or
`run: cfgb preview --from dist`, with matching source provenance and the CLI's
upload environment variables. Private-preview Access checks remain mandatory.
Cross-job artifact transfer must preserve all verified bytes and source identity;
the CLI may recreate the same pinned upload toolchain outside the original
environment without rendering again. A GitHub upload job must check out the
actual reviewed named branch; a detached checkout is sufficient only for checks
and building. Worker-level `preview_worker` Access is the standard preview policy.

Pin the Action reference, `cfgb-version` and `cfgb-sha256` independently. For
GitHub checks and Workers Builds using the same OS/architecture, match the version
and digest pins exactly to verify identical CLI bytes. Immutable CFGB release
artifacts do not remove the required digest input. Each job performs
its own setup; the registered PATH is available only within that job. Normal CLI
arguments, selection and diagnostics follow the CLI specification directly.

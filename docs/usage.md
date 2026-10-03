# Usage design

These are illustrative future step snippets, not active or currently runnable
workflows. The Action and CLI are not implemented or released. Replace
`<full-action-commit-sha>` and `vX.Y.Z` with reviewed published versions when they
exist. All examples use the same root Action; there are no separate setup,
summary or build Actions. See the [canonical contract](https://github.com/ymmt2005/cfgb/blob/main/docs/spec/09-github-action.md).

## Read-only authoring checks

After a checkout of the exact PR head with no persisted credentials, in a job
with `contents: read` and no secrets:

```yaml
- name: Validate authoring content
  uses: ymmt2005/cfgb-action@<full-action-commit-sha>
  with:
    cfgb-version: vX.Y.Z
    operation: validate
    validation-mode: authoring
```

Missing/empty summaries are warnings and succeed. Invalid structural values
remain errors. Fork PRs run these credential-free checks only.

## Trusted content preparation

In a separate trusted job with reviewed base-branch configuration and only the
needed authoring credentials, select content explicitly:

```yaml
- name: Prepare assets and link-card metadata
  uses: ymmt2005/cfgb-action@<full-action-commit-sha>
  with:
    cfgb-version: vX.Y.Z
    operation: prepare
    articles: |
      2026/2026-09-19-protobuf-guide
- name: Generate eligible summaries
  uses: ymmt2005/cfgb-action@<full-action-commit-sha>
  with:
    cfgb-version: vX.Y.Z
    operation: summarize
    articles: |
      2026/2026-09-19-protobuf-guide
  env:
    CFGB_CF_ACCOUNT_ID: ${{ secrets.CFGB_CF_ACCOUNT_ID }}
    CFGB_CF_GATEWAY_ID: ${{ secrets.CFGB_CF_GATEWAY_ID }}
    CFGB_CF_AIG_TOKEN: ${{ secrets.CFGB_CF_AIG_TOKEN }}
```

This assumes a reviewed enabled AI/model configuration and the Gateway-held-key
mode. Other credential modes follow the AI contract. `prepare` never calls AI.
`summarize` preserves manual edits and does not commit. A caller bot step may
commit only allowed generated files after rechecking the PR head, using a scoped
GitHub App token. Final checks must then run on the new head.

## Final checks and artifact build

Use a clean checkout of the final head, no AI/upload credentials, and a Node.js
and package-manager setup compatible with the pinned CFGB release:

```yaml
- name: Check publication conditions
  uses: ymmt2005/cfgb-action@<full-action-commit-sha>
  with:
    cfgb-version: vX.Y.Z
    operation: validate
    validation-mode: publish
- name: Build the verified artifact
  id: build
  uses: ymmt2005/cfgb-action@<full-action-commit-sha>
  with:
    cfgb-version: vX.Y.Z
    operation: build
    out: dist
```

A future-dated article fails the publication check. A preview-oriented build can
run separately without that publication check, using `build`'s default validation.
Build does not upload; `artifact-path` is emitted only on success.

In the default architecture, Workers Builds separately checks out the matching
commit and runs `cfgb build`, then `cfgb deploy` or `cfgb preview`. Its upload
command consumes its own verified build artifact without rebuilding. Do not upload
again from this GitHub job. If deployment ownership is explicitly moved to GitHub
Actions, use this same Action's `deploy`/`preview` operation with `from`, matching
source provenance and the CLI's upload environment variables. Private-preview
Access checks remain mandatory. Cross-job artifact transfer must preserve all
verified bytes and matching source identity.

## Setup for direct CLI usage

`operation: setup` only installs the verified CLI and registers PATH. Later `run`
steps can use it for local-script needs while retaining the CLI contract. Other
operations also install the requested version automatically; a separate setup
step is optional. Action reference and `cfgb-version` are independently pinned.

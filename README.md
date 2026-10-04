# CFGB Action — Git-based Blog on Cloudflare

Install an exact immutable [CFGB release](https://github.com/ymmt2005/cfgb/releases)
and register the CLI on PATH. Later workflow steps call `cfgb` directly. This is
an independent open-source project, not affiliated with Cloudflare, Inc.

```yaml
- uses: ymmt2005/cfgb-action@<full-reviewed-action-commit-sha>
  id: cfgb
  with:
    cfgb-version: v0.1.0
- run: cfgb version
```

Pin the Action commit separately from the CLI version. `cfgb-version` is required;
there is no implicit latest or version range. Linux, macOS and Windows runners
are supported on amd64 and arm64. Setup needs no content checkout, blog settings,
caller-configured Node.js, AI credentials or upload credentials. Self-hosted
runners need internet access and a native `tar` capable of extracting the pinned
GitHub CLI archive. GitHub-hosted runners provide it.

## Verification and outputs

The Action checks that the exact CLI release is published and immutable, then
verifies the release and selected raw executable against GitHub's release
attestation before executing it. It checks the executable's reported version.
Missing or invalid evidence fails setup. No caller-specific digest is required.

The GitHub CLI verifier version and platform archive SHA-256 values are pinned
in `src/verifier-pins.json`. Its archive is verified before extraction/execution.
The optional `github-token` input defaults to the job GitHub token and needs only
read access. No PAT or write permission is required.

The Action also downloads `toolchain-requirements.json` from the selected CLI
release and verifies that asset against the same release attestation. Its
`cfgbVersion` must match the selected release. Build toolchain outputs come from
its tested versions, without hard-coding them in this Action or choosing a
minimum/range. They describe the CFGB build toolchain, not the Action's internal
Node.js runtime.

| Output | Value |
| --- | --- |
| `cfgb-version` | Verified installed CLI release tag |
| `cfgb-path` | Absolute installed executable path |
| `node-version` | Release metadata's `testedNodeVersion` |
| `npm-version` | Release metadata's `testedNpmVersion` |
| `pnpm-version` | Release metadata's `testedPnpmVersion` |

Toolchain outputs were added after Action `v0.1.0`; use a reviewed commit
containing this change or a subsequent Action release. Missing or invalid
toolchain metadata fails setup rather than returning guessed versions.

PATH registration applies to subsequent steps in the same job. Each invocation
creates a fresh verified installation in runner temporary storage; this
implementation does not cache executable bytes.

## Action release immutability

GitHub [Immutable Releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
are enabled for `ymmt2005/cfgb-action`. After an Action release is published, its
associated tag and release assets are locked; updates use a new version. A tag
by itself is not an immutable release. Action releases and CFGB CLI releases are
independent: pin the Action reference separately from `cfgb-version`. A reviewed
full commit SHA remains suitable for pinning the Action.

## Building and publishing

CFGB v0.1.0 implements `build` and `version`. Set up CFGB first, then use its
outputs to install the matching build prerequisites. For npm and a GitHub Pages
project site:

```yaml
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
  - uses: ymmt2005/cfgb-action@<full-reviewed-action-commit-sha>
    id: cfgb
    with:
      cfgb-version: v0.1.0
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020
    with:
      node-version: ${{ steps.cfgb.outputs.node-version }}
  - name: Install the tested npm version
    env:
      NPM_VERSION: ${{ steps.cfgb.outputs.npm-version }}
    run: npm install --global "npm@$NPM_VERSION"
  - run: cfgb build --base-url https://example.github.io/blog/ --static --out dist
```

Publish `dist/site/` through the hosting provider. This setup Action does not
build or upload the site. For pnpm, install `pnpm-version` instead and set
`CFGB_PACKAGE_MANAGER=pnpm` on the build step. See [usage](docs/usage.md) for that
example and the
[example Pages workflow](https://github.com/ymmt2005/cfgb-example/tree/main/.github/workflows).

## Project ownership

- [cfgb](https://github.com/ymmt2005/cfgb) owns the CLI, embedded renderer/Worker,
  specifications, schemas and domain behavior.
- This repository owns verified CLI setup, runner installation and Action tests.
- [cfgb-example](https://github.com/ymmt2005/cfgb-example) owns synthetic content,
  the acceptance corpus and an example publication workflow.

The [canonical setup contract](https://github.com/ymmt2005/cfgb/blob/main/docs/spec/09-github-action.md)
defines the boundary. Authoring, migration and Cloudflare upload commands remain
later CLI work; their design does not imply availability in v0.1.0.

Run installer tests with `node --test tests/*.test.mjs`. CI also installs the
actual immutable release on native supported runners and invokes the CLI in a
subsequent step.

## License

[Apache License, Version 2.0](LICENSE).

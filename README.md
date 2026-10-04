# CFGB Action — Git-based Blog on Cloudflare

Install an exact immutable [CFGB release](https://github.com/ymmt2005/cfgb/releases)
and register the CLI on PATH. Later workflow steps call `cfgb` directly. This is
an independent open-source project, not affiliated with Cloudflare, Inc.

```yaml
- uses: ymmt2005/cfgb-action@<full-reviewed-action-commit-sha>
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

Outputs are `cfgb-version` and `cfgb-path`. PATH registration applies to subsequent
steps in the same job. Each invocation creates a fresh verified installation in
runner temporary storage; this implementation does not cache executable bytes.

## Building and publishing

CFGB v0.1.0 implements `build` and `version`. Configure the Node.js/package-manager
prerequisites from its release requirements, then run the CLI. For a static host,
including a GitHub Pages project site:

```sh
cfgb build --base-url https://example.github.io/blog/ --static --out dist
```

Publish `dist/site/` through the hosting provider. This setup Action does not
build or upload the site. See [usage](docs/usage.md) and the
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

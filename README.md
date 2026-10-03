# CFGB Action — Git-based Blog on Cloudflare

The GitHub setup Action for **CFGB — Git-based Blog on Cloudflare**, an
independent open-source project not affiliated with Cloudflare, Inc.

**Status: design and documentation only. No Action implementation, published
version or active workflow is provided yet.**

`ymmt2005/cfgb-action` will install the exact release requested through
`cfgb-version`, verify its checksum and register the CLI on PATH. Subsequent
workflow `run` steps invoke `cfgb` directly. The v1 Action has no `operation`
selector or wrappers for individual CLI commands.

## Responsibilities

| Repository | Responsibility |
| --- | --- |
| [cfgb](https://github.com/ymmt2005/cfgb) | Go CLI, embedded renderer/Worker, schemas, prompts and domain rules |
| This repository | Verified CLI installation, cache/PATH handling, setup outputs and Action tests |
| [cfgb-example](https://github.com/ymmt2005/cfgb-example) | Synthetic content and CLI conformance corpus |

Setup requires no checkout or blog configuration and uses no AI/upload credentials.
Caller workflows configure checkout, job permissions and build prerequisites,
then execute the desired CLI commands. Action and CLI releases are independently
pinned. Content repositories remain free of framework/Worker implementation files.

The default delivery architecture uses GitHub Actions for authoring/checks and
Cloudflare Workers Builds for deployment. Setup does not change that division.
Future GitHub-specific capabilities, when justified, belong in this same public
Action repository and entry point.

## Documentation

- [Canonical setup specification](https://github.com/ymmt2005/cfgb/blob/main/docs/spec/09-github-action.md): installation, inputs/outputs, versioning and acceptance.
- [Usage design](docs/usage.md): setup followed by direct CLI commands.
- [CLI contract](https://github.com/ymmt2005/cfgb/blob/main/docs/spec/01-cli.md).
- [Delivery contract](https://github.com/ymmt2005/cfgb/blob/main/docs/spec/04-delivery.md).

Future implementation will provide one `action.yml` at the repository root for
publication. Pin its full commit SHA separately from the requested CLI release.
Action versions and CLI versions are independent; do not assume matching numbers.

## License

This project, including its documentation and future Action implementation,
is licensed under the [Apache License, Version 2.0](LICENSE).

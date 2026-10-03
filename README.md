# CFGB Action — Git-based Blog on Cloudflare

The unified GitHub Action for **CFGB — Git-based Blog on Cloudflare**, an
independent open-source project not affiliated with Cloudflare, Inc.

**Status: design and documentation only. No Action implementation, published
version or active workflow is provided yet.**

One public entry point, `ymmt2005/cfgb-action`, will support `setup`, `prepare`,
`validate`, `summarize`, `build`, `deploy` and `preview` through an `operation`
input. Multiple workflow steps can select different operations from this same
Action. Future features belong in this integrated Action and share its release
stream.

## Responsibilities

| Repository | Responsibility |
| --- | --- |
| [cfgb](https://github.com/ymmt2005/cfgb) | Go CLI, embedded renderer/Worker, schemas, prompts and domain rules |
| This repository | Verified CLI installation, operation mapping, GitHub annotations/outputs and Action tests |
| [cfgb-example](https://github.com/ymmt2005/cfgb-example) | Synthetic content and conformance corpus |

The Action invokes a pinned released CLI; it does not duplicate rendering or
summary-ownership rules. Content repositories remain free of framework and
Worker implementation files. Build operations require the Node.js/toolchain
prerequisites documented by the selected CFGB release.

The default delivery architecture uses GitHub Actions for authoring/checks and
Cloudflare Workers Builds for deployment. Upload operations support deliberately
chosen alternative pipelines; they do not add a second automatic deploy path.
The Action never commits or pushes generated content automatically.

## Documentation

- [Canonical Action specification](https://github.com/ymmt2005/cfgb/blob/main/docs/spec/09-github-action.md): inputs, outputs, versioning, trust boundary and acceptance.
- [Usage design](docs/usage.md): future examples using the same integrated Action.
- [CLI contract](https://github.com/ymmt2005/cfgb/blob/main/docs/spec/01-cli.md).
- [Delivery contract](https://github.com/ymmt2005/cfgb/blob/main/docs/spec/04-delivery.md).

Future implementation will provide one `action.yml` at the repository root for
publication. Pin its full commit SHA separately from the requested CLI release.
Action versions and CLI versions are independent; do not assume matching numbers.

## License

This project, including its documentation and future Action implementation,
is licensed under the [Apache License, Version 2.0](LICENSE).

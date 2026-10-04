# Using the setup Action

`cfgb-action` installs the CLI; caller workflows own checkout, runtime prerequisites,
permissions and hosting. Pin a reviewed full Action commit SHA and independently
select the exact CLI release. CFGB v0.1.0 implements `build` and `version`.

A static-site build can use:

```yaml
permissions:
  contents: read
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
    shell: bash
    env:
      NPM_VERSION: ${{ steps.cfgb.outputs.npm-version }}
    run: npm install --global "npm@$NPM_VERSION"
  - run: cfgb build --out dist --base-url https://example.github.io/blog/ --static
```

`--base-url` overrides the public URL for that invocation without editing
`cfgb.yaml`. `--static` supplies a default-language entry page, HTML alias redirects
and direct language links for hosts without the locale Worker. Upload `dist/site/`
with the provider's action. GitHub Pages requires enabling GitHub Actions as its
publication source and a deploy job with `pages: write` and `id-token: write`.
See the [example workflow](https://github.com/ymmt2005/cfgb-example/tree/main/.github/workflows).

To use pnpm, keep the setup Action and Node.js steps, and replace the npm
installation/build steps with:

```yaml
- name: Install the tested pnpm version
  shell: bash
  env:
    PNPM_VERSION: ${{ steps.cfgb.outputs.pnpm-version }}
  run: npm install --global "pnpm@$PNPM_VERSION"
- run: cfgb build --out dist --base-url https://example.github.io/blog/ --static
  env:
    CFGB_PACKAGE_MANAGER: pnpm
```

The npm bundled with Node.js bootstraps pnpm; CFGB checks the selected pnpm
toolchain for that build. Choose one package manager for the build.

Setup itself can run before checkout and needs no Node/package-manager setup.
It returns tested toolchain versions from the selected CLI release's verified
`toolchain-requirements.json`. These outputs were added after Action `v0.1.0`;
pin a reviewed commit containing them or a subsequent Action release. The
build prerequisites above belong to `cfgb build`, not installation. The
optional `github-token` defaults to the job's read-only GitHub token. The Action
verifies the immutable release and asset with its pinned GitHub CLI verifier;
callers do not provide platform-specific checksums.

The Action exports `cfgb-version`, `cfgb-path`, `node-version`, `npm-version`
and `pnpm-version`, and registers PATH for later steps in that job. Every job
needing CFGB runs its own setup. Native CLI failures
remain step failures. There are no wrappers for CLI operations or deployment.

Cloudflare deployment remains a separate architecture. The default build produces
an artifact with a Worker, while Workers Builds bootstrap/upload commands are
future CLI work. Build artifacts are editable static-site output; recorded source
metadata is diagnostic, not an integrity/provenance security boundary. Executable
release verification is a separate requirement.

Design contracts for future authoring, migration and upload commands live in
[CFGB's specifications](https://github.com/ymmt2005/cfgb/tree/main/docs/spec).
Do not invoke commands absent from the selected release or treat their fixtures
as already executed acceptance tests.

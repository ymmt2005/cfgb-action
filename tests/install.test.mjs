import assert from "node:assert/strict";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  exactVersion,
  installBinary,
  installVerifier,
  target,
} from "../src/install.mjs";

test("runner selection covers native release targets and rejects unsupported runners", () => {
  for (const [platform, os] of [
    ["linux", "linux"],
    ["darwin", "darwin"],
    ["win32", "windows"],
  ]) {
    for (const [cpu, arch] of [
      ["x64", "amd64"],
      ["arm64", "arm64"],
    ])
      assert.deepEqual(target(platform, cpu), {
        os,
        arch,
        extension: os === "windows" ? ".exe" : "",
      });
  }
  assert.throws(() => target("freebsd", "x64"), /Unsupported runner/);
  assert.throws(() => target("constructor", "x64"), /Unsupported runner/);
  assert.throws(() => target("linux", "ia32"), /Unsupported runner/);
  assert.equal(exactVersion("v0.1.0"), "v0.1.0");
  for (const version of [
    "",
    "latest",
    "main",
    "v0",
    "0.1.0",
    ">=v0.1.0",
    "v0.1.0;echo unsafe",
    "v0.1.0\n",
  ])
    assert.throws(() => exactVersion(version));
});

test("release evidence and asset verification precede executable invocation", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cfgb-action-test-"));
  try {
    const events = [];
    const runner = target("linux", "x64");
    const release = {
      tag_name: "v0.1.0",
      immutable: true,
      draft: false,
      assets: [
        { name: "cfgb-linux-amd64" },
        { name: "toolchain-requirements.json" },
      ],
    };
    const requirements = {
      cfgbVersion: "v0.1.0",
      testedNodeVersion: "24.21.0",
      testedNpmVersion: "12.2.0",
      testedPnpmVersion: "12.8.1",
    };
    const options = {
      version: "v0.1.0",
      runner,
      directory,
      gh: "/trusted/gh",
      token: "",
      lookup: async () => release,
      get: async (url, file) => {
        const name = path.basename(file);
        events.push(`download ${name}`);
        assert.equal(
          url,
          `https://github.com/ymmt2005/cfgb/releases/download/v0.1.0/${name}`,
        );
        await writeFile(
          file,
          name === "toolchain-requirements.json"
            ? JSON.stringify(requirements)
            : "test bytes",
        );
      },
      run: (file, args) => {
        const event = file === "/trusted/gh" ? args[1] : "execute";
        events.push(event);
        if (event === "execute") return "cfgb v0.1.0\n";
        assert.ok(args.includes("github.com/ymmt2005/cfgb"));
      },
    };
    const installed = await installBinary(options);
    assert.deepEqual(installed, {
      path: path.join(directory, "cfgb"),
      nodeVersion: "24.21.0",
      npmVersion: "12.2.0",
      pnpmVersion: "12.8.1",
    });
    assert.deepEqual(events, [
      "verify",
      "download cfgb-linux-amd64",
      "verify-asset",
      "download toolchain-requirements.json",
      "verify-asset",
      "execute",
    ]);
    for (const mutation of [
      { immutable: false },
      { draft: true },
      { tag_name: "v9.9.9" },
      { assets: [] },
      { assets: [{ name: "cfgb-linux-amd64" }] },
    ]) {
      events.length = 0;
      await assert.rejects(
        installBinary({
          ...options,
          lookup: async () => ({ ...release, ...mutation }),
        }),
      );
      assert.deepEqual(events, []);
    }
    for (const broken of ["verify", "verify-asset"]) {
      events.length = 0;
      await assert.rejects(
        installBinary({
          ...options,
          run: (file, args) => {
            const event = file === "/trusted/gh" ? args[1] : "execute";
            events.push(event);
            if (event === broken) throw new Error("invalid attestation");
          },
        }),
        /invalid attestation/,
      );
      assert.equal(events.includes("execute"), false);
    }
    await assert.rejects(
      installBinary({
        ...options,
        run: (file) => (file === "/trusted/gh" ? "" : "cfgb v9.9.9"),
      }),
      /version mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a corrupt pinned verifier archive is rejected before extraction", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "cfgb-verifier-test-"));
  try {
    await assert.rejects(
      installVerifier(directory, target("linux", "x64"), async (url, file) => {
        assert.ok(
          url.startsWith(
            "https://github.com/cli/cli/releases/download/v2.102.0/",
          ),
        );
        await writeFile(file, "corrupt archive");
      }),
      /checksum mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("toolchain metadata must be verified and match the selected release before execution", async (t) => {
  const requirements = {
    cfgbVersion: "v0.1.0",
    testedNodeVersion: "26.10.0",
    testedNpmVersion: "12.3.1",
    testedPnpmVersion: "12.9.2",
  };
  for (const scenario of [
    { name: "selected release values", metadata: requirements },
    {
      name: "invalid metadata attestation",
      metadata: requirements,
      badEvidence: true,
    },
    {
      name: "unavailable metadata download",
      metadata: requirements,
      unavailable: true,
    },
    { name: "malformed JSON", text: "{" },
    {
      name: "wrong release",
      metadata: { ...requirements, cfgbVersion: "v9.9.9" },
    },
    {
      name: "missing Node",
      metadata: { ...requirements, testedNodeVersion: undefined },
    },
    {
      name: "missing npm",
      metadata: { ...requirements, testedNpmVersion: undefined },
    },
    {
      name: "missing pnpm",
      metadata: { ...requirements, testedPnpmVersion: undefined },
    },
    {
      name: "non-string version",
      metadata: { ...requirements, testedNpmVersion: 12 },
    },
    {
      name: "empty version",
      metadata: { ...requirements, testedNodeVersion: "" },
    },
    {
      name: "output line injection",
      metadata: { ...requirements, testedPnpmVersion: "12.9.2\nother=value" },
    },
  ]) {
    await t.test(scenario.name, async () => {
      const directory = await mkdtemp(
        path.join(tmpdir(), "cfgb-metadata-test-"),
      );
      try {
        const evidence = [];
        let executed = false;
        const promise = installBinary({
          version: "v0.1.0",
          runner: target("linux", "x64"),
          directory,
          gh: "/trusted/gh",
          token: "",
          lookup: async () => ({
            tag_name: "v0.1.0",
            immutable: true,
            draft: false,
            assets: [
              { name: "cfgb-linux-amd64" },
              { name: "toolchain-requirements.json" },
            ],
          }),
          get: async (url, file) => {
            const metadata = file.endsWith("toolchain-requirements.json");
            if (metadata && scenario.unavailable)
              throw new Error("metadata download failed");
            await writeFile(
              file,
              metadata
                ? (scenario.text ?? JSON.stringify(scenario.metadata))
                : "binary bytes",
            );
          },
          run: (file, args) => {
            if (file !== "/trusted/gh") {
              assert.deepEqual(evidence, [
                "cfgb-linux-amd64",
                "toolchain-requirements.json",
              ]);
              executed = true;
              return "cfgb v0.1.0\n";
            }
            if (args[1] === "verify-asset") {
              const name = path.basename(args[3]);
              if (
                name === "toolchain-requirements.json" &&
                scenario.badEvidence
              )
                throw new Error("invalid metadata attestation");
              evidence.push(name);
            }
          },
        });
        if (scenario.name === "selected release values") {
          assert.deepEqual(await promise, {
            path: path.join(directory, "cfgb"),
            nodeVersion: "26.10.0",
            npmVersion: "12.3.1",
            pnpmVersion: "12.9.2",
          });
          assert.equal(executed, true);
        } else {
          await assert.rejects(promise);
          assert.equal(executed, false);
          await assert.rejects(access(path.join(directory, "cfgb")), {
            code: "ENOENT",
          });
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
});

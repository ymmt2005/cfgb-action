import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
      assets: [{ name: "cfgb-linux-amd64" }],
    };
    const options = {
      version: "v0.1.0",
      runner,
      directory,
      gh: "/trusted/gh",
      token: "",
      lookup: async () => release,
      get: async (url, file) => {
        events.push("download");
        assert.equal(
          url,
          "https://github.com/ymmt2005/cfgb/releases/download/v0.1.0/cfgb-linux-amd64",
        );
        await writeFile(file, "test bytes");
      },
      run: (file, args) => {
        const event = file === "/trusted/gh" ? args[1] : "execute";
        events.push(event);
        if (event === "execute") return "cfgb v0.1.0\n";
        assert.ok(args.includes("github.com/ymmt2005/cfgb"));
      },
    };
    const installed = await installBinary(options);
    assert.equal(installed, path.join(directory, "cfgb"));
    assert.deepEqual(events, ["verify", "download", "verify-asset", "execute"]);
    for (const mutation of [
      { immutable: false },
      { draft: true },
      { tag_name: "v9.9.9" },
      { assets: [] },
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

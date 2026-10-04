import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import pins from "./verifier-pins.json" with { type: "json" };

const repository = "ymmt2005/cfgb";

export function target(platform, arch) {
  const os = new Map([
    ["linux", "linux"],
    ["darwin", "darwin"],
    ["win32", "windows"],
  ]).get(platform);
  const cpu = new Map([
    ["x64", "amd64"],
    ["arm64", "arm64"],
  ]).get(arch);
  if (!os || !cpu) throw new Error(`Unsupported runner: ${platform}/${arch}`);
  return { os, arch: cpu, extension: os === "windows" ? ".exe" : "" };
}

export function exactVersion(version) {
  if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))
    throw new Error("cfgb-version must be an exact release tag such as v0.1.0");
  return version;
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Download failed (${response.status}): ${url}`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function releaseMetadata(version, token) {
  const response = await fetch(
    `https://api.github.com/repos/${repository}/releases/tags/${version}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (!response.ok)
    throw new Error(`Release lookup failed (${response.status})`);
  return response.json();
}

// The verifier archive's digest is pinned in this Action, before executing gh
// or extracting its trusted archive. It is independent of the CFGB release.
export async function installVerifier(directory, runner, get = download) {
  const os = runner.os === "darwin" ? "macOS" : runner.os;
  const format = os === "linux" ? "tar.gz" : "zip";
  const name = `gh_${pins.version.slice(1)}_${os}_${runner.arch}.${format}`;
  const archive = path.join(directory, name);
  await get(
    `https://github.com/cli/cli/releases/download/${pins.version}/${name}`,
    archive,
  );
  const digest = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  if (digest !== pins.assets[name])
    throw new Error("GitHub CLI archive checksum mismatch");
  const extracted = path.join(directory, "verifier");
  await mkdir(extracted);
  execFileSync("tar", ["-xf", archive, "-C", extracted], { stdio: "pipe" });
  return path.join(
    extracted,
    name.slice(0, -format.length - 1),
    "bin",
    `gh${runner.extension}`,
  );
}

export async function installBinary({
  version,
  runner,
  directory,
  gh,
  token,
  run = execFileSync,
  lookup = releaseMetadata,
  get = download,
}) {
  exactVersion(version);
  const release = await lookup(version, token);
  if (
    release.tag_name !== version ||
    release.draft ||
    release.immutable !== true
  )
    throw new Error("The selected release must be published and immutable");
  const name = `cfgb-${runner.os}-${runner.arch}${runner.extension}`;
  if (!release.assets.some((asset) => asset.name === name))
    throw new Error(`The selected release has no ${name} asset`);
  const env = {
    ...process.env,
    GH_TOKEN: token,
    GH_HOST: "github.com",
    GH_CONFIG_DIR: path.join(directory, "gh-config"),
  };
  const ghRun = (args) => run(gh, args, { env, stdio: "pipe" });
  ghRun(["release", "verify", version, "--repo", `github.com/${repository}`]);
  const asset = path.join(directory, name);
  await get(
    `https://github.com/${repository}/releases/download/${version}/${name}`,
    asset,
  );
  ghRun([
    "release",
    "verify-asset",
    version,
    asset,
    "--repo",
    `github.com/${repository}`,
  ]);
  const installed = path.join(directory, `cfgb${runner.extension}`);
  await rename(asset, installed);
  if (runner.os !== "windows") await chmod(installed, 0o755);
  const reported = run(installed, ["version"], {
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
  if (reported !== `cfgb ${version}`)
    throw new Error(`Installed version mismatch: ${reported}`);
  return installed;
}

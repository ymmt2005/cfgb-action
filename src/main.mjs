import { appendFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  exactVersion,
  installBinary,
  installVerifier,
  target,
} from "./install.mjs";

let directory;
try {
  const version = exactVersion(process.env["INPUT_CFGB-VERSION"] || "");
  const runner = target(process.platform, process.arch);
  directory = await mkdtemp(
    path.join(process.env.RUNNER_TEMP || tmpdir(), "cfgb-setup-"),
  );
  const gh = await installVerifier(directory, runner);
  const installed = await installBinary({
    version,
    runner,
    directory,
    gh,
    token:
      process.env["INPUT_GITHUB-TOKEN"] ||
      process.env.GITHUB_TOKEN ||
      process.env.GH_TOKEN,
  });
  await appendFile(process.env.GITHUB_PATH, `${directory}\n`);
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `cfgb-version=${version}\ncfgb-path=${installed.path}\n` +
      `node-version=${installed.nodeVersion}\nnpm-version=${installed.npmVersion}\n` +
      `pnpm-version=${installed.pnpmVersion}\n`,
  );
  console.log(`Installed CFGB ${version} for ${runner.os}/${runner.arch}`);
} catch (error) {
  if (directory) {
    try {
      await rm(directory, { recursive: true, force: true });
    } catch (cleanup) {
      console.error(`Cleanup failed: ${cleanup.message}`);
    }
  }
  console.error(
    `::error::${error.message.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}`,
  );
  process.exitCode = 1;
}

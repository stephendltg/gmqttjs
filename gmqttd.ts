#!/usr/bin/env deno run --allow-env --allow-run

import { join } from "https://deno.land/std@0.103.0/path/mod.ts";
import * as log from "https://deno.land/std@0.103.0/log/mod.ts";

const __dirname = new URL(".", import.meta.url).pathname;

var binaryPath;

if (Deno.build.os === "windows") {
  binaryPath = join(__dirname, "bin", "gmqttd-win32-amd64.exe").slice(1);
} else if (Deno.build.os === "darwin") {
  log.warning("⚠ Unsupported platform: " + Deno.build.os + " Cooming soon!");
} else if (Deno.build.os === "linux") {
  binaryPath = join(__dirname, "bin", "gmqttd-linux-amd64");
} else {
  log.critical("⚠ Unsupported platform: " + Deno.build.os);
}

if (!binaryPath) {
  Deno.exit(0);
}

// create webview
const gmqtt = Deno.run({
  cmd: [binaryPath, ...Deno.args],
  stdout: "piped",
  stderr: "piped",
});

// await its completion
const { code } = await gmqtt.status();

const rawOutput = await gmqtt.output();
const rawError = await gmqtt.stderrOutput();

if (code === 0) {
  await Deno.stdout.write(rawOutput);
} else {
  const errorString = new TextDecoder().decode(rawError);
  console.log(errorString);
}

Deno.exit(code);

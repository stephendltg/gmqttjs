#!/usr/bin/env deno run --allow-env --allow-run --allow-read

import { join } from "https://deno.land/std@0.104.0/path/mod.ts";
import * as log from "https://deno.land/std@0.104.0/log/mod.ts";
import { parse } from "https://deno.land/std@0.104.0/flags/mod.ts";
import { parse as yamlParse } from "https://deno.land/std@0.104.0/encoding/yaml.ts";
import { format } from "https://deno.land/std@0.104.0/datetime/mod.ts";

const __dirname = new URL(".", import.meta.url).pathname;

var binaryPath;
var yamlPath;

if (Deno.build.os === "windows") {
  binaryPath = join(__dirname, "bin", "gmqttd-win32-amd64.exe").slice(1);
  yamlPath = join(__dirname, "bin", "gmqttd.yml").slice(1);
} else if (Deno.build.os === "darwin") {
  log.warning("⚠ Unsupported platform: " + Deno.build.os + " Cooming soon!");
} else if (Deno.build.os === "linux") {
  binaryPath = join(__dirname, "bin", "gmqttd-linux-amd64");
  yamlPath = join(__dirname, "bin", "gmqttd.yml");
} else {
  log.critical("⚠ Unsupported platform: " + Deno.build.os);
}

if (!binaryPath) {
  Deno.exit(0);
}

// Parse args
let processArgs = [...new Set([...["start"], ...Deno.args])];
const args = parse(processArgs);

if (!args.c) {
  args.c = yamlPath;
  processArgs = ["start", "-c", args.c];
}

// Yaml - interface
interface listener {
  websocket: string;
  address: number;
}

// Read config yaml
try {
  const yamlFile = Deno.readFileSync(args.c);
  const yamltext = new TextDecoder("utf-8").decode(yamlFile);
  const data = yamlParse(yamltext) as Record<string, any>;
  console.log(typeof data);
  // Bind TCP/WS
  data.listeners.forEach((item: listener) => {
    log.info(
      `${format(new Date(), "MM-dd-yyyy HH:mm:ss.SSS")}  ${
        item.websocket ? "Websocket server" : "TCP server"
      } listen on ["${item.address}"]`,
    );
  });
} catch (e) {
  log.critical(e);
}

// create webview
const gmqtt = Deno.run({
  cmd: [binaryPath, ...processArgs.filter((x) => x != "-d")],
  stdout: args.d ? "inherit" : "piped",
  stderr: "piped",
});

// Defer
setTimeout(() => {
  // TCP status
  Deno.connect({ port: 1883 })
    .then((conn) => {
      log.info(
        `${
          format(new Date(), "MM-dd-yyyy HH:mm:ss.SSS")
        }  MQTT Server started ...`,
      );
      conn.close();
    })
    .catch((e) => log.warning(e));
}, 1000);

// await its completion
const { code } = await gmqtt.status();
const rawOutput = await gmqtt.output();
const rawError = await gmqtt.stderrOutput();

if (code === 0) {
  await Deno.stdout.write(rawOutput);
} else {
  const errorString = new TextDecoder().decode(rawError);
  log.warning(errorString);
}

Deno.exit(code);

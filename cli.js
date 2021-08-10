#!/usr/bin/env node
var child_process = require("child_process");
var path = require("path");

var binaryPath;
if (process.platform === "win32") {
  binaryPath = path.join(__dirname, "bin", "gmqttd-win32-amd64.exe");
} else if (process.platform === "darwin") {
  throw new Error("Unsupported platform: " + process.platform + " Cooming soon!");
} else if (process.platform === "linux") {
  binaryPath = path.join(__dirname, "bin", "gmqttd-linux-amd64");
} else {
  throw new Error("Unsupported platform: " + process.platform);
}

try {
  child_process.execFileSync(binaryPath, process.argv.slice(2), {
    cwd: process.cwd(),
  });
} catch (err) {
  process.exitCode = 1;
}

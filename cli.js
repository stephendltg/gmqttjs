#!/usr/bin/env node
var child_process = require("child_process");
var path = require("path");
const fs   = require('fs');
const yaml = require('js-yaml');
const argv = require('yargs-parser')(process.argv.slice(2))

const yamlPath = path.join(__dirname, "bin", "gmqttd.yml");

var binaryPath;
if (process.platform === "win32") {
  binaryPath = path.join(__dirname, "bin", "gmqttd-win32-amd64.exe");
} else if (process.platform === "darwin") {
  binaryPath = path.join(__dirname, "bin", "gmqttd-darwin-amd64");
} else if (process.platform === "linux") {
  binaryPath = path.join(__dirname, "bin", "gmqttd-linux-amd64");
} else {
  throw new Error("Unsupported platform: " + process.platform);
}


// Parse args
let processArgs = [...new Set([...['start'] ,...process.argv.slice(2)])]
const args = require('yargs-parser')(processArgs)

if (!args.c) {
  args.c = yamlPath
  processArgs = [ "start", "-c", args.c ]
}

// Read config
try {
  const data = yaml.load(fs.readFileSync(args.c, 'utf8'));
  data.listeners.forEach( item => {
    console.log(`${item.websocket ? 'Websocket server': 'TCP server'} listen on ["${item.address}"]` )
  });
} catch (e) {
  console.log(e);
}

// Run
try {
  child_process.execFileSync(binaryPath, processArgs.filter( x => x != '-d' ), {
    cwd: process.cwd(),
    stdio: args.d ? 'inherit' : 'pipe'
  });
} catch (err) {
  process.exitCode = 1;
}

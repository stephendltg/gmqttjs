#!/usr/bin/env deno run --unstable --allow-env --allow-read --allow-plugin
import {
  ansi,
  Cell,
  Checkbox,
  colors,
  Command,
  Confirm,
  Input,
  Number,
  prompt,
  Select,
  Table,
  Toggle,
  tty,
} from "./deps.ts";

const error = colors.bold.red;
const warn = colors.bold.yellow;
const info = colors.bold.blue;

// Clear screen
tty.cursorSave
  .cursorHide
  .cursorTo(0, 0)
  .eraseScreen();

// help & args
const { options } = await new Command()
  .name("Moomin MQTT")
  .version("0.1.0")
  .description("Command line for MQTT")
  .option("-d, --debug [enable:boolean]", "output extra debugging.", {
    default: false,
  })
  .option("-p, --port <port>", "MQTT port number.", {
    default: 1883,
    required: true,
  })
  .option("-h, --host [hostname:string]", "MQTT host name.", {
    default: "localhost",
    required: true,
  })
  .option("-u, --username [username:string]", "MQTT username.", {
    default: null,
  })
  .option("-u, --password [password:string]", "MQTT password.", {
    default: null,
  })
  .parse(Deno.args);

// Clear screen
tty.cursorSave
  .cursorHide
  .cursorTo(0, 0)
  .eraseScreen();

// Title
Table.from([
  [Cell.from(colors.bold.underline.rgb24("Welcome!", 0xff3333)).colSpan(3)],
  [],
])
  .align("center")
  .minColWidth(40)
  .render();

// Resume
const table: Table = new Table()
  .body([
    ["v0.1.0", Cell.from(info("MOOMIN")).rowSpan(2).colSpan(2)],
    ["@stephendltg"],
    [
      Cell.from(warn("MQTT")).rowSpan(2),
      options.host,
      options.port,
    ],
    [
      Cell.from(
        `username: ${options.username ||
          "null"} / password: ${options.password || "null"}`,
      ).colSpan(2),
    ],
  ])
  .border(true)
  .align("center")
  .minColWidth(40)
  .render();



// scenario
const result = await prompt([{
  name: "animals",
  message: "Select some animal's",
  type: Checkbox,
  options: ["dog", "cat", "snake"],
}, {
  name: "like",
  message: "Do you like animal's?",
  type: Confirm,
  after: async ({ like }, next) => { // executed after like prompt
    if (like) {
      await next(); // run age prompt
    } else {
      await next("like"); // run like prompt again
    }
  },
}, {
  name: "age",
  message: "How old are you?",
  type: Number,
  before: async ({ animals }, next) => { // executed before age prompt
    console.log(animals);
    if (animals?.length === 3) {
      await next(); // run age prompt
    } else {
      await next("animals"); // begin from start
    }
  },
}]);

console.log(result);

// Prompt
const name: string = await Input.prompt(`What's your name?`);
const surname: string = await Input.prompt(`What's your name?`);
const age: number = await Number.prompt("How old are you?");
const confirmed: boolean = await Confirm.prompt("Can you confirm?");
const test: boolean = await Toggle.prompt("Can you confirm?");
const background: string = await Select.prompt({
  message: "Pick a color",
  options: [
    { name: "Red", value: "#ff0000" },
    { name: "Green", value: "#00ff00", disabled: true },
    { name: "Blue", value: "#0000ff" },
    Select.separator("--------"),
    { name: "White", value: "#ffffff" },
    { name: "Black", value: "#000000" },
  ],
});
const color: string = await Input.prompt({
  message: "Choose a color",
  list: true,
  info: true,
  suggestions: [
    "Abbey",
    "Absolute Zero",
    "Acadia",
    "Acapulco",
    "Acid Green",
    "Aero",
    "Aero Blue",
    "Affair",
    "African Violet",
    "Air Force Blue",
  ],
});

// Move cursor
console.log(
  ansi.cursorUp(2).cursorLeft.eraseDown(0).toString(),
);

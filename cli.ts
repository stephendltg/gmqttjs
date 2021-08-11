#!/usr/bin/env deno run --unstable --allow-env --allow-read --allow-plugin
import { 
  ansi,
  colors,
  tty,
  Table,
  Command,
  Input,
  Confirm,
  Toggle,
  Number,
  Select,
  Checkbox,
  prompt
} from "./deps.ts"


const error = colors.bold.red;
const warn = colors.bold.yellow;
const info = colors.bold.blue;

// help & args
const { options } = await new Command()
  .name("cliffy")
  .version("0.1.0")
  .description("Command line framework for Deno")
  .option("-s, --silent", "disable output.")
  .option("-d, --debug [level]", "output extra debugging.")
  .option("-p, --port <port>", "the port number.")
  .option("-h, --host [hostname]", "the host name.", { default: "localhost" })
  .option("-a, --allow [hostname]", "the host name.", { default: "localhost" })
  .parse(Deno.args);

// Clear screen
tty.cursorSave
  .cursorHide
  .cursorTo(0, 0)
  .eraseScreen();

// Title
console.log(
  colors.bold.underline.rgb24("Welcome to Deno.Land!", 0xff3333),
);

console.log(error("[ERROR]"), "Some error!");

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
    console.log(animals)
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
  ansi.cursorUp(2).cursorLeft.eraseDown(0).toString()
);

const table: Table = new Table()
.header(["Name", "Date", "City", "Country"])
.body([
  ["Baxter Herman", "Oct 1, 2020", "Harderwijk", "Slovenia"],
  ["Jescie Wolfe", "Dec 4, 2020", "Alto Hospicio", "Japan"],
  ["Allegra Cleveland", "Apr 16, 2020", "Avernas-le-Bauduin", "Samoa"],
  ["Aretha Gamble", "Feb 22, 2021", "Honolulu", "Georgia"],
])
.maxColWidth(10)
.padding(1)
.indent(2)
.border(true)
.render();

table.push(["Aretha Gamble", "Feb 22, 2021", "Honolulu", "Georgia"]);
table.sort();
table.render();

// Actions
console.log("server running at %s:%s", options.host, options.port);
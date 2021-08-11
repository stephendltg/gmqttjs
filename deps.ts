/**
 * deps.ts
 *
 * This module re-exports the required methods from the dependant remote Ramda module.
 **/

export {
  ansi,
  colors,
  cursorTo,
  tty,
} from "https://deno.land/x/cliffy@v0.19.4/ansi/mod.ts";

/**
 * 
 */
export { Command } from "https://deno.land/x/cliffy@v0.19.4/command/mod.ts";

/**
 * Prompt
 */
export {
  Checkbox,
  Confirm,
  Input,
  Number,
  prompt,
  Toggle,
  Select
} from "https://deno.land/x/cliffy@v0.19.4/prompt/mod.ts";

/**
 * Table
 */
export { Table } from "https://deno.land/x/cliffy@v0.19.4/table/mod.ts";
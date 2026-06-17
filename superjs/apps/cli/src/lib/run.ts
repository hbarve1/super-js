/**
 * Argument parsing + command dispatch. `run()` is the testable entry point: it
 * takes an argv array and an {@link IO}, runs one command, and returns the exit
 * code. `main.ts` is the only place that touches `process`.
 */

import { type IO, nodeIO, line, errline } from './io.js';
import {
  type ParsedArgs, VERSION, check, build, translate, add, fmt, explain, init, doctor, stub,
} from './commands.js';

const STUBS = new Set(['lint', 'doc', 'verify', 'migrate', 'test', 'lsp', 'repl']);

/** Parse `argv` into command + positionals + `--flag[=value]` map. */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  const [command = '', ...rest] = argv;
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const tok = rest[i]!;
    if (tok.startsWith('--')) {
      const body = tok.slice(2);
      const eq = body.indexOf('=');
      if (eq >= 0) { flags[body.slice(0, eq)] = body.slice(eq + 1); continue; }
      // `--flag value` if the next token isn't another flag; else boolean.
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith('--')) { flags[body] = next; i++; }
      else flags[body] = true;
    } else {
      positionals.push(tok);
    }
  }
  return { command, positionals, flags };
}

const HELP = `superjs ${VERSION} — the SuperJS compiler

usage: superjs <command> [options]

commands:
  build <files...>     compile to JS (+ source maps) under --out-dir (default dist)
  check <files...>     type-check and report diagnostics  [--format pretty|json]
  translate <d.ts...>  translate TypeScript .d.ts declarations to .d.sjs  [--out-dir dir]
  add <package>        resolve an installed npm package's types to .d.sjs
  format <files...>    rewrite .sjs files in canonical style  [--check]
  explain <CODE>       describe a diagnostic code, e.g. superjs explain E001
  init                 write a default ${'superjs.config.json'}
  doctor               report environment + toolchain health

  lint doc verify migrate test lsp repl   (planned — later stages)

options:
  -h, --help           show this help
  -v, --version        print the version`;

/** Run one CLI invocation. Returns the process exit code. */
export async function run(argv: readonly string[], io: IO = nodeIO): Promise<number> {
  const args = parseArgs(argv);
  const { command } = args;

  if (command === '' || command === 'help' || command === '--help' || command === '-h'
      || args.flags['help'] === true || hasShort(argv, '-h')) {
    line(io, HELP);
    return 0;
  }
  if (command === 'version' || command === '--version' || command === '-v'
      || args.flags['version'] === true || hasShort(argv, '-v')) {
    line(io, VERSION);
    return 0;
  }

  switch (command) {
    case 'check': return check(args, io);
    case 'build': return build(args, io);
    case 'translate': return translate(args, io);
    case 'add': return add(args, io);
    case 'format': return fmt(args, io);
    case 'explain': return explain(args, io);
    case 'init': return init(args, io);
    case 'doctor': return doctor(args, io);
    default:
      if (STUBS.has(command)) return stub(command, io);
      errline(io, `unknown command '${command}'. Run 'superjs --help'.`);
      return 64;
  }
}

function hasShort(argv: readonly string[], flag: string): boolean {
  return argv.includes(flag);
}

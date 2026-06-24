/**
 * Argument parsing + command dispatch. `run()` is the testable entry point: it
 * takes an argv array and an {@link IO}, runs one command, and returns the exit
 * code. `main.ts` is the only place that touches `process`.
 */

import { type IO, nodeIO, line, errline } from './io.js';
import {
  type ParsedArgs, VERSION, check, build, translate, add, fmt, lintCmd, docCmd, docgenCmd, explain, init, doctor, lsp, verify, migrate, stub,
} from './commands.js';

const STUBS = new Set(['test', 'repl']);

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
  translate <d.ts...>  translate TypeScript .d.ts declarations to .d.sjs  [--out-dir dir] [--stats]
  add <package>        resolve an installed npm package's types to .d.sjs
  format <files...>    rewrite .sjs files in canonical style  [--check]
  lint <files...>      report style findings (SJS-L*)  [--format pretty|json] [--fix]
  doc <files...>       generate API docs from exports  [--format md|json] [--out-dir dir]
  docgen <files...>    generate docs/api Markdown pages  [--out dir]
  explain <CODE>       describe a diagnostic code, e.g. superjs explain E001
  init [template]      write a default config, or scaffold a template
                       (node-cli, fastify-api, workers-api, lambda-handler)
  doctor               report environment + toolchain health
  lsp                  start the language server over stdio (for editors)
  verify <in> <out>    recompile <in> and byte-diff against expected <out>
  migrate from-ts <dir>         assisted TypeScript → SuperJS migration (+ report)
  migrate from-prototype <dir>  rewrite prototype-era imports → @superjs/* (+ report)
                                [--dry-run] [--out <dir>]

  test repl            (planned — later stages)

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
    case 'lint': return lintCmd(args, io);
    case 'doc': return docCmd(args, io);
    case 'docgen': return docgenCmd(args, io);
    case 'explain': return explain(args, io);
    case 'init': return init(args, io);
    case 'doctor': return doctor(args, io);
    case 'lsp': return lsp(args, io);
    case 'verify': return verify(args, io);
    case 'migrate': return migrate(args, io);
    default:
      if (STUBS.has(command)) return stub(command, io);
      errline(io, `unknown command '${command}'. Run 'superjs --help'.`);
      return 64;
  }
}

function hasShort(argv: readonly string[], flag: string): boolean {
  return argv.includes(flag);
}

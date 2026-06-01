#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../package.json';
import { compile } from './compiler';
import { lint } from './linter';
import { format } from './formatter';
import { runTests } from './tester';
import { Watcher } from './watch/watcher';
import { formatDiagnosticsAsJson } from './diagnostic';
import type { Diagnostic } from './typeChecker/types';

const c = {
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
};

const program = new Command();

program
  .name('superjs')
  .description('super.js compiler and development tools')
  .version(version);

program
  .command('build')
  .description('Build the project')
  .option('-w, --watch', 'Watch mode')
  .option('-o, --outDir <dir>', 'Output directory', './dist')
  .option('-s, --source <file>', 'Source file to compile')
  .option('-d, --dir <directory>', 'Directory containing .sjs files to compile')
  .option('-t, --target <version>', 'JavaScript version to target (es5, es2015, es2016, es2017, es2018, es2019, es2020, es2021, es2022)', 'es2022')
  .option('--jsx-pragma <pragma>', 'JSX pragma to use (default: React.createElement)')
  .option('--jsx-fragment-pragma <pragma>', 'JSX fragment pragma to use (default: React.Fragment)')
  .option('--no-emit', 'Type-check only; do not write output files')
  .option('--sourcemap', 'Emit source maps alongside output (.js.map)')
  .option('--strict', 'Enable strict mode (SJS-W001: implicit any warnings)')
  .option('--json', 'Emit diagnostics as ndjson (one JSON object per line)')
  .action(async (options) => {
    try {
      if (options.watch) {
        const root = options.dir
          ? options.dir
          : options.source
            ? require('path').dirname(require('path').resolve(options.source))
            : process.cwd();
        const outDir = options.outDir ?? './dist';
        const watcher = new Watcher(root, outDir);
        const pattern = options.source ?? `${root}/**/*.sjs`;
        console.log(`Watching ${pattern} ...`);
        await watcher.start(pattern, (results) => {
          for (const [file, status] of results) {
            const icon = status === 'ok' ? '✓' : status === 'error' ? '✗' : '⊘';
            console.log(`  ${icon} ${file} [${status}]`);
          }
        });
        // Keep process alive until SIGINT
        await new Promise<void>((resolve) => {
          process.once('SIGINT', async () => {
            await watcher.stop();
            resolve();
          });
        });
      } else {
        const buildStart = Date.now();
        try {
          await compile({
            outDir: options.outDir,
            sourceFile: options.source,
            directory: options.dir,
            target: options.target,
            jsxPragma: options.jsxPragma,
            jsxFragmentPragma: options.jsxFragmentPragma,
            noEmit: options.noEmit,
            strict: options.strict,
          });
          const elapsed = Date.now() - buildStart;
          console.log(c.green(c.bold('Build succeeded')) + c.dim(` in ${elapsed}ms`));
        } catch (err: unknown) {
          const elapsed = Date.now() - buildStart;
          if (options.json && err instanceof Error && 'diagnostics' in err) {
            const diags = (err as { diagnostics: Diagnostic[] }).diagnostics;
            formatDiagnosticsAsJson(diags).forEach(l => process.stdout.write(l + '\n'));
            process.exit(1);
          }
          console.error(c.red(c.bold('Build failed')) + c.dim(` in ${elapsed}ms`));
          throw err;
        }
      }
    } catch (error) {
      if (!options.json) console.error(c.red('Build failed:'), error);
      process.exit(1);
    }
  });

program
  .command('lint')
  .description('Lint source files')
  .option('--fix', 'Automatically fix problems')
  .option('-s, --source <file>', 'Source file to lint')
  .option('-d, --dir <directory>', 'Directory containing .sjs files to lint')
  .option('--json', 'Emit diagnostics as ndjson (one JSON object per line)')
  .action(async (options) => {
    try {
      const diags = await lint({
        fix: options.fix,
        sourceFile: options.source,
        directory: options.dir,
        json: options.json,
      });
      const errors   = diags.filter(d => d.severity === 'error').length;
      const warnings = diags.filter(d => d.severity === 'warning').length;
      if (!options.json) {
        if (errors > 0) {
          console.log(c.red(`${errors} error(s), ${warnings} warning(s)`));
        } else if (warnings > 0) {
          console.log(c.yellow(`${warnings} warning(s)`));
        } else {
          console.log(c.green('No lint issues found'));
        }
      }
    } catch (error) {
      console.error(c.red('Linting failed:'), error);
      process.exit(1);
    }
  });

program
  .command('format')
  .description('Format source files')
  .option('--check', 'Check if files are formatted')
  .option('-s, --source <file>', 'Source file to format')
  .option('-d, --dir <directory>', 'Directory containing .sjs files to format')
  .action(async (options) => {
    try {
      await format({
        check: options.check,
        sourceFile: options.source,
        directory: options.dir,
      });
      if (!options.check) console.log(c.green('Format complete'));
    } catch (error) {
      console.error(c.red('Formatting failed:'), error);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Run tests')
  .option('-w, --watch', 'Watch mode')
  .option('--coverage', 'Generate coverage report')
  .option('-s, --source <file>', 'Source file or pattern to test')
  .action(async (options) => {
    try {
      const result = await runTests({
        watch: options.watch,
        coverage: options.coverage,
        pattern: options.source,
      });
      const summary = `${result.passed} passed, ${result.failed} failed, ${result.total} total`;
      if (result.failed > 0) {
        console.log(c.red(c.bold('Tests failed')) + ' — ' + summary);
        process.exit(1);
      } else {
        console.log(c.green(c.bold('Tests passed')) + ' — ' + summary);
      }
    } catch (error) {
      console.error(c.red('Tests failed:'), error);
      process.exit(1);
    }
  });

program.parse(); 
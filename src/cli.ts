#!/usr/bin/env node

import { Command } from 'commander';
import { version } from '../package.json';
import { compile } from './compiler';
import { lint } from './linter';
import { format } from './formatter';
import { runTests } from './tester';

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
  .action(async (options) => {
    try {
      await compile({
        watch: options.watch,
        outDir: options.outDir,
        sourceFile: options.source,
        directory: options.dir,
        target: options.target,
        jsxPragma: options.jsxPragma,
        jsxFragmentPragma: options.jsxFragmentPragma
      });
    } catch (error) {
      console.error('Build failed:', error);
      process.exit(1);
    }
  });

program
  .command('lint')
  .description('Lint source files')
  .option('--fix', 'Automatically fix problems')
  .option('-s, --source <file>', 'Source file to lint')
  .action(async (options) => {
    try {
      await lint({
        fix: options.fix,
        sourceFile: options.source
      });
    } catch (error) {
      console.error('Linting failed:', error);
      process.exit(1);
    }
  });

program
  .command('format')
  .description('Format source files')
  .option('--check', 'Check if files are formatted')
  .option('-s, --source <file>', 'Source file to format')
  .action(async (options) => {
    try {
      await format({
        check: options.check,
        sourceFile: options.source
      });
    } catch (error) {
      console.error('Formatting failed:', error);
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
      await runTests({
        watch: options.watch,
        coverage: options.coverage,
        sourceFile: options.source
      });
    } catch (error) {
      console.error('Tests failed:', error);
      process.exit(1);
    }
  });

program.parse(); 
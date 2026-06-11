/**
 * IO seam. Every command takes an {@link IO} so the CLI core is pure and
 * testable: tests pass an in-memory IO and assert on captured output without
 * touching the real filesystem or stdout.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface IO {
  /** Write to stdout (no trailing newline added). */
  out(text: string): void;
  /** Write to stderr. */
  err(text: string): void;
  readFile(path: string): string;
  writeFile(path: string, data: string): void;
  exists(path: string): boolean;
  cwd(): string;
}

/** The production IO bound to node:fs and process streams. */
export const nodeIO: IO = {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
  readFile: (path) => readFileSync(path, 'utf8'),
  writeFile: (path, data) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data, 'utf8');
  },
  exists: (path) => existsSync(path),
  cwd: () => process.cwd(),
};

/** A line writer helper (appends `\n`). */
export function line(io: IO, text = ''): void {
  io.out(`${text}\n`);
}
export function errline(io: IO, text = ''): void {
  io.err(`${text}\n`);
}

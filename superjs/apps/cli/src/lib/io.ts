/**
 * IO seam. Every command takes an {@link IO} so the CLI core is pure and
 * testable: tests pass an in-memory IO and assert on captured output without
 * touching the real filesystem or stdout.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync, watch as fsWatch } from 'node:fs';
import { dirname } from 'node:path';

/** Stops watching when called. */
export type Unwatch = () => void;

export interface IO {
  /** Write to stdout (no trailing newline added). */
  out(text: string): void;
  /** Write to stderr. */
  err(text: string): void;
  readFile(path: string): string;
  writeFile(path: string, data: string): void;
  exists(path: string): boolean;
  isDirectory(path: string): boolean;
  /** Immediate child entry names of a directory. */
  readDir(path: string): string[];
  cwd(): string;
  /** Watch `paths`; call `onChange(path)` when one changes. Returns a disposer. */
  watch(paths: readonly string[], onChange: (path: string) => void): Unwatch;
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
  isDirectory: (path) => { try { return statSync(path).isDirectory(); } catch { return false; } },
  readDir: (path) => readdirSync(path),
  cwd: () => process.cwd(),
  watch: (paths, onChange) => {
    const watchers = paths.map((p) => fsWatch(p, () => onChange(p)));
    return () => { for (const w of watchers) w.close(); };
  },
};

/** A line writer helper (appends `\n`). */
export function line(io: IO, text = ''): void {
  io.out(`${text}\n`);
}
export function errline(io: IO, text = ''): void {
  io.err(`${text}\n`);
}

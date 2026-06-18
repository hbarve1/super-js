// @superjs/std-fs — Result-returning wrappers over Node's synchronous fs.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

export type FsResult<T> = FsOk(T) | FsErr(string);

export function readText(path: string): FsResult<string> {
  try {
    return FsOk(readFileSync(path, "utf8"));
  } catch (e) {
    return FsErr("cannot read " + path);
  }
}

export function writeText(path: string, data: string): FsResult<boolean> {
  try {
    writeFileSync(path, data);
    return FsOk(true);
  } catch (e) {
    return FsErr("cannot write " + path);
  }
}

export function exists(path: string): boolean {
  return existsSync(path);
}

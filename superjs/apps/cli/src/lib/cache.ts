/**
 * Disk-backed {@link CacheStore} for `superjs build`, persisted under
 * `.superjs/cache/`. Goes through the {@link IO} seam (not node:fs directly) so
 * the build command stays testable with a virtual filesystem.
 *
 * Each entry is one JSON file named by its cache key
 * (`fileSHA256:version:configHash`), with `:` rewritten to `_` so the filename
 * is portable (Windows rejects `:`). A corrupt or unreadable entry is a miss.
 */

import { join } from 'node:path';
import type { CacheStore, CacheEntry } from '@superjs/compiler';
import type { IO } from './io.js';

export const CACHE_DIR = '.superjs/cache';

export class DiskCacheStore implements CacheStore {
  constructor(private readonly io: IO, private readonly dir: string) {}

  private path(key: string): string {
    return join(this.dir, `${key.replace(/:/g, '_')}.json`);
  }

  get(key: string): CacheEntry | undefined {
    const p = this.path(key);
    if (!this.io.exists(p)) return undefined;
    try {
      return JSON.parse(this.io.readFile(p)) as CacheEntry;
    } catch {
      return undefined; // corrupt entry → miss
    }
  }

  set(key: string, entry: CacheEntry): void {
    this.io.writeFile(this.path(key), JSON.stringify(entry));
  }
}

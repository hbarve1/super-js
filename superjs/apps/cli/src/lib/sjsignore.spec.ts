import { describe, it, expect } from 'vitest';
import { parseSjsignore } from './sjsignore.js';

describe('parseSjsignore', () => {
  it('ignores a directory pattern at any depth', () => {
    const m = parseSjsignore('node_modules/');
    expect(m.ignores('node_modules/a.sjs')).toBe(true);
    expect(m.ignores('pkg/node_modules/b.sjs')).toBe(true);
    expect(m.ignores('src/a.sjs')).toBe(false);
  });

  it('matches a wildcard extension at any depth', () => {
    const m = parseSjsignore('*.gen.sjs');
    expect(m.ignores('x.gen.sjs')).toBe(true);
    expect(m.ignores('src/deep/y.gen.sjs')).toBe(true);
    expect(m.ignores('src/y.sjs')).toBe(false);
  });

  it('anchors a leading-slash pattern to the root', () => {
    const m = parseSjsignore('/vendor');
    expect(m.ignores('vendor/a.sjs')).toBe(true);
    expect(m.ignores('src/vendor/a.sjs')).toBe(false);
  });

  it('lets a later negation re-include a file', () => {
    const m = parseSjsignore('*.sjs\n!keep.sjs');
    expect(m.ignores('a.sjs')).toBe(true);
    expect(m.ignores('keep.sjs')).toBe(false);
  });

  it('skips comments and blank lines', () => {
    const m = parseSjsignore('# a comment\n\n   \n');
    expect(m.ignores('anything.sjs')).toBe(false);
  });
});

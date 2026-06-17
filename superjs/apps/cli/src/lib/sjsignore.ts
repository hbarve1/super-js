/**
 * `.sjsignore` — a gitignore-style ignore file honoured by directory expansion
 * in `superjs format` / `lint` / `check` / `build` / `doc`. Explicitly-named
 * files are never filtered; only paths discovered by walking a directory are.
 *
 * Supported subset: `#` comments, blank lines, `!` negation (later patterns win),
 * trailing `/` for directory-only, leading `/` to anchor at the ignore root,
 * and `*` / `**` / `?` wildcards. A pattern without a slash matches at any depth.
 */

interface Rule {
  readonly re: RegExp;
  readonly negated: boolean;
}

export interface IgnoreMatcher {
  /** True if `relPath` (POSIX, relative to the ignore root) is ignored. */
  ignores(relPath: string): boolean;
}

const MATCH_NOTHING: IgnoreMatcher = { ignores: () => false };

/** Escape a literal run for use inside a RegExp (wildcards handled separately). */
function escapeLiteral(s: string): string {
  return s.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

/** Compile one gitignore-style glob to a RegExp over a full relative path. */
function compile(pattern: string, anchored: boolean): RegExp {
  let body = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === '*') {
      if (pattern[i + 1] === '*') { body += '.*'; i++; }
      else body += '[^/]*';
    } else if (c === '?') {
      body += '[^/]';
    } else {
      body += escapeLiteral(c);
    }
  }
  const prefix = anchored ? '^' : '(?:^|/)';
  // Match the path itself or anything beneath it (so a dir pattern ignores its contents).
  return new RegExp(`${prefix}${body}(?:/|$)`);
}

/** Parse `.sjsignore` content into a matcher. */
export function parseSjsignore(content: string): IgnoreMatcher {
  const rules: Rule[] = [];
  for (const raw of content.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (line.length === 0 || line.startsWith('#')) continue;
    const negated = line.startsWith('!');
    let pat = negated ? line.slice(1) : line;
    if (pat.endsWith('/')) pat = pat.slice(0, -1); // directory marker — content still matched by the suffix
    // A leading slash, or any internal slash, anchors the pattern to the root.
    const leadingSlash = pat.startsWith('/');
    if (leadingSlash) pat = pat.slice(1);
    const anchored = leadingSlash || pat.includes('/');
    if (pat.length === 0) continue;
    rules.push({ re: compile(pat, anchored), negated });
  }
  if (rules.length === 0) return MATCH_NOTHING;
  return {
    ignores(relPath: string): boolean {
      let ignored = false;
      for (const r of rules) {
        if (r.re.test(relPath)) ignored = !r.negated; // last matching rule wins
      }
      return ignored;
    },
  };
}

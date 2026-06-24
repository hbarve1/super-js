// @superjs/std-string — string helpers (thin, total wrappers over JS string ops).

/** Remove leading and trailing whitespace. */
export function trim(s: string): string {
  return s.trim();
}

export function lower(s: string): string {
  return s.toLowerCase();
}

export function upper(s: string): string {
  return s.toUpperCase();
}

export function split(s: string, sep: string): string[] {
  return s.split(sep);
}

export function join(parts: string[], sep: string): string {
  return parts.join(sep);
}

export function includes(s: string, needle: string): boolean {
  return s.includes(needle);
}

export function startsWith(s: string, prefix: string): boolean {
  return s.startsWith(prefix);
}

export function endsWith(s: string, suffix: string): boolean {
  return s.endsWith(suffix);
}

export function replace(s: string, target: string, replacement: string): string {
  return s.replaceAll(target, replacement);
}

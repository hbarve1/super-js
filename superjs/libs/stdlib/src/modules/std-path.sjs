// @superjs/std-path — POSIX-style path helpers (pure string logic, no host deps).

export function basename(p: string): string {
  const parts = p.split("/");
  const last = parts[parts.length - 1];
  return last;
}

export function dirname(p: string): string {
  const parts = p.split("/");
  if (parts.length <= 1) {
    return ".";
  }
  return parts.slice(0, parts.length - 1).join("/");
}

export function extname(p: string): string {
  const base = basename(p);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot) : "";
}

export function join(a: string, b: string): string {
  if (a.endsWith("/")) {
    return a + b;
  }
  return a + "/" + b;
}

export function isAbsolute(p: string): boolean {
  return p.startsWith("/");
}

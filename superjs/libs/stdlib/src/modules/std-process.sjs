// @superjs/std-process — typed access to the process environment.

export function args(): string[] {
  return process.argv.slice(2);
}

export function env(key: string): string? {
  return process.env[key];
}

export function cwd(): string {
  return process.cwd();
}

export function platform(): string {
  return process.platform;
}

export function exit(code: number): void {
  process.exit(code);
}

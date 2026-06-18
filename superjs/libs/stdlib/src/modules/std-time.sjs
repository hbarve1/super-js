// @superjs/std-time — instants and durations over the JS Date/clock.

export const SECOND: number = 1000;
export const MINUTE: number = 60000;
export const HOUR: number = 3600000;
export const DAY: number = 86400000;

export function nowMs(): number {
  return Date.now();
}

export function toISO(ms: number): string {
  return new Date(ms).toISOString();
}

export function seconds(n: number): number {
  return n * SECOND;
}

export function minutes(n: number): number {
  return n * MINUTE;
}

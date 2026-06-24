// @superjs/std-math — numeric helpers over the JS Math global.

/** Ratio of a circle's circumference to its diameter. */
export const PI: number = 3.141592653589793;
/** Euler's number. */
export const E: number = 2.718281828459045;

/** Absolute value (sign stripped). */
export function abs(x: number): number {
  return x < 0 ? -x : x;
}

export function sign(x: number): number {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}

export function min(a: number, b: number): number {
  return a < b ? a : b;
}

export function max(a: number, b: number): number {
  return a > b ? a : b;
}

/** Clamp `x` to the inclusive range `[lo, hi]`. */
export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function floor(x: number): number {
  return Math.floor(x);
}

export function ceil(x: number): number {
  return Math.ceil(x);
}

export function round(x: number): number {
  return Math.round(x);
}

export function sqrt(x: number): number {
  return Math.sqrt(x);
}

export function pow(base: number, exp: number): number {
  return Math.pow(base, exp);
}

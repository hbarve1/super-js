// L3: Object/Number/Math static methods

// Object static methods
const obj = { a: 1, b: "hello", c: true };

const keys: string[] = Object.keys(obj);
const vals: any[] = Object.values(obj);
const entries: [string, any][] = Object.entries(obj);

const fromEntries: object = Object.fromEntries([["x", 1], ["y", 2]]);

const target = { x: 1 };
const merged = Object.assign(target, { y: 2 }, { z: 3 });

const hasOwn: boolean = Object.hasOwn(obj, "a");

// Object.groupBy (ES2024)
const items = ["apple", "banana", "avocado", "blueberry"];
const byLetter: Partial<Record<string, string[]>> = Object.groupBy(
  items,
  item => item[0]
);

// Number static methods
const isNaN: boolean = Number.isNaN(NaN);
const isFinite: boolean = Number.isFinite(Infinity);
const isInt: boolean = Number.isInteger(3.0);
const isSafe: boolean = Number.isSafeInteger(Number.MAX_SAFE_INTEGER);
const parsed: number = Number.parseFloat("3.14");
const parsedInt: number = Number.parseInt("42px", 10);

// Math methods — all return number
const abs: number = Math.abs(-5);
const floor: number = Math.floor(3.7);
const ceil: number = Math.ceil(3.2);
const round: number = Math.round(3.5);
const min: number = Math.min(1, 2, 3);
const max: number = Math.max(1, 2, 3);
const sqrt: number = Math.sqrt(16);
const pow: number = Math.pow(2, 10);
const rand: number = Math.random();
const log: number = Math.log(Math.E);
const sin: number = Math.sin(Math.PI / 2);

// Math.sumPrecise (ES2025) — avoids floating point drift
const precise: number = Math.sumPrecise([0.1, 0.2, 0.3]);

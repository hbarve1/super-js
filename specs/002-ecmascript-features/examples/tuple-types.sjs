// T1: Tuple types — fixed-length arrays with per-index types

// Basic tuple
const point: [number, number] = [3, 4];
const x: number = point[0];
const y: number = point[1];

// Labeled tuple (for readability)
const rgb: [r: number, g: number, b: number] = [255, 128, 0];

// Heterogeneous tuple
const entry: [string, number, boolean] = ["Alice", 30, true];
const name: string = entry[0];
const age: number = entry[1];
const active: boolean = entry[2];

// Destructuring tuples
const [first, second, third] = entry;
// first: string, second: number, third: boolean

// Rest in tuple — variadic tuple
type StringsAndNumber = [...string[], number];
const variadic: StringsAndNumber = ["a", "b", 42];

// Optional tuple elements
type Maybe = [string, number?];
const m1: Maybe = ["hello"];
const m2: Maybe = ["hello", 42];

// Tuple from function return
function minMax(nums: number[]): [number, number] {
  return [Math.min(...nums), Math.max(...nums)];
}
const [min, max] = minMax([3, 1, 4, 1, 5, 9]);
// min: number, max: number

// Tuple as function params via spread
function add(a: number, b: number): number { return a + b; }
const args: [number, number] = [1, 2];
const sum: number = add(...args);

// Readonly tuple
const frozen: readonly [number, string] = [1, "hello"];
// frozen[0] = 2; // SJS-E010: readonly

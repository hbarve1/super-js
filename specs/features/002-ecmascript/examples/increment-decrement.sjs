// E1: Increment/decrement operators (++/--)

// Prefix increment — returns new value
let n: number = 5;
const pre: number = ++n; // pre = 6, n = 6

// Postfix increment — returns old value
let m: number = 5;
const post: number = m++; // post = 5, m = 6

// Decrement
let count: number = 10;
count--;
--count;
// count = 8

// BigInt increment/decrement
let big: bigint = 100n;
big++;
big--;
const bigPre: bigint = ++big;

// In loops — typical use
function sum(n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) { // i: number throughout
    total += i;
  }
  return total;
}

// Array traversal with decrement
function findLast<T>(arr: T[], pred: (x: T) => boolean): T | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return arr[i];
  }
  return undefined;
}

// Cannot increment strings or booleans
// let s: string = "hello";
// s++; // SJS-E002: operand must be number or bigint

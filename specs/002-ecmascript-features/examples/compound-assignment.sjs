// E3: Compound assignment operators — +=, -=, *=, /=, %=, **=

let n: number = 10;

n += 5;   // n = 15 — type: number
n -= 3;   // n = 12
n *= 2;   // n = 24
n /= 4;   // n = 6
n %= 4;   // n = 2
n **= 3;  // n = 8

// String concatenation with +=
let s: string = "Hello";
s += ", World"; // s = "Hello, World" — type: string

// BigInt compound assignment
let b: bigint = 100n;
b += 50n;
b -= 10n;
b *= 2n;
b /= 5n;
b **= 2n;

// Bitwise compound assignment
let flags: number = 0b1010;
flags &= 0b1100; // AND
flags |= 0b0001; // OR
flags ^= 0b0011; // XOR
flags <<= 1;     // left shift
flags >>= 1;     // right shift
flags >>>= 1;    // unsigned right shift

// Type must be consistent — number op number
// let x: number = 5;
// x += "hello"; // SJS-E004: string + number mix

// Accumulator pattern
function sumArray(nums: number[]): number {
  let total = 0;
  for (const n of nums) {
    total += n; // total: number
  }
  return total;
}

// String builder
function buildPath(parts: string[]): string {
  let path = "";
  for (const part of parts) {
    path += "/" + part;
  }
  return path;
}

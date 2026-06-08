// L7: Symbol, Date, globalThis, Iterator helpers

// Symbol
const sym1: symbol = Symbol("description");
const sym2: symbol = Symbol("description");
const different: boolean = sym1 === sym2; // false — unique

// Well-known symbols
const iterSym: symbol = Symbol.iterator;
const asyncIterSym: symbol = Symbol.asyncIterator;
const primSym: symbol = Symbol.toPrimitive;

// Custom iterator via Symbol.iterator
class Range {
  constructor(public start: number, public end: number) {}

  [Symbol.iterator](): Iterator<number> {
    let current = this.start;
    const end = this.end;
    return {
      next(): IteratorResult<number> {
        if (current <= end) {
          return { value: current++, done: false };
        }
        return { value: undefined as any, done: true };
      }
    };
  }
}

const range = new Range(1, 5);
for (const n of range) {
  console.log(n); // 1, 2, 3, 4, 5
}

// Date
const now: number = Date.now(); // milliseconds since epoch
const d1: Date = new Date();
const d2: Date = new Date("2024-01-01");
const d3: Date = new Date(2024, 0, 1); // Jan 1, 2024
const year: number = d1.getFullYear();
const month: number = d1.getMonth();
const iso: string = d1.toISOString();
const locale: string = d1.toLocaleDateString();
const time: number = d1.getTime();

// globalThis — available everywhere
const gt: { [key: string]: unknown } = globalThis;

// Iterator helpers (ES2025)
const numbers = Iterator.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const result: number[] = numbers
  .filter((n: number) => n % 2 === 0)
  .map((n: number) => n * n)
  .take(3)
  .toArray();
// result: [4, 16, 36]

// Iterator.from with generator
function* naturals(): Generator<number> {
  let n = 0;
  while (true) yield n++;
}
const first10: number[] = Iterator.from(naturals()).take(10).toArray();

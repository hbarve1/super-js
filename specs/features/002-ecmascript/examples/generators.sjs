// E5: Yield expression and generators

// Basic generator — Generator<yield, return, next>
function* counter(start: number = 0): Generator<number, void, unknown> {
  let n = start;
  while (true) {
    yield n++; // yield: number
  }
}

const gen = counter(1);
const a: IteratorResult<number, void> = gen.next(); // { value: 1, done: false }
const b: IteratorResult<number, void> = gen.next(); // { value: 2, done: false }

// Generator with return value
function* range(start: number, end: number): Generator<number, string, unknown> {
  for (let i = start; i <= end; i++) {
    yield i;
  }
  return "done";
}

for (const n of range(1, 5)) {
  console.log(n); // 1, 2, 3, 4, 5 — return value not included
}

// yield* — delegate to another iterable
function* concat<T>(...iters: Iterable<T>[]): Generator<T, void, unknown> {
  for (const iter of iters) {
    yield* iter; // delegates, yielding each element
  }
}

const all = [...concat([1, 2], [3, 4], [5])];
// [1, 2, 3, 4, 5]

// Two-way communication via next(value)
function* accumulator(): Generator<number, number, number> {
  let total = 0;
  while (true) {
    const val: number = yield total; // receives sent value
    total += val;
  }
}

const acc = accumulator();
acc.next();    // start: { value: 0 }
acc.next(5);   // send 5: { value: 5 }
acc.next(3);   // send 3: { value: 8 }

// Async generator
async function* streamData(urls: string[]): AsyncGenerator<string, void, unknown> {
  for (const url of urls) {
    const data = await fetch(url).then(r => r.text());
    yield data;
  }
}

async function processStream(): Promise<void> {
  for await (const chunk of streamData(["a", "b"])) {
    console.log(chunk.length); // chunk: string
  }
}

// L4: Promise<T> method signatures

// Promise.resolve / reject
const resolved: Promise<number> = Promise.resolve(42);
const rejected: Promise<never> = Promise.reject(new Error("oops"));

// .then chains — type flows through
const doubled: Promise<string> = resolved
  .then((n: number) => n * 2)    // Promise<number>
  .then((n: number) => n.toString()); // Promise<string>

// .catch narrows error
const safe: Promise<number | string> = resolved.catch((e: unknown) => "error");

// .finally — doesn't change type
const original: Promise<number> = resolved.finally(() => console.log("done"));

// Promise.all — T[] from Promise<T>[]
const all: Promise<[number, string, boolean]> = Promise.all([
  Promise.resolve(1),
  Promise.resolve("hello"),
  Promise.resolve(true),
]);

// Promise.allSettled
type Settled<T> = { status: "fulfilled"; value: T } | { status: "rejected"; reason: unknown };
const settled: Promise<PromiseSettledResult<number>[]> = Promise.allSettled([
  Promise.resolve(1),
  Promise.reject("err"),
]);

// Promise.race / any — first to settle
const race: Promise<number> = Promise.race([resolved, Promise.resolve(99)]);
const any: Promise<number> = Promise.any([rejected, resolved]);

// Promise.withResolvers (ES2024)
const { promise, resolve, reject: rej } = Promise.withResolvers<string>();
setTimeout(() => resolve("done"), 100);
const result: string = await promise;

// Promise.try (ES2025) — wraps sync/async fn in promise
const tried: Promise<number> = Promise.try(() => {
  const x = parseInt("42");
  if (isNaN(x)) throw new Error("not a number");
  return x;
});

// async/await sugar
async function fetchUser(id: number): Promise<{ name: string }> {
  const data = await Promise.resolve({ name: "Alice" });
  return data;
}

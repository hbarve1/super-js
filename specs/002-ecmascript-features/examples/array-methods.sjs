// L1: Array<T> method signatures — type inference for all methods

const nums: number[] = [3, 1, 4, 1, 5, 9, 2, 6];

// map — U[] from T[]
const doubled: number[] = nums.map(n => n * 2);
const strings: string[] = nums.map(n => n.toString());

// filter — T[] (type guard variant → U[])
const evens: number[] = nums.filter(n => n % 2 === 0);
const isString = (x: unknown): x is string => typeof x === "string";
const mixed: (string | number)[] = ["a", 1, "b", 2];
const onlyStrings: string[] = mixed.filter(isString); // U[]

// reduce
const total: number = nums.reduce((acc, n) => acc + n, 0);
const grouped: Record<string, number[]> = nums.reduce((acc, n) => {
  const key = n % 2 === 0 ? "even" : "odd";
  acc[key] = [...(acc[key] ?? []), n];
  return acc;
}, {} as Record<string, number[]>);

// find / findIndex
const first5: number | undefined = nums.find(n => n === 5);
const idx: number = nums.findIndex(n => n > 8);

// flatMap / flat
const nested: number[][] = [[1, 2], [3, 4]];
const flat: number[] = nested.flat();
const flatMapped: number[] = nums.flatMap(n => [n, n * 2]);

// ES2023 — toSorted / toReversed / with
const sorted: number[] = nums.toSorted((a, b) => a - b);
const reversed: number[] = nums.toReversed();
const replaced: number[] = nums.with(0, 99);

// at — T | undefined
const last: number | undefined = nums.at(-1);

// some / every
const hasNine: boolean = nums.some(n => n === 9);
const allPositive: boolean = nums.every(n => n > 0);

// slice / splice
const sliced: number[] = nums.slice(1, 4);

// includes / indexOf
const has5: boolean = nums.includes(5);
const pos: number = nums.indexOf(4);

// sort / reverse (mutating)
const copy = [...nums];
copy.sort((a, b) => a - b);
copy.reverse();

// join
const joined: string = nums.join(", ");

// concat
const more: number[] = nums.concat([10, 11]);

// forEach (void return)
nums.forEach((n: number) => { console.log(n); });

// length
const len: number = nums.length;

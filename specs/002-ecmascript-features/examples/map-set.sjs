// L5: Map<K,V>, Set<T>, WeakMap, WeakSet — generic inference

// Map<K,V>
const scores: Map<string, number> = new Map();
scores.set("Alice", 95);     // → Map<string, number>
scores.set("Bob", 87);
const a: number | undefined = scores.get("Alice");
const has: boolean = scores.has("Charlie");
const deleted: boolean = scores.delete("Bob");
const size: number = scores.size;

// Map iteration
for (const [key, val] of scores) {
  const k: string = key;
  const v: number = val;
}
const keys: IterableIterator<string> = scores.keys();
const vals: IterableIterator<number> = scores.values();
const entries: IterableIterator<[string, number]> = scores.entries();

// Map.groupBy (ES2024)
const words = ["one", "two", "three", "four"];
const byLen: Map<number, string[]> = Map.groupBy(words, w => w.length);

// Set<T>
const seen: Set<string> = new Set();
seen.add("hello");
seen.add("world");
const hasSeen: boolean = seen.has("hello");
const setSize: number = seen.size;
for (const item of seen) {
  const s: string = item;
}

// Set ES2025 methods
const a2: Set<number> = new Set([1, 2, 3, 4]);
const b2: Set<number> = new Set([3, 4, 5, 6]);
const union: Set<number> = a2.union(b2);           // {1,2,3,4,5,6}
const intersection: Set<number> = a2.intersection(b2); // {3,4}
const diff: Set<number> = a2.difference(b2);        // {1,2}

// WeakMap — keys must be objects
const cache: WeakMap<object, string> = new WeakMap();
const key = {};
cache.set(key, "cached");
const cached: string | undefined = cache.get(key);

// WeakSet
const visited: WeakSet<object> = new WeakSet();
const node = { id: 1 };
visited.add(node);
const wasVisited: boolean = visited.has(node);

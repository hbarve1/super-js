// ── HashMap<K, V> — Separate Chaining ───────────────────────────────────────
// A generic hash map backed by an array of singly-linked-list buckets.
// Supports string and number keys via a built-in hash function.

// ── Bucket node ──────────────────────────────────────────────────────────────
class Entry<K, V> {
  key: K;
  value: V;
  next: Entry<K, V> | null;

  constructor(key: K, value: V) {
    this.key = key;
    this.value = value;
    this.next = null;
  }
}

// ── HashMap<K, V> ────────────────────────────────────────────────────────────
class HashMap<K, V> {
  private buckets: Array<Entry<K, V> | null>;
  private capacity: number;
  private count: number;
  private readonly LOAD_FACTOR: number;

  constructor(initialCapacity: number) {
    this.capacity = initialCapacity > 0 ? initialCapacity : 16;
    this.count = 0;
    this.LOAD_FACTOR = 0.75;
    this.buckets = this._makeBuckets(this.capacity);
  }

  private _makeBuckets(cap: number): Array<Entry<K, V> | null> {
    const b: Array<Entry<K, V> | null> = [];
    for (let i: number = 0; i < cap; i++) {
      b.push(null);
    }
    return b;
  }

  // djb2-inspired hash for strings and numbers — O(|key|)
  private _hash(key: K): number {
    const s: string = String(key);
    let h: number = 5381;
    for (let i: number = 0; i < s.length; i++) {
      h = ((h << 5) + h) ^ s.charCodeAt(i);
      h = h & h; // keep as 32-bit int
    }
    return Math.abs(h) % this.capacity;
  }

  // Grow the table when load factor is exceeded — O(n)
  private _resize(): void {
    const newCapacity: number = this.capacity * 2;
    const newBuckets: Array<Entry<K, V> | null> = [];
    for (let i: number = 0; i < newCapacity; i++) {
      newBuckets.push(null);
    }
    const oldCapacity: number = this.capacity;
    this.capacity = newCapacity;

    // Re-hash all existing entries into new buckets
    for (let i: number = 0; i < oldCapacity; i++) {
      let entry: Entry<K, V> | null = this.buckets[i];
      while (entry !== null) {
        const idx: number = this._hash(entry.key);
        const newEntry: Entry<K, V> = new Entry(entry.key, entry.value);
        newEntry.next = newBuckets[idx];
        newBuckets[idx] = newEntry;
        entry = entry.next;
      }
    }
    this.buckets = newBuckets;
  }

  // Insert or update the value for key — O(1) amortised
  set(key: K, value: V): void {
    if (this.count / this.capacity >= this.LOAD_FACTOR) {
      this._resize();
    }
    const idx: number = this._hash(key);
    let entry: Entry<K, V> | null = this.buckets[idx];

    // Walk the chain to find an existing entry for key
    while (entry !== null) {
      if (entry.key === key) {
        entry.value = value; // update in place
        return;
      }
      entry = entry.next;
    }

    // Key not found: prepend a new entry to the chain
    const newEntry: Entry<K, V> = new Entry(key, value);
    newEntry.next = this.buckets[idx];
    this.buckets[idx] = newEntry;
    this.count++;
  }

  // Retrieve the value for key, or null if absent — O(1) average
  get(key: K): V | null {
    const idx: number = this._hash(key);
    let entry: Entry<K, V> | null = this.buckets[idx];
    while (entry !== null) {
      if (entry.key === key) return entry.value;
      entry = entry.next;
    }
    return null;
  }

  // Return true if key exists — O(1) average
  has(key: K): boolean {
    return this.get(key) !== null;
  }

  // Remove a key-value pair — O(1) average
  delete(key: K): boolean {
    const idx: number = this._hash(key);
    let entry: Entry<K, V> | null = this.buckets[idx];
    let prev: Entry<K, V> | null = null;

    while (entry !== null) {
      if (entry.key === key) {
        if (prev === null) {
          this.buckets[idx] = entry.next;
        } else {
          prev.next = entry.next;
        }
        this.count--;
        return true;
      }
      prev = entry;
      entry = entry.next;
    }
    return false;
  }

  // All keys in the map — O(n)
  keys(): K[] {
    const result: K[] = [];
    for (let i: number = 0; i < this.capacity; i++) {
      let entry: Entry<K, V> | null = this.buckets[i];
      while (entry !== null) {
        result.push(entry.key);
        entry = entry.next;
      }
    }
    return result;
  }

  // All values in the map — O(n)
  values(): V[] {
    const result: V[] = [];
    for (let i: number = 0; i < this.capacity; i++) {
      let entry: Entry<K, V> | null = this.buckets[i];
      while (entry !== null) {
        result.push(entry.value);
        entry = entry.next;
      }
    }
    return result;
  }

  // All [key, value] pairs in the map — O(n)
  entries(): Array<[K, V]> {
    const result: Array<[K, V]> = [];
    for (let i: number = 0; i < this.capacity; i++) {
      let entry: Entry<K, V> | null = this.buckets[i];
      while (entry !== null) {
        result.push([entry.key, entry.value]);
        entry = entry.next;
      }
    }
    return result;
  }

  // Number of key-value pairs currently stored — O(1)
  size(): number {
    return this.count;
  }
}

// ── Demo ─────────────────────────────────────────────────────────────────────

console.log("=== HashMap Demo ===\n");

// --- Basic operations ---
console.log("-- Basic Operations --");
const map: HashMap<string, number> = new HashMap(8);

map.set("alice", 30);
map.set("bob",   25);
map.set("carol", 27);
map.set("dave",  35);

console.log("size:", map.size());              // 4
console.log("get('alice'):", map.get("alice")); // 30
console.log("get('carol'):", map.get("carol")); // 27
console.log("has('bob'):",   map.has("bob"));   // true
console.log("has('eve'):",   map.has("eve"));   // false

map.set("alice", 31); // update
console.log("get('alice') after update:", map.get("alice")); // 31

map.delete("dave");
console.log("has('dave') after delete:", map.has("dave")); // false
console.log("size after delete:", map.size());             // 3

console.log("keys:  ", map.keys());
console.log("values:", map.values());

// --- Word frequency counter ---
console.log("\n-- Word Frequency Counter --");

const paragraph: string =
  "the quick brown fox jumps over the lazy dog " +
  "the fox was very quick and the dog was very lazy " +
  "a quick brown dog outpaced a lazy fox " +
  "the dog and the fox became friends in the end";

const freq: HashMap<string, number> = new HashMap(16);
const words: string[] = paragraph.split(" ");

for (const word of words) {
  const current: number | null = freq.get(word);
  freq.set(word, current === null ? 1 : current + 1);
}

console.log("Total unique words:", freq.size());

// Sort entries by frequency descending, then alphabetically
const sorted: Array<[string, number]> = freq.entries().sort(
  (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)
);

console.log("\nWord frequencies (sorted by count):");
for (const [word, count] of sorted) {
  const bar: string = "#".repeat(count);
  console.log(`  ${word.padEnd(12)} ${String(count).padStart(2)}  ${bar}`);
}

// --- Number keys ---
console.log("\n-- Number Keys: Fibonacci Memo --");

const memo: HashMap<number, number> = new HashMap(32);

function fib(n: number): number {
  if (n <= 1) return n;
  const cached = memo.get(n);
  if (cached !== null) return cached as number;
  const result: number = fib(n - 1) + fib(n - 2);
  memo.set(n, result);
  return result;
}

for (let i: number = 0; i <= 15; i++) {
  process.stdout.write(`fib(${i})=${fib(i)} `);
}
console.log();
console.log("Cache size after computing fib(0..15):", memo.size());

// --- Resize stress test ---
console.log("\n-- Resize Stress Test (100 entries) --");
const big: HashMap<string, number> = new HashMap(4); // small initial capacity
for (let i: number = 0; i < 100; i++) {
  big.set("key" + i, i * i);
}
console.log("size:", big.size());       // 100
console.log("get('key42'):", big.get("key42")); // 1764
big.delete("key42");
console.log("has('key42') after delete:", big.has("key42")); // false
console.log("size after delete:", big.size()); // 99

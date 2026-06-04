// T2: Index signatures and Record<K,V> types

// Object with index signature — any string key → number
type StringToNumber = { [key: string]: number };
const scores: StringToNumber = {};
scores["Alice"] = 95;
scores["Bob"] = 87;
const score: number = scores["Alice"];

// Record<K,V> shorthand (equivalent)
const counts: Record<string, number> = {};
counts["hello"] = 3;
const c: number = counts["hello"];

// Mixed: known keys + index signature
type Config = {
  timeout: number;
  [key: string]: unknown; // catch-all for unknown keys
};
const cfg: Config = { timeout: 5000, debug: true, version: "1.0" };
const t: number = cfg.timeout;
const d: unknown = cfg.debug;

// Number index signature
type Arr = { [index: number]: string };
const a: Arr = { 0: "zero", 1: "one" };
const zero: string = a[0];

// Record with union key type
type Status = "pending" | "active" | "closed";
type StatusMap = Record<Status, number>;
const statusCounts: StatusMap = { pending: 5, active: 12, closed: 3 };

// Dynamic key access via index signature
function get<T>(obj: { [key: string]: T }, key: string): T {
  return obj[key];
}
const val: number = get(scores, "Alice");

// Partial Record
const optional: Partial<Record<string, number>> = {};
optional["x"] = 1;
const maybe: number | undefined = optional["x"];

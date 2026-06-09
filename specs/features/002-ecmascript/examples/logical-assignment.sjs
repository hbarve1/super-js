// E2: Logical assignment operators — &&=, ||=, ??=

// &&= (and-assign) — assign only if left is truthy
let x: number | null = 5;
x &&= 10; // x is 10 (was truthy)
let y: number | null = null;
y &&= 10; // y is still null (was falsy)

// ||= (or-assign) — assign only if left is falsy
let a: string = "";
a ||= "default"; // a = "default" (was falsy empty string)
let b: string = "existing";
b ||= "default"; // b stays "existing"

// ??= (nullish-assign) — assign only if left is null or undefined
let cfg: string | null | undefined = null;
cfg ??= "default"; // cfg = "default"
let cfg2: string | null | undefined = "";
cfg2 ??= "default"; // cfg2 stays "" (not null/undefined)
let cfg3: string | null | undefined = "set";
cfg3 ??= "default"; // cfg3 stays "set"

// Practical: initialize optional fields
type Options = {
  timeout?: number;
  retries?: number;
  verbose?: boolean;
};

function withDefaults(opts: Options): Required<Options> {
  opts.timeout ??= 5000;
  opts.retries ??= 3;
  opts.verbose ??= false;
  return opts as Required<Options>;
}

// Merging configs with ||=
function mergeConfig(base: Record<string, unknown>, override: Record<string, unknown>): void {
  for (const key of Object.keys(override)) {
    base[key] ??= override[key]; // only fill missing keys
  }
}

// &&= for conditional mutation
type State = { ready: boolean; data: string | null };
const state: State = { ready: true, data: null };
state.ready && (state.data = "loaded"); // manual equivalent
// or:
// state.ready &&= someCheck(); // reassign ready conditionally

// P3: SJS Lint Rules — SJS-L002..L005

// --- SJS-L002: prefer ?. over null check + access ---

// BAD (triggers SJS-L002):
// if (user !== null) { return user.name; }

// GOOD: optional chaining
type User = { name: string; address?: { city: string } };
function getCity(user: User | null): string | undefined {
  return user?.address?.city; // preferred
}

// --- SJS-L003: prefer ?? over || for undefined fallback ---

// BAD (triggers SJS-L003):
// const name = user.name || "Anonymous"; // falsy "" matches too

// GOOD: nullish coalescing — only null/undefined trigger fallback
function displayName(user: User | null): string {
  return user?.name ?? "Anonymous"; // "" stays as "", only null/undefined → fallback
}

// Chained ?? is fine
const config = null;
const timeout: number = (config as any)?.timeout ?? 5000;

// --- SJS-L004: no `any` — use `dynamic` instead ---

// BAD (triggers SJS-L004):
// function process(data: any): any { return data; }

// GOOD: use dynamic for runtime-checked values
function processRaw(data: dynamic): string {
  return String(data);
}

// Also OK: proper types
function processTyped(data: unknown): string {
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

// --- SJS-L005: no non-null assertion ! ---

// BAD (triggers SJS-L005):
// const elem = document.getElementById("app")!;
// elem.style.display = "none";

// GOOD: explicit null check
function getElement(id: string): HTMLElement {
  const elem = document.getElementById(id);
  if (elem === null) throw new Error(`Element #${id} not found`);
  return elem; // narrowed to HTMLElement
}

// GOOD: optional chaining
function hideElement(id: string): void {
  document.getElementById(id)?.style && (document.getElementById(id)!.style.display = "none");
  // better:
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

// T5: T? null safety syntax (SJS-specific)
// T? expands to T | null | undefined

type Name = string?; // string | null | undefined

// Functions with nullable params
function greet(name: string?): string {
  if (name === null || name === undefined) {
    return "Hello, stranger!";
  }
  return `Hello, ${name}!`; // name: string here (narrowed)
}

// SJS-E001: accessing nullable without null check
function badAccess(name: string?): number {
  // return name.length; // SJS-E001: name may be null/undefined
  return name?.length ?? 0; // correct: optional chaining + nullish coalescing
}

// Non-null by default — T rejects null
function requireName(name: string): number {
  return name.length; // safe — string is non-nullable
}
// requireName(null); // SJS-E002: null not assignable to string

// Nullable class field
class User {
  name: string;
  email: string?; // may be null/undefined

  constructor(name: string, email?: string) {
    this.name = name;
    this.email = email;
  }

  getEmail(): string {
    return this.email ?? "no-email@example.com";
  }
}

// Chaining with ?. on T?
type Node = { next: Node? };
function depth(node: Node?): number {
  if (!node) return 0;
  return 1 + depth(node.next);
}

// Narrowing T? in match
type ApiResult = { data: string? };
function display(result: ApiResult): string {
  const { data } = result;
  if (data != null) {
    return data.toUpperCase(); // data: string
  }
  return "<empty>";
}

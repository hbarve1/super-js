// @superjs/std-schema — a small reified Schema<T> validator (M7, MVP).
// Predicate-based: each Schema carries a structural check; `parse` returns a
// Validated<T> (Valid payload or an Invalid message). Combinators compose checks.

export type Validated<T> = Valid(T) | Invalid(string);

export class Schema<T> {
  private check: (value: dynamic) => boolean;
  private label: string;

  constructor(check: (value: dynamic) => boolean, label: string) {
    this.check = check;
    this.label = label;
  }

  parse(value: dynamic): Validated<T> {
    return this.check(value) ? Valid(value as T) : Invalid("expected " + this.label);
  }

  refine(pred: (value: dynamic) => boolean): Schema<T> {
    const base = this.check;
    return new Schema((v: dynamic): boolean => base(v) && pred(v), this.label);
  }
}

export function string(): Schema<string> {
  return new Schema((v: dynamic): boolean => typeof v === "string", "string");
}

export function number(): Schema<number> {
  return new Schema((v: dynamic): boolean => typeof v === "number", "number");
}

export function boolean(): Schema<boolean> {
  return new Schema((v: dynamic): boolean => typeof v === "boolean", "boolean");
}

export function array<T>(item: Schema<T>): Schema<T[]> {
  return new Schema((v: dynamic): boolean => Array.isArray(v), "array");
}

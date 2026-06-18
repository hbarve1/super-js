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

  accepts(value: dynamic): boolean {
    return this.check(value);
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

export class Field {
  key: string;
  schema: Schema<dynamic>;

  constructor(key: string, schema: Schema<dynamic>) {
    this.key = key;
    this.schema = schema;
  }
}

export function field(key: string, schema: Schema<dynamic>): Field {
  return new Field(key, schema);
}

// `object([field("name", string()), ...])` — every field must accept its value.
export function object(fields: Field[]): Schema<dynamic> {
  return new Schema((v: dynamic): boolean => {
    if (typeof v !== "object" || v === null) {
      return false;
    }
    return fields.every((f: Field): boolean => f.schema.accepts(v[f.key]));
  }, "object");
}

export function literal(expected: string): Schema<string> {
  return new Schema((v: dynamic): boolean => v === expected, "literal " + expected);
}

export function optional<T>(item: Schema<T>): Schema<T?> {
  return new Schema((v: dynamic): boolean => v === undefined || item.accepts(v), "optional");
}

export function nullable<T>(item: Schema<T>): Schema<T?> {
  return new Schema((v: dynamic): boolean => v === null || item.accepts(v), "nullable");
}

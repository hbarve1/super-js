// @superjs/types-joi — hand-curated SJS bindings for Joi 17.x core surface.

export type ValidationError {
  message: string;
  path: string[];
  details: dynamic;
}

export type ValidationResult<T> {
  value: T;
  error: ValidationError?;
}

export type Schema<T> {
  validate(value: dynamic): ValidationResult<T>;
  required(): Schema<T>;
  optional(): Schema<T>;
}

export type StringSchema = Schema<string>;
export type NumberSchema = Schema<number>;
export type ObjectSchema<T> = Schema<T>;

export type Joi {
  string(): StringSchema;
  number(): NumberSchema;
  boolean(): Schema<boolean>;
  object<T>(schema: dynamic): ObjectSchema<T>;
  array<T>(items: Schema<T>): Schema<T[]>;
}

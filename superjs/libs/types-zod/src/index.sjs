// @superjs/types-zod — narrow hand-curated SJS bindings for Zod 3.x.

export type ZodIssue {
  path: string[];
  message: string;
  code: string;
}

export type ZodError {
  issues: ZodIssue[];
  message: string;
}

export type ZodSafeParseResult<T> = ZodParseOk(T) | ZodParseErr(ZodError);

export type ZodType<T> {
  parse(input: dynamic): T;
  safeParse(input: dynamic): ZodSafeParseResult<T>;
  optional(): ZodType<T?>;
  nullable(): ZodType<T?>;
}

export type ZodString = ZodType<string>;
export type ZodNumber = ZodType<number>;
export type ZodBoolean = ZodType<boolean>;

export type ZodObject<T> = ZodType<T>;

export type Zod {
  string(): ZodString;
  number(): ZodNumber;
  boolean(): ZodBoolean;
  object<T>(shape: dynamic): ZodObject<T>;
  array<T>(schema: ZodType<T>): ZodType<T[]>;
  enum<T>(values: T[]): ZodType<T>;
}

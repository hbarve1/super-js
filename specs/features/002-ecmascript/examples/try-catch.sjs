// S3: try/catch/throw type checking

// catch binding typed as unknown in strict mode
function safeParse(input: string): number | null {
  try {
    const n = Number(input);
    if (isNaN(n)) throw new Error(`Not a number: ${input}`);
    return n;
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error(e.message); // e: Error here
    }
    return null;
  }
}

// throw can throw any value
function validate(x: number): void {
  if (x < 0) throw new RangeError("Must be non-negative");
  if (x > 100) throw `Value ${x} out of range`; // string throw
}

// optional catch binding (ES2019)
function attempt(fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch {
    // no binding needed
    return false;
  }
}

// finally always runs
async function withCleanup(resource: { close(): void }): Promise<void> {
  try {
    await Promise.resolve();
  } finally {
    resource.close(); // runs regardless
  }
}

// nested try/catch
function nestedTry(): string {
  try {
    try {
      return JSON.parse("{invalid}");
    } catch (inner: unknown) {
      throw new Error("parse failed");
    }
  } catch (outer: unknown) {
    return "fallback";
  }
}

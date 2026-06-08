// L6: Error, JSON, console, RegExp

// Error constructor
const e1: Error = new Error("something went wrong");
const msg: string = e1.message;
const stack: string | undefined = e1.stack;

// Error with cause (ES2022)
const e2 = new Error("outer error", { cause: e1 });
const cause: unknown = e2.cause;

// Error.isError (ES2025)
const isErr: boolean = Error.isError(e1);       // true
const notErr: boolean = Error.isError("string"); // false

// Custom error subclasses
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: number
  ) {
    super(message);
    this.name = "AppError";
  }
}
const appErr = new AppError("not found", 404);
const code: number = appErr.code;

// JSON
const jsonStr: string = JSON.stringify({ x: 1, y: [2, 3] });
const parsed: any = JSON.parse(jsonStr);
const pretty: string = JSON.stringify({ a: 1 }, null, 2);

// JSON with replacer
const filtered: string = JSON.stringify({ a: 1, b: 2 }, ["a"]);

// console — all return void
console.log("hello", 42, true);
console.error("error:", new Error("oops"));
console.warn("warning");
console.info("info");
console.table([{ a: 1 }, { a: 2 }]);
console.time("label");
console.timeEnd("label");
console.group("group");
console.groupEnd();
console.dir({ x: 1 });

// RegExp
const re: RegExp = new RegExp("\\d+", "g");
const re2: RegExp = /\d+/g;
const testResult: boolean = re.test("abc123");
const execResult: RegExpExecArray | null = re.exec("abc123");

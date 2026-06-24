// @superjs/types-jest — hand-curated SJS bindings for Jest 29.x test globals.

export type TestFn = () => void | Promise<void>;

export type TestOptions {
  timeout: number;
  skip: boolean;
  only: boolean;
}

export type SuiteFn = (name: string, fn: TestFn) => void;

export type TestCaseFn = (name: string, fn: TestFn) => void;

export type ExpectFn = (value: dynamic) => dynamic;

export type MockInstance {
  mock: dynamic;
  mockClear(): void;
  mockReset(): void;
  mockRestore(): void;
}

export type JestStatic {
  fn(impl: dynamic): MockInstance;
  spyOn(obj: dynamic, method: string): MockInstance;
  mock(moduleName: string, factory: dynamic): void;
  clearAllMocks(): void;
  resetAllMocks(): void;
}

export type JestGlobals {
  describe: SuiteFn;
  it: TestCaseFn;
  test: TestCaseFn;
  expect: ExpectFn;
  jest: JestStatic;
  beforeEach: (fn: TestFn) => void;
  afterEach: (fn: TestFn) => void;
  beforeAll: (fn: TestFn) => void;
  afterAll: (fn: TestFn) => void;
}

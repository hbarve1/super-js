// @superjs/types-vitest — hand-curated SJS bindings for Vitest 1.x test globals.

export type TestFn = () => void | Promise<void>;

export type TestOptions {
  timeout: number;
  skip: boolean;
  only: boolean;
}

export type SuiteCollector = (name: string, fn: TestFn) => void;

export type TestCollector = (name: string, fn: TestFn) => void;

export type ExpectFn = (value: dynamic) => dynamic;

export type TestContext {
  task: dynamic;
  expect: ExpectFn;
}

export type MockFn {
  mock: dynamic;
  mockClear(): void;
  mockReset(): void;
}

export type ViStatic {
  fn(impl: dynamic): MockFn;
  spyOn(obj: dynamic, method: string): dynamic;
  mock(path: string, factory: dynamic): void;
  clearAllMocks(): void;
}

export type VitestGlobals {
  describe: SuiteCollector;
  it: TestCollector;
  test: TestCollector;
  expect: ExpectFn;
  vi: ViStatic;
  beforeEach: (fn: TestFn) => void;
  afterEach: (fn: TestFn) => void;
}

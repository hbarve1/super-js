// @superjs/types-supertest — hand-curated SJS bindings for SuperTest 6.x core surface.

export type TestCallback = (err: dynamic, res: Response) => void;

export type Response {
  status: number;
  statusCode: number;
  headers: dynamic;
  body: dynamic;
  text: string;
  type: string;
  header: dynamic;
}

export type Test {
  get(path: string): Test;
  post(path: string): Test;
  put(path: string): Test;
  patch(path: string): Test;
  del(path: string): Test;
  send(data: dynamic): Test;
  set(field: string, value: string): Test;
  query(params: dynamic): Test;
  expect(status: number): Test;
  expect(body: dynamic): Test;
  end(fn: TestCallback): void;
  then(resolve: dynamic, reject: dynamic): Promise<Response>;
}

export type SuperTestStatic {
  agent(app: dynamic): Test;
}

export type SuperTestFactory = (app: dynamic) => Test;

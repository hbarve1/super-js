// @superjs/types-koa — hand-curated SJS bindings for Koa 2.x core surface.

export type Middleware = (ctx: Context, next: () => Promise<void>) => Promise<void> | void;

export type Context {
  request: Request;
  response: Response;
  params: dynamic;
  query: dynamic;
  body: dynamic;
  status: number;
  state: dynamic;
  failWith(status: number, message: string): never;
}

export type Request {
  method: string;
  url: string;
  headers: dynamic;
  body: dynamic;
}

export type Response {
  status: number;
  body: dynamic;
  set(field: string, value: string): void;
}

export type Application {
  use(middleware: Middleware): Application;
  listen(port: number, callback: () => void): dynamic;
  callback(): (req: dynamic, res: dynamic) => Promise<void>;
}

export type KoaFactory = () => Application;

// @superjs/types-hono — hand-curated SJS bindings for Hono 4.x core surface.

export type Handler = (c: Context) => Promise<dynamic> | dynamic;

export type Context {
  req: Request;
  json(data: dynamic, status: number): Response;
  text(body: string, status: number): Response;
  body(data: dynamic, status: number): Response;
  param(name: string): string;
  query(name: string): string | undefined;
  header(name: string): string | undefined;
  set(name: string, value: string): void;
  get(name: string): dynamic;
}

export type Hono {
  get(path: string, handler: Handler): Hono;
  post(path: string, handler: Handler): Hono;
  put(path: string, handler: Handler): Hono;
  del(path: string, handler: Handler): Hono;
  patch(path: string, handler: Handler): Hono;
  use(path: string, handler: Handler): Hono;
  route(path: string, app: Hono): Hono;
  fetch(request: Request): Promise<Response>;
}

export type HonoFactory = () => Hono;

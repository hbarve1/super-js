// @superjs/types-express — hand-curated SJS bindings for Express 4.x core surface.

export type NextFunction = (err: dynamic) => void;

export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;

export type Request {
  params: dynamic;
  query: dynamic;
  body: dynamic;
  headers: dynamic;
  method: string;
  url: string;
  path: string;
  ip: string;
  get(name: string): string | undefined;
}

export type Response {
  status(code: number): Response;
  send(body: dynamic): dynamic;
  json(body: dynamic): dynamic;
  set(field: string, value: string): Response;
  end(body: dynamic): void;
  redirect(url: string): void;
}

export type Application {
  use(handler: RequestHandler): Application;
  get(path: string, handler: RequestHandler): Application;
  post(path: string, handler: RequestHandler): Application;
  put(path: string, handler: RequestHandler): Application;
  del(path: string, handler: RequestHandler): Application;
  patch(path: string, handler: RequestHandler): Application;
  listen(port: number, callback: () => void): dynamic;
}

export type Router {
  get(path: string, handler: RequestHandler): Router;
  post(path: string, handler: RequestHandler): Router;
  use(handler: RequestHandler): Router;
}

export type ExpressFactory = () => Application;

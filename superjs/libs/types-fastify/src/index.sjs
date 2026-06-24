// @superjs/types-fastify — hand-curated SJS bindings for Fastify 4.x core surface.

export type HTTPMethods = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

export type RouteHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<dynamic> | dynamic;

export type FastifyReply {
  code(statusCode: number): FastifyReply;
  status(statusCode: number): FastifyReply;
  send(payload: dynamic): dynamic;
  header(name: string, value: string): FastifyReply;
  headers(values: dynamic): FastifyReply;
  redirect(url: string): dynamic;
}

export type FastifyRequest {
  params: dynamic;
  query: dynamic;
  body: dynamic;
  headers: dynamic;
  method: string;
  url: string;
  ip: string;
  hostname: string;
}

export type ListenOptions {
  port: number;
  host: string;
}

export type FastifyServerOptions {
  logger: boolean | dynamic;
}

export type FastifyInstance {
  get(path: string, handler: RouteHandler): void;
  post(path: string, handler: RouteHandler): void;
  put(path: string, handler: RouteHandler): void;
  del(path: string, handler: RouteHandler): void;
  patch(path: string, handler: RouteHandler): void;
  head(path: string, handler: RouteHandler): void;
  optsRoute(path: string, handler: RouteHandler): void;
  listen(listenOpts: ListenOptions): Promise<string>;
  register(plugin: dynamic, opts: dynamic): Promise<void>;
  addHook(name: string, handler: dynamic): void;
  decorate(name: string, value: dynamic): void;
  close(): Promise<void>;
}

export type FastifyFactory = (opts: FastifyServerOptions) => FastifyInstance;

// @superjs/types-cloudflare-workers — hand-curated SJS bindings for Workers 4.x.

export type CfProperties = dynamic;

export type CfRequest extends Request {
  cf: CfProperties;
}

export type ExecutionContext {
  waitUntil(promise: Promise<dynamic>): void;
  passThroughOnException(): void;
}

export type ExportedHandler<E> {
  fetch(request: Request, env: E, ctx: ExecutionContext): Promise<Response> | Response;
  scheduled(event: ScheduledEvent, env: E, ctx: ExecutionContext): Promise<void> | void;
}

export type ScheduledEvent {
  scheduledTime: number;
  cron: string;
}

export type KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts: dynamic): Promise<void>;
  del(key: string): Promise<void>;
  list(opts: dynamic): Promise<dynamic>;
}

export type R2Bucket {
  get(key: string): Promise<dynamic>;
  put(key: string, value: dynamic, opts: dynamic): Promise<dynamic>;
  head(key: string): Promise<dynamic>;
  del(keys: string | string[]): Promise<void>;
}

export type Fetcher {
  fetch(input: Request | string, init: dynamic): Promise<Response>;
}

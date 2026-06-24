// @superjs/types-undici — hand-curated SJS bindings for undici 6.x core surface.

export type UndiciHeaders = dynamic;

export type UndiciRequestOptions {
  method: string;
  headers: UndiciHeaders;
  body: dynamic;
}

export type UndiciResponseData {
  statusCode: number;
  headers: UndiciHeaders;
  body: dynamic;
}

export type Dispatcher {
  request(opts: UndiciRequestOptions): Promise<UndiciResponseData>;
  close(): Promise<void>;
  destroy(): void;
}

export type AgentOptions {
  connections: number;
  pipelining: number;
}

export type Agent {
  request(opts: UndiciRequestOptions): Promise<UndiciResponseData>;
  close(): Promise<void>;
}

export type UndiciFetchFn = (input: string, init: UndiciRequestOptions) => Promise<dynamic>;

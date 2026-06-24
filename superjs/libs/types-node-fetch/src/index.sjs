// @superjs/types-node-fetch — hand-curated SJS bindings for node-fetch 3.x.

export type Headers {
  get(name: string): string | null;
  set(name: string, value: string): void;
  has(name: string): boolean;
  append(name: string, value: string): void;
}

export type RequestInit {
  method: string;
  headers: Headers | dynamic;
  body: dynamic;
  redirect: string;
}

export type Request {
  url: string;
  method: string;
  headers: Headers;
}

export type Response {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  json(): Promise<dynamic>;
  text(): Promise<string>;
  arrayBuffer(): Promise<dynamic>;
}

export type FetchFn = (input: string | Request, init: RequestInit) => Promise<Response>;
